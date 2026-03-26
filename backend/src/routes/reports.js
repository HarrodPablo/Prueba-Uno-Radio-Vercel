import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
const router = express.Router();

// Get reports with filters
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      onlyWithoutReports = false,
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    // Filter by reports without content
    if (onlyWithoutReports === "true") {
      where.content = { equals: null }; // Simplificado según tu esquema
    }

    // Search filter (CORREGIDO: Faltaban llaves de cierre '}')
    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        { study: { type: { contains: search, mode: "insensitive" } } }, // Agregada }
        {
          study: {
            patient: { name: { contains: search, mode: "insensitive" } },
          },
        }, // Agregada }
        {
          study: {
            patient: { dni: { contains: search, mode: "insensitive" } },
          },
        }, // Agregada }
      ];
    }

    // Role-based filtering
    if (req.user.role === "DOCTOR") {
      where.doctorId = req.user.id;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          study: {
            select: { id: true, type: true, date: true },
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
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.report.count({ where }),
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    };

    res.json({
      reports,
      pagination,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new report
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  async (req, res) => {
    try {
      console.log("🚀 POST /api/reports - Request received");
      console.log("🚀 Full request object:", req);
      console.log("🚀 Request user:", req.user);
      console.log("🚀 Request headers:", req.headers);

      const { studyId, content } = req.body;

      if (!studyId || !content) {
        return res
          .status(400)
          .json({ error: "Study ID and content are required" });
      }

      const study = await prisma.study.findUnique({
        where: { id: studyId },
        include: {
          reports: {
            select: { id: true },
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
        },
      });

      if (!study) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Admins can create reports for any study, doctors only for their own
      // Simplified logic: allow any doctor to create reports for now
      console.log("🔍 User role:", req.user.role);
      console.log("🔍 User ID:", req.user.id);
      console.log("🔍 Study doctorId:", study.doctorId);
      console.log("🔍 Study reports:", study.reports);

      // Temporarily allow all doctors to create reports
      if (req.user.role !== "ADMIN" && req.user.role !== "DOCTOR") {
        console.log("❌ Invalid role");
        return res.status(403).json({ error: "Access denied" });
      }

      console.log("✅ Access granted - creating report");

      // Create the report
      const newReport = await prisma.report.create({
        data: {
          studyId,
          doctorId: req.user.id,
          content,
        },
        include: {
          study: {
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
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
        },
      });

      // If a doctor is creating a report, update the study's doctor to the current doctor
      if (req.user.role === "DOCTOR" && study.doctorId !== req.user.id) {
        await prisma.study.update({
          where: { id: studyId },
          data: {
            doctorId: req.user.id,
          },
        });

        // Update the report data to reflect the new doctor
        newReport.study.doctor = {
          id: req.user.id,
          dni: req.user.dni,
          name: req.user.name,
        };
      }

      res.json(newReport);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Get report by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        study: {
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
        },
        doctor: {
          select: { id: true, dni: true, name: true },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (req.user.role === "DOCTOR" && report.doctorId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Send WhatsApp notification for report
router.post(
  "/:id/send-whatsapp",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          study: {
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
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
        },
      });

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      if (req.user.role === "DOCTOR" && report.doctorId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Send WhatsApp notification
      await sendReportReadyNotification(
        report.study.patient,
        report.doctor,
        report.study.type,
      );

      res.json({ message: "WhatsApp notification sent successfully" });
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Update report
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const report = await prisma.report.findUnique({
        where: { id },
        select: { id: true, doctorId: true },
      });

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      if (req.user.role === "DOCTOR" && report.doctorId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedReport = await prisma.report.update({
        where: { id },
        data: { content },
        include: {
          study: {
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
          },
          doctor: {
            select: { id: true, dni: true, name: true },
          },
        },
      });

      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
