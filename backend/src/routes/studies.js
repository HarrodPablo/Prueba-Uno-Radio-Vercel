import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js"; // Agregado .js
const router = express.Router();

// Get studies with filters
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

    // Filter by patient (exact ID for PATIENT role, search for others)
    if (patientId) {
      if (req.user.role === "PATIENT") {
        // For patients, filter by exact ID
        where.patientId = patientId;
      } else {
        // For doctors/admins, search in patient name or DNI
        where.patient = {
          OR: [
            { name: { contains: patientId, mode: "insensitive" } },
            { dni: { contains: patientId, mode: "insensitive" } },
          ],
        };
      }
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      if (!where.date) where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    // Search filter (CORREGIDO: Faltaban llaves de cierre '}')
    if (search) {
      where.OR = [
        { type: { contains: search, mode: "insensitive" } },
        { patient: { name: { contains: search, mode: "insensitive" } } }, // Agregada }
        { patient: { dni: { contains: search, mode: "insensitive" } } }, // Agregada }
      ];
    }

    // Filter studies without reports
    if (onlyWithoutReports === "true") {
      where.reports = {
        none: {},
      };
    }

    // Role-based filtering
    if (req.user.role === "PATIENT") {
      where.patientId = req.user.id;
    } else if (req.user.role === "DOCTOR") {
      where.doctorId = req.user.id;
    }

    const [studies, total] = await Promise.all([
      prisma.study.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              dni: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
          reports: {
            select: { id: true, content: true, createdAt: true },
          },
        },
        orderBy: { date: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.study.count({ where }),
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    };

    res.json({
      studies,
      pagination,
    });
  } catch (error) {
    console.error("Error fetching studies:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new study
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  async (req, res) => {
    try {
      console.log("🔍 POST /api/studies - Request received");
      console.log("🔍 Headers:", req.headers);
      console.log("🔍 Body:", req.body);
      console.log("🔍 User:", req.user);

      const { patientId, type, date, notes, imageUrl } = req.body;

      if (!patientId || !type) {
        console.log("❌ Missing required fields");
        return res
          .status(400)
          .json({ error: "Patient ID and type are required" });
      }

      console.log("🔍 Finding patient:", patientId);
      // Get patient details
      const patient = await prisma.user.findUnique({
        where: { id: patientId, role: "PATIENT" },
        select: { id: true, dni: true, name: true, phone: true, email: true },
      });

      if (!patient) {
        console.log("❌ Patient not found");
        return res.status(400).json({ error: "Patient not found" });
      }

      console.log("✅ Patient found:", patient.name);
      console.log("🔍 Creating study...");

      const newStudy = await prisma.study.create({
        data: {
          patientId,
          doctorId: req.user.id,
          type,
          imageUrl:
            imageUrl ||
            `https://picsum.photos/seed/study_${Date.now()}/800/600.jpg`,
          notes: notes || "",
          date: date ? new Date(date) : new Date(),
        },
        include: {
          patient: {
            select: {
              id: true,
              dni: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
        },
      });

      console.log("✅ Study created successfully:", newStudy.id);
      res.status(201).json(newStudy);
    } catch (error) {
      console.error("❌ Error creating study:", error);
      console.error("❌ Stack:", error.stack);
      res.status(500).json({ error: "Server error", details: error.message });
    }
  },
);

// Get study by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const study = await prisma.study.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, dni: true, name: true, phone: true, email: true },
        },
        doctor: {
          select: { id: true, dni: true, name: true },
        },
        reports: {
          select: { id: true, content: true, createdAt: true },
        },
      },
    });

    if (!study) {
      return res.status(404).json({ error: "Study not found" });
    }

    if (req.user.role === "PATIENT" && study.patientId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (req.user.role === "DOCTOR" && study.doctorId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(study);
  } catch (error) {
    console.error("Error fetching study:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
