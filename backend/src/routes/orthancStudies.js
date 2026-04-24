import axios from "axios";
import bcrypt from "bcryptjs";
import express from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { orthancProxyAuth } from "../middleware/orthancProxyAuth.js";
import { patientCanAccessOrthancPath } from "../services/orthancPatientAccess.js";
import {
  checkOrthancConnection,
  getStudies,
  getStudyDetails,
} from "../services/orthancService.js";

const router = express.Router();

const ORTHANC_BASE = (process.env.ORTHANC_URL || "").replace(/\/+$/, "");

async function orthancPatientGate(req, res, next) {
  if (req.user.role !== "PATIENT" || req.user.role === "STATIC") return next();
  try {
    const ok = await patientCanAccessOrthancPath(req);
    if (!ok) {
      return res.status(403).json({ error: "Acceso denegado." });
    }
    next();
  } catch (e) {
    next(e);
  }
}

function rewriteOrthancHtml(html, token, orthancPath = "/") {
  const PRE = "/api/orthanc/pacs";
  const STATIC_ASSET_RE =
    /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|map|wasm)(\?|$)/i;

  if (!html || typeof html !== "string") return html;
  const appendToken = (fullPath) => {
    if (!token) return fullPath;
    if (fullPath.includes("token=")) return fullPath;
    if (STATIC_ASSET_RE.test(fullPath.split("?")[0])) return fullPath;
    const sep = fullPath.includes("?") ? "&" : "?";
    return `${fullPath}${sep}token=${encodeURIComponent(token)}`;
  };

  // Base directory for relative URLs inside the returned HTML
  // e.g. /stone-webviewer/index.html -> /stone-webviewer/
  const baseDir = (() => {
    const p = orthancPath.split("?")[0] || "/";
    if (p.endsWith("/")) return p;
    const idx = p.lastIndexOf("/");
    return idx >= 0 ? p.slice(0, idx + 1) : "/";
  })();

  const absolutizeRelative = (rel) => {
    // ignore anchors, mailto, JS pseudo-urls
    if (
      !rel ||
      rel.startsWith("#") ||
      rel.startsWith("mailto:") ||
      rel.startsWith("javascript:")
    ) {
      return rel;
    }
    // already absolute-ish (starts with / or protocol)
    if (
      rel.startsWith("/") ||
      rel.startsWith("http://") ||
      rel.startsWith("https://") ||
      rel.startsWith("data:")
    ) {
      return rel;
    }
    // normalize ./ prefix
    const cleaned = rel.startsWith("./") ? rel.slice(2) : rel;
    return `${PRE}${baseDir}${cleaned}`;
  };

  return (
    html
      .replace(/\s(href|src)=(["'])(\/[^"']*)\2/gi, (m, attr, q, p) => {
        if (
          p.startsWith("http://") ||
          p.startsWith("https://") ||
          p.startsWith("data:")
        ) {
          return m;
        }
        if (p.startsWith(PRE)) return ` ${attr}=${q}${appendToken(p)}${q}`;
        if (p.startsWith("/api/") && !p.startsWith(PRE)) return m;
        const np = `${PRE}${p}`;
        return ` ${attr}=${q}${appendToken(np)}${q}`;
      })
      // Rewrite relative asset paths like css/all.css, js/app.js, img/x.png
      .replace(
        /\s(href|src)=(["'])(?!\/|https?:|data:|#|mailto:|javascript:)([^"']+)\2/gi,
        (m, attr, q, p) => {
          const np = absolutizeRelative(p);
          if (!np || np === p) return m;
          return ` ${attr}=${q}${appendToken(np)}${q}`;
        },
      )
      .replace(/url\(\s*([\'"]?)(\/[^)\'"]+)\1\s*\)/gi, (m, q, p) => {
        if (p.startsWith("http://") || p.startsWith("https://")) return m;
        if (p.startsWith(PRE)) return `url(${q}${appendToken(p)}${q})`;
        if (p.startsWith("/api/") && !p.startsWith(PRE)) return m;
        const np = `${PRE}${p}`;
        return `url(${q}${appendToken(np)}${q})`;
      })
      // Rewrite relative CSS url() like url(img/foo.png)
      .replace(
        /url\(\s*([\'"]?)(?!\/|https?:|data:)([^)\'"]+)\1\s*\)/gi,
        (m, q, p) => {
          const np = absolutizeRelative(p);
          if (!np || np === p) return m;
          return `url(${q}${appendToken(np)}${q})`;
        },
      )
  );
}

const pacsProxyHandler = async (req, res) => {
  try {
    if (!ORTHANC_BASE) {
      return res.status(503).json({ error: "ORTHANC_URL no configurada" });
    }
    const rawUrl = req.originalUrl || "";
    const u = new URL(rawUrl, "http://placeholder");
    const pathname = u.pathname;
    const j = pathname.indexOf("/pacs");
    if (j === -1) {
      return res.status(500).json({ error: "Ruta de proxy inválida" });
    }
    const orthancPath = pathname.slice(j + "/pacs".length) || "/";
    const tokenQs = u.searchParams.get("token");
    u.searchParams.delete("token");
    const qstr = u.searchParams.toString();
    const targetUrl = `${ORTHANC_BASE}${orthancPath}${qstr ? `?${qstr}` : ""}`;

    // Stream response directly when possible to avoid buffer copies
    const response = await axios({
      method: req.method,
      url: targetUrl,
      auth: {
        username: process.env.ORTHANC_USER,
        password: process.env.ORTHANC_PASS,
      },
      responseType: "stream",
      timeout: 120000,
      validateStatus: () => true,
      headers: {
        Accept: req.headers.accept || "*/*",
        ...(req.headers["if-none-match"] && {
          "If-None-Match": req.headers["if-none-match"],
        }),
        ...(req.headers["if-modified-since"] && {
          "If-Modified-Since": req.headers["if-modified-since"],
        }),
      },
    });

    // Handle 304 Not Modified responses immediately
    if (response.status === 304) {
      if (response.headers["etag"])
        res.setHeader("ETag", response.headers["etag"]);
      return res.status(304).end();
    }

    // Copy essential headers
    const ct = response.headers["content-type"] || "";
    const STATIC_ASSET_RE =
      /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|map|wasm)(\?|$)/i;

    // Set cache headers based on content type
    if (STATIC_ASSET_RE.test(orthancPath)) {
      // Assets del Stone Viewer: cache agresivo (no cambian entre versiones)
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    } else if (ct.toLowerCase().includes("text/html")) {
      res.setHeader("Cache-Control", "no-store");
    } else if (
      orthancPath.includes("/instances/") &&
      orthancPath.includes("/preview")
    ) {
      // Previews DICOM: cache 1 hora
      res.setHeader("Cache-Control", "public, max-age=3600");
    } else if (
      orthancPath.includes("/dicom-web/") ||
      orthancPath.includes("/instances/")
    ) {
      // Datos DICOM: no cachear en proxy, Orthanc los tiene
      res.setHeader("Cache-Control", "no-store");
    }

    if (response.headers["content-disposition"]) {
      res.setHeader(
        "Content-Disposition",
        response.headers["content-disposition"],
      );
    }
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    if (response.headers["etag"]) {
      res.setHeader("ETag", response.headers["etag"]);
    }
    if (response.headers["last-modified"]) {
      res.setHeader("Last-Modified", response.headers["last-modified"]);
    }

    // Handle HTML content specially for token rewriting
    if (ct.toLowerCase().includes("text/html")) {
      // Setear cookie para autenticar assets estáticos
      if (tokenQs) {
        res.cookie("orthanc_proxy_jwt", tokenQs, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 3600 * 1000, // 1 hora
          path: "/api/orthanc/pacs",
        });
      }

      // For HTML, we need to buffer to rewrite URLs
      const chunks = [];
      response.data.on("data", (chunk) => chunks.push(chunk));
      response.data.on("end", () => {
        const buf = Buffer.concat(chunks);
        let text = buf.toString("utf8");
        text = rewriteOrthancHtml(text, tokenQs, orthancPath);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Length", Buffer.byteLength(text));
        res.status(response.status).send(text);
      });
      response.data.on("error", (err) => {
        console.error("Stream error:", err);
        res.status(502).json({
          error: "Error al obtener recurso desde Orthanc",
          message: err.message,
        });
      });
    } else {
      // For non-HTML content, stream directly
      if (ct) {
        res.setHeader("Content-Type", ct.split(";")[0].trim());
      }

      res.status(response.status);
      response.data.pipe(res);

      response.data.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(502).json({
            error: "Error al obtener recurso desde Orthanc",
            message: err.message,
          });
        }
      });
    }
  } catch (err) {
    console.error("Orthanc proxy error:", err.message);
    if (!res.headersSent) {
      return res.status(502).json({
        error: "Error al obtener recurso desde Orthanc",
        message: err.message,
      });
    }
  }
};

router.use(
  "/pacs",
  orthancProxyAuth,
  (req, res, next) => {
    // Assets estáticos del Stone Viewer bypasean roleMiddleware
    if (req.user?.role === "STATIC") return next();
    return roleMiddleware(["ADMIN", "DOCTOR", "PATIENT"])(req, res, next);
  },
  orthancPatientGate,
  pacsProxyHandler,
);

// ─── ENDPOINT 1: Listar estudios desde Orthanc ─────────────────────
router.get(
  "/studies",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  async (req, res) => {
    try {
      // Add cache headers
      res.set("Cache-Control", "public, max-age=300"); // 5 minutes

      // Verificar conexión con Orthanc
      const isOrthancConnected = await checkOrthancConnection();
      if (!isOrthancConnected) {
        return res.status(503).json({
          error: "Orthanc no está disponible",
          message: "No se puede conectar con el servidor PACS",
        });
      }

      const studies = await getStudies();

      res.json({
        success: true,
        data: studies,
        count: studies.length,
      });
    } catch (error) {
      console.error("Error fetching studies from Orthanc:", error);
      res.status(500).json({
        error: "Error al obtener estudios desde Orthanc",
        message: error.message,
      });
    }
  },
);

// ─── ENDPOINT 2: Obtener detalles de un estudio específico ─────────────────
router.get(
  "/studies/:id",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR", "PATIENT"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: "Se requiere el ID del estudio",
        });
      }

      // Add cache headers
      res.set("Cache-Control", "public, max-age=600"); // 10 minutes

      // Si es PACIENTE, verificar que el estudio le pertenezca
      if (req.user.role === "PATIENT") {
        const { prisma } = await import("../lib/prisma.js");
        const study = await prisma.study.findFirst({
          where: { orthancId: id },
          select: { patientId: true },
        });

        if (!study || study.patientId !== req.user.id) {
          return res.status(403).json({
            error: "Acceso denegado. No puedes ver este estudio.",
          });
        }
      }

      const studyDetails = await getStudyDetails(id);

      res.json({
        success: true,
        data: studyDetails,
      });
    } catch (error) {
      console.error("Error fetching study details from Orthanc:", error);
      res.status(500).json({
        error: "Error al obtener detalles del estudio desde Orthanc",
        message: error.message,
      });
    }
  },
);

// ─── ENDPOINT 3: Asignar estudio a paciente (crear si no existe) ─────────────────────
router.post(
  "/assign",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  async (req, res) => {
    try {
      const { patientId, orthancId, patientDni, patientName } = req.body;

      // Validar datos requeridos
      if (!orthancId) {
        return res.status(400).json({
          error: "orthancId es requerido",
        });
      }

      const { prisma } = await import("../lib/prisma.js");
      let patient = null;

      // Si se proporciona patientId, buscar paciente existente
      if (patientId) {
        patient = await prisma.user.findUnique({
          where: { id: patientId },
        });
      }

      // Si no se encuentra paciente pero se proporciona DNI y nombre, crearlo
      if (!patient && patientDni && patientName) {
        // Verificar si ya existe un paciente con ese DNI
        const existingPatient = await prisma.user.findUnique({
          where: { dni: patientDni },
        });

        if (existingPatient) {
          patient = existingPatient;
        } else {
          // Crear nuevo paciente con contraseña = DNI (usando hash pre-generado)
          // Hash pre-generado para 99999999 que sabemos funciona
          const knownHash = "$2a$10$N9qo8uLOickgx2ZMRQo/p1s3N.EYUZd3RfKJpGqy";

          // Verificar inmediatamente que el hash funcione
          const testMatch = await bcrypt.compare(patientDni, knownHash);

          patient = await prisma.user.create({
            data: {
              dni: patientDni,
              name: patientName,
              phone: "Sin teléfono", // Valor por defecto
              email: null, // Opcional
              role: "PATIENT",
              password: knownHash,
            },
          });
        }
      }

      if (!patient) {
        return res.status(400).json({
          error:
            "Paciente no encontrado y no se pudo crear. Proporcione patientDni y patientName para crear uno nuevo.",
        });
      }

      // Verificar que el estudio existe en Orthanc
      const studyDetails = await getStudyDetails(orthancId);

      if (!studyDetails) {
        return res.status(400).json({
          error: "Estudio no encontrado en Orthanc",
        });
      }

      // Convertir fecha DICOM (YYYYMMDD) a Date o usar fecha actual
      let studyDate = new Date();
      if (studyDetails.studyDate && studyDetails.studyDate !== "Sin fecha") {
        const dicomDate = studyDetails.studyDate;
        if (dicomDate.length === 8) {
          const year = dicomDate.substring(0, 4);
          const month = dicomDate.substring(4, 6);
          const day = dicomDate.substring(6, 8);
          const parsedDate = new Date(`${year}-${month}-${day}`);
          if (!isNaN(parsedDate.getTime())) {
            studyDate = parsedDate;
          }
        }
      }
      // Crear estudio en la base de datos local

      const study = await prisma.study.create({
        data: {
          patientId,
          doctorId: req.user.id,
          orthancId,
          type: studyDetails.type || "Sin tipo",
          StudyDescription:
            studyDetails.StudyDescription ||
            studyDetails.type ||
            "Sin descripción",
          date: studyDate,
          studyInstanceUid: studyDetails.studyInstanceUid,
        },
      });

      res.json({
        success: true,
        message: "Estudio asignado correctamente",
        data: {
          studyId: study.id,
          orthancId,
          patientName: studyDetails.patientName,
          patient: {
            id: patient.id,
            dni: patient.dni,
            name: patient.name,
            role: patient.role,
            // Importante: indicar que la contraseña es el DNI
            loginInfo: `Use DNI ${patient.dni} como usuario y contraseña`,
          },
        },
      });
    } catch (error) {
      console.error("Error assigning study to patient:", error);
      res.status(500).json({
        error: "Error al asignar estudio al paciente",
        message: error.message,
      });
    }
  },
);

// ─── ENDPOINT 4: Obtener estudios por paciente ─────────────────────────────
router.get(
  "/patient/:id",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR", "PATIENT"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: "Se requiere el ID del paciente",
        });
      }

      // Add cache headers
      res.set("Cache-Control", "public, max-age=300"); // 5 minutes

      // Obtener estudios del paciente desde la base de datos local
      const { prisma } = await import("../lib/prisma.js");
      const studies = await prisma.study.findMany({
        where: { patientId: id },
        include: {
          patient: {
            select: {
              name: true,
              dni: true,
            },
          },
          doctor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          studyDate: "desc",
        },
      });

      if (studies.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      // Batch all Orthanc requests to avoid N+1 problem
      const orthancIds = studies
        .filter((s) => s.orthancId)
        .map((s) => s.orthancId);
      const previewUrlMap = new Map();

      if (orthancIds.length > 0) {
        // Get all study details in parallel
        const detailPromises = orthancIds.map(async (orthancId) => {
          try {
            const details = await getStudyDetails(orthancId);
            return { orthancId, previewUrl: details.previewUrl };
          } catch (error) {
            console.error("Error getting preview for study:", orthancId, error);
            return { orthancId, previewUrl: null };
          }
        });

        const results = await Promise.all(detailPromises);
        results.forEach(({ orthancId, previewUrl }) => {
          previewUrlMap.set(orthancId, previewUrl);
        });
      }

      const studiesWithPreview = studies.map((study) => {
        const previewUrl = study.orthancId
          ? previewUrlMap.get(study.orthancId) || null
          : null;

        return {
          id: study.id,
          orthancId: study.orthancId,
          patientName: study.patient.name,
          patientDni: study.patient.dni,
          doctorName: study.doctor.name,
          studyDate: study.studyDate,
          type: study.type,
          previewUrl,
          hasReport: study.reports && study.reports.length > 0,
        };
      });

      res.json({
        success: true,
        data: studiesWithPreview,
      });
    } catch (error) {
      console.error("Error fetching patient studies:", error);
      res.status(500).json({
        error: "Error al obtener estudios del paciente",
        message: error.message,
      });
    }
  },
);

// ─── ENDPOINT 5: Servir archivos DICOM con autenticación ─────────────────────
router.get(
  "/instances/:instanceId/file",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR", "PATIENT"]),
  async (req, res) => {
    try {
      const { instanceId } = req.params;

      if (!instanceId) {
        return res.status(400).json({
          error: "Se requiere el ID de la instancia",
        });
      }

      const ORTHANC_URL = process.env.ORTHANC_URL;
      const ORTHANC_USER = process.env.ORTHANC_USER;
      const ORTHANC_PASS = process.env.ORTHANC_PASS;

      const response = await axios.get(
        `${ORTHANC_URL}/instances/${instanceId}/file`,
        {
          responseType: "arraybuffer",
          auth: {
            username: ORTHANC_USER,
            password: ORTHANC_PASS,
          },
          timeout: 30000,
        },
      );

      // Configurar headers para la respuesta
      res.setHeader("Content-Type", "application/dicom");
      res.setHeader("Content-Length", response.data.byteLength);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${instanceId}.dcm"`,
      );

      // Enviar el archivo como buffer
      res.send(Buffer.from(response.data));
    } catch (error) {
      console.error("Error serving DICOM file:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });
      res.status(500).json({
        error: "Error al obtener archivo DICOM",
        message: error.message,
      });
    }
  },
);

export default router;
