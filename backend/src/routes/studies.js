import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ─────────────────────────────────────────────
// CONFIG STORAGE
// ─────────────────────────────────────────────
const AGFA_HEADER_SIZE = 4096;

const UPLOAD_DIR = path.resolve("uploads/radiografias");
const TMP_DIR = path.resolve("uploads/tmp");

[UPLOAD_DIR, TMP_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `tmp_${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Middleware para múltiples archivos
const uploadMultiple = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }, // Máximo 10 archivos
});

// ─────────────────────────────────────────────
// PARSER AGFA
// ─────────────────────────────────────────────
function parseAgfaHeader(buffer) {
  const headerText = buffer
    .slice(0, AGFA_HEADER_SIZE)
    .toString("latin1")
    .replace(/\0/g, "");

  const get = (key) => {
    const m = headerText.match(new RegExp(`${key}=(\\d+)`));
    return m ? parseInt(m[1]) : null;
  };

  return {
    width: get("__Columns"),
    height: get("__Rows"),
    bitsStored: get("__BitsStored") ?? 15,
  };
}

// ─────────────────────────────────────────────
// CONVERSIÓN AGFA → WEBP (buffer version)
// ─────────────────────────────────────────────
function convertAgfaToWebP(buffer) {
  // Parsear el header del archivo Agfa raw para extraer ancho, alto y los píxeles
  const meta = parseAgfaHeader(buffer);
  if (!meta.width || !meta.height) {
    throw new Error("Header Agfa inválido");
  }

  const { width, height, bitsStored } = meta;
  const pixelData = new Uint16Array(
    buffer.buffer,
    buffer.byteOffset + AGFA_HEADER_SIZE,
    width * height,
  );

  const maxVal = (1 << bitsStored) - 1;

  // Aplicar windowing óptimo automático (calcula min/max de los valores de pixel y normaliza al rango 0–255)
  let min = Infinity,
    max = -Infinity;

  for (let i = 0; i < pixelData.length; i++) {
    const v = pixelData[i] & maxVal;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min || 1;

  // Convertir los píxeles normalizados a un buffer RGB plano
  const rgbBuffer = Buffer.alloc(width * height * 3);

  for (let i = 0; i < pixelData.length; i++) {
    let gray = Math.round(((pixelData[i] - min) / range) * 255);
    gray = 255 - Math.max(0, Math.min(255, gray));

    const idx = i * 3;
    rgbBuffer[idx] = gray;
    rgbBuffer[idx + 1] = gray;
    rgbBuffer[idx + 2] = gray;
  }

  // Usar sharp para convertir ese buffer RGB a formato WebP y retornar el resultado como Buffer
  return sharp(rgbBuffer, {
    raw: { width, height, channels: 3 },
  })
    .webp({ quality: 85 })
    .toBuffer();
}

// ─────────────────────────────────────────────
// GET STUDIES (CON TUS FILTROS)
// ─────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      dateFrom = "",
      dateTo = "",
      patientId = "",
      onlyWithoutReports = false,
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    if (patientId) {
      if (req.user.role === "PATIENT") {
        where.patientId = patientId;
      } else {
        where.patient = {
          OR: [
            { name: { contains: patientId, mode: "insensitive" } },
            { dni: { contains: patientId, mode: "insensitive" } },
          ],
        };
      }
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { type: { contains: search, mode: "insensitive" } },
        { patient: { name: { contains: search, mode: "insensitive" } } },
        { patient: { dni: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (onlyWithoutReports === "true") {
      where.reports = { none: {} };
    }

    if (req.user.role === "PATIENT") {
      where.patientId = req.user.id;
    } else if (req.user.role === "DOCTOR") {
      where.doctorId = req.user.id;
    }

    const [studies, total] = await Promise.all([
      prisma.study.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          reports: true,
        },
        orderBy: { date: "desc" },
        skip: Number(skip),
        take: Number(limit),
      }),
      prisma.study.count({ where }),
    ]);

    res.json({
      studies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener estudios" });
  }
});

// ─────────────────────────────────────────────
// CREATE STUDY
// ─────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  uploadMultiple.array("images"), // Cambiado a array con nombre "images"
  async (req, res) => {
    try {
      const { patientId, type, notes, date } = req.body;

      if (!patientId || !type) {
        return res.status(400).json({
          error: "patientId y type son requeridos",
        });
      }

      // 🔥 VALIDACIÓN CLAVE (te evita el 90% de errores)
      const patient = await prisma.user.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return res.status(400).json({
          error: "Paciente no existe",
        });
      }

      const study = await prisma.study.create({
        data: {
          patientId,
          doctorId: req.user.id,
          type,
          notes,
          date: date ? new Date(date) : new Date(),
        },
      });

      console.log("✅ STUDY CREATED:", study.id);

      // Si hay archivos, procesarlos inmediatamente
      if (req.files && req.files.length > 0) {
        console.log(`📸 Processing ${req.files.length} uploaded files...`);

        const processedImages = [];

        for (const file of req.files) {
          try {
            let webpBuffer;

            // Verificar si el archivo ya es WebP
            if (file.originalname.toLowerCase().endsWith(".webp")) {
              webpBuffer = fs.readFileSync(file.path);
            } else {
              webpBuffer = await convertAgfaToWebP(fs.readFileSync(file.path));
            }

            // Guardar el WebP resultante
            const outputFilename = `${study.id}_${file.originalname}_${Date.now()}.webp`;
            const outputPath = path.join(UPLOAD_DIR, outputFilename);
            fs.writeFileSync(outputPath, webpBuffer);

            processedImages.push({
              originalName: file.originalname,
              webpPath: path
                .relative(process.cwd(), outputPath)
                .replace(/\\/g, "/"),
            });

            // Limpiar archivo temporal
            fs.unlinkSync(file.path);
          } catch (imageError) {
            console.error(
              `❌ ERROR PROCESSING IMAGE ${file.originalname}:`,
              imageError,
            );
            // Limpiar archivo temporal si hay error
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

        // Actualizar el estudio con la primera imagen (principal)
        if (processedImages.length > 0) {
          const updated = await prisma.study.update({
            where: { id: study.id },
            data: {
              imageUrl: processedImages[0].webpPath, // Usar la primera como principal
            },
          });
          res.status(201).json(updated);
        } else {
          res.status(201).json(study);
        }
      } else {
        res.status(201).json(study);
      }
    } catch (error) {
      console.error("❌ ERROR CREATE STUDY:", error);

      res.status(500).json({
        error: error.message, // 🔥 IMPORTANTE
      });
    }
  },
);

// ─────────────────────────────────────────────
// UPDATE STUDY
// ─────────────────────────────────────────────
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  uploadMultiple.array("images"), // Cambiado a array
  async (req, res) => {
    try {
      const { type, notes, date } = req.body;
      const studyId = req.params.id;

      // Verificar que el estudio existe
      const existingStudy = await prisma.study.findUnique({
        where: { id: studyId },
      });

      if (!existingStudy) {
        return res.status(404).json({ error: "Estudio no encontrado" });
      }

      // Verificar permisos (ADMIN puede actualizar cualquier estudio, DOCTOR solo los suyos)
      if (
        req.user.role === "DOCTOR" &&
        existingStudy.doctorId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ error: "No puedes actualizar este estudio" });
      }

      // Actualizar datos del estudio
      const updatedStudy = await prisma.study.update({
        where: { id: studyId },
        data: {
          type: type || existingStudy.type,
          notes: notes !== undefined ? notes : existingStudy.notes,
          date: date ? new Date(date) : existingStudy.date,
        },
      });

      // Si hay archivos, procesarlos y actualizar la imagen
      if (req.files && req.files.length > 0) {
        console.log(`📸 Processing ${req.files.length} files for update...`);

        const processedImages = [];

        for (const file of req.files) {
          try {
            let webpBuffer;

            // Verificar si el archivo ya es WebP
            if (file.originalname.toLowerCase().endsWith(".webp")) {
              webpBuffer = fs.readFileSync(file.path);
            } else {
              webpBuffer = await convertAgfaToWebP(fs.readFileSync(file.path));
            }

            // Guardar el WebP resultante
            const outputFilename = `${studyId}_${file.originalname}_${Date.now()}.webp`;
            const outputPath = path.join(UPLOAD_DIR, outputFilename);
            fs.writeFileSync(outputPath, webpBuffer);

            processedImages.push({
              originalName: file.originalname,
              webpPath: path
                .relative(process.cwd(), outputPath)
                .replace(/\\/g, "/"),
            });

            // Limpiar archivo temporal
            fs.unlinkSync(file.path);
          } catch (imageError) {
            console.error(
              `❌ ERROR PROCESSING IMAGE ${file.originalname}:`,
              imageError,
            );
          }
        }

        // Actualizar el estudio con la primera imagen (principal)
        if (processedImages.length > 0) {
          const finalStudy = await prisma.study.update({
            where: { id: studyId },
            data: {
              imageUrl: processedImages[0].webpPath, // Usar la primera como principal
            },
          });
          res.status(200).json(finalStudy);
        } else {
          res.status(200).json(updatedStudy);
        }
      } else {
        res.status(200).json(updatedStudy);
      }
    } catch (error) {
      console.error("❌ ERROR UPDATE STUDY:", error);
      res.status(500).json({
        error: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────
// SUBIR IMAGEN (AGFA)
// ─────────────────────────────────────────────
router.post(
  "/:id/dicom",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  upload.single("file"),
  async (req, res) => {
    let tmpPath = req.file?.path;

    try {
      const study = await prisma.study.findUnique({
        where: { id: req.params.id },
      });

      if (!study) return res.status(404).json({ error: "No encontrado" });
      if (!req.file) return res.status(400).json({ error: "Sin archivo" });

      const webpBuffer = await convertAgfaToWebP(fs.readFileSync(tmpPath));

      // Guardar el WebP resultante
      const outputFilename = `${study.id}_${Date.now()}.webp`;
      const outputPath = path.join(UPLOAD_DIR, outputFilename);
      fs.writeFileSync(outputPath, webpBuffer);

      const updated = await prisma.study.update({
        where: { id: study.id },
        data: {
          imageUrl: path
            .relative(process.cwd(), outputPath)
            .replace(/\\/g, "/"),
        },
      });

      res.json(updated);
    } catch (err) {
      if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      res.status(500).json({ error: err.message });
    }
  },
);

// ─────────────────────────────────────────────
// GET ALL IMAGES FOR STUDY
// ─────────────────────────────────────────────
router.get("/:id/images", authMiddleware, async (req, res) => {
  try {
    const study = await prisma.study.findUnique({
      where: { id: req.params.id },
    });

    if (!study) {
      return res.status(404).json({ error: "Estudio no encontrado" });
    }

    if (req.user.role === "PATIENT" && study.patientId !== req.user.id) {
      return res.status(403).json({ error: "Sin acceso" });
    }

    // Buscar todas las imágenes del estudio en el directorio
    const studyId = study.id;

    // Buscar en el directorio de uploads/radiografias
    const uploadDir = path.resolve("./uploads/radiografias");

    let allImages = [];

    try {
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        allImages = files
          .filter((file) => file.includes(studyId) && file.endsWith(".webp"))
          .map((file) => ({
            filename: file,
            path: path.join(uploadDir, file),
            url: `/uploads/radiografias/${file}`,
            originalName: file
              .replace(`${studyId}_`, "")
              .replace(/_\d+\.webp$/, ""),
          }))
          .sort((a, b) => a.filename.localeCompare(b.filename));
      }
    } catch (error) {
      console.error("Error reading upload directory:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener imágenes del estudio" });
    }

    // Si hay una imagen principal, asegurar que esté primero
    if (study.imageUrl) {
      const mainImagePath = path.resolve(study.imageUrl);
      const mainImageFilename = path.basename(study.imageUrl);
      const mainImageIndex = allImages.findIndex(
        (img) => img.filename === mainImageFilename,
      );

      if (mainImageIndex > 0) {
        const mainImage = allImages.splice(mainImageIndex, 1)[0];
        allImages.unshift(mainImage);
      }
    }

    res.json({
      studyId: study.id,
      images: allImages,
      total: allImages.length,
    });
  } catch (error) {
    console.error("Error getting study images:", error);
    res.status(500).json({ error: "Error al obtener imágenes del estudio" });
  }
});

// ─────────────────────────────────────────────
// SERVIR IMAGEN (WebP direct)
// ─────────────────────────────────────────────
router.get("/:id/dicom", authMiddleware, async (req, res) => {
  try {
    const study = await prisma.study.findUnique({
      where: { id: req.params.id },
    });

    if (!study || !study.imageUrl) {
      return res.status(404).json({ error: "Sin imagen" });
    }

    if (req.user.role === "PATIENT" && study.patientId !== req.user.id) {
      return res.status(403).json({ error: "Sin acceso" });
    }

    // Servir directamente el archivo WebP guardado
    const filePath = path.resolve(study.imageUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Archivo de imagen no encontrado" });
    }

    // Enviar el archivo WebP directamente
    res.setHeader("Content-Type", "image/webp");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("❌ Error al enviar archivo:", err);
      }
    });
  } catch (error) {
    console.error("Error al servir imagen:", error);
    res.status(500).json({ error: "Error al servir imagen" });
  }
});

export default router;
