import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
// import { PrismaPg } from "@prisma/adapter-pg"; // Comentado si ya lo manejás en index.js o lib
import { prisma } from "../lib/prisma.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js"; // IMPORTANTE: Agregué el .js

const router = express.Router();

// Endpoint temporal para crear datos de prueba (solo desarrollo)
router.post("/create-test-data", async (req, res) => {
  try {
    console.log("=== CREANDO DATOS DE PRUEBA ===");

    // 1. Buscar al médico 753753
    const doctor = await prisma.user.findUnique({
      where: { dni: "753753" },
    });

    if (!doctor) {
      return res.status(404).json({ error: "Médico 753753 no encontrado" });
    }

    // 2. Buscar un paciente existente o crear uno de prueba
    let patient = await prisma.user.findFirst({
      where: { role: "PATIENT" },
    });

    if (!patient) {
      patient = await prisma.user.create({
        data: {
          dni: "12345678",
          name: "Juan Pérez",
          email: "juan.perez@test.com",
          phone: "1199999999",
          password: "$2b$10$rOzJqQjQjQjQjQjQjQjQju", // Password: 12345678 (hasheado)
          role: "PATIENT",
        },
      });
    }

    // 3. Crear estudios de prueba
    const studies = [];
    const studyTypes = [
      "Radiografía de Tórax",
      "Radiografía de Columna",
      "Radiografía de Abdomen",
      "Tomografía Computarizada",
    ];

    for (let i = 0; i < 4; i++) {
      const study = await prisma.study.create({
        data: {
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Días diferentes
          type: studyTypes[i],
          patientId: patient.id,
          doctorId: doctor.id,
          imageUrl: `https://via.placeholder.com/400x300/000000/FFFFFF?text=${encodeURIComponent(studyTypes[i])}`,
        },
      });
      studies.push(study);
    }

    // 4. Crear algunos informes
    const reports = [];
    for (let i = 0; i < 2; i++) {
      const report = await prisma.report.create({
        data: {
          content: `Informe médico para ${studyTypes[i]}\n\nPaciente: ${patient.name}\nDoctor: ${doctor.name}\nFecha: ${new Date().toLocaleDateString()}\n\nObservaciones:\n- Estudio realizado satisfactoriamente\n- No se observan anomalías significativas\n- Se recomienda control en 6 meses\n\nFirma: Dr. ${doctor.name}`,
          studyId: studies[i].id,
          doctorId: doctor.id,
        },
      });
      reports.push(report);
    }

    res.json({
      message: "Datos de prueba creados exitosamente",
      doctor: {
        id: doctor.id,
        dni: doctor.dni,
        name: doctor.name,
      },
      studies: studies.map((s) => ({
        id: s.id,
        type: s.type,
        date: s.date,
        hasReport: reports.some((r) => r.studyId === s.id),
      })),
      reports: reports.length,
    });
  } catch (error) {
    console.error("Error creating test data:", error);
    res.status(500).json({
      error: "Error al crear datos de prueba",
      details: error.message,
    });
  }
});

// Si vas a instanciar Prisma acá, necesitás el cliente básico.
// Ojo: Si ya tenés un PrismaClient global, lo ideal sería importarlo.

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("📥 LOGIN BODY:", req.body);

    const { dni, password } = req.body;

    if (!dni || !password) {
      return res.status(400).json({
        error: "DNI y password requeridos",
      });
    }

    const user = await prisma.user.findUnique({
      where: { dni },
    });

    console.log("👤 USER FOUND:", user);

    if (!user) {
      return res.status(401).json({
        error: "Usuario no encontrado",
      });
    }

    // ⚠️ ACÁ PUEDE ESTAR EL ERROR
    const isMatch = await bcrypt.compare(password, user.password);

    console.log("🔐 PASSWORD MATCH:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user,
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        dni: true,
        name: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint para generar estudios automáticos para pacientes
router.post(
  "/generate-default-studies",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      console.log("🔄 Generando estudios automáticos para pacientes...");

      // Obtener todos los pacientes
      const patients = await prisma.user.findMany({
        where: { role: "PATIENT" },
        include: {
          studiesAsPatient: true,
        },
      });

      // Obtener doctores para asignar
      const doctors = await prisma.user.findMany({
        where: { role: "DOCTOR" },
      });

      if (doctors.length === 0) {
        return res
          .status(400)
          .json({ error: "No hay doctores disponibles para asignar estudios" });
      }

      const studyTypes = [
        "Radiografía de Tórax",
        "Radiografía de Columna",
        "Tomografía Computarizada",
        "Resonancia Magnética",
        "Ecografía Abdominal",
      ];

      let studiesCreated = 0;
      let patientsUpdated = 0;

      for (const patient of patients) {
        // Si el paciente ya tiene estudios, omitir
        if (patient.studiesAsPatient.length > 0) {
          continue;
        }

        // Asignar un doctor aleatorio
        const randomDoctor =
          doctors[Math.floor(Math.random() * doctors.length)];

        // Crear 1-3 estudios por paciente
        const numStudies = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numStudies; i++) {
          const randomType =
            studyTypes[Math.floor(Math.random() * studyTypes.length)];
          const pastDate = new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          ); // Últimos 30 días

          await prisma.study.create({
            data: {
              patientId: patient.id,
              doctorId: randomDoctor.id,
              type: randomType,
              date: pastDate,
              imageUrl: `https://picsum.photos/seed/${patient.id}_${i}/800/600.jpg`,
              notes: `Estudio ${randomType} generado automáticamente para ${patient.name}`,
            },
          });

          studiesCreated++;
        }

        patientsUpdated++;
      }

      res.json({
        message: "Estudios generados exitosamente",
        summary: {
          pacientesProcesados: patients.length,
          pacientesActualizados: patientsUpdated,
          estudiosCreados: studiesCreated,
          doctoresDisponibles: doctors.length,
        },
      });
    } catch (error) {
      console.error("Error generando estudios automáticos:", error);
      res.status(500).json({ error: "Error al generar estudios automáticos" });
    }
  },
);

export default router;
