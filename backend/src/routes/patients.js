import express from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// Get patients with pagination and search
router.get("/", authMiddleware, roleMiddleware(["ADMIN", "DOCTOR"]), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      role: "PATIENT" // Only get patients
    };

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { dni: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          dni: true,
          name: true,
          phone: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    };

    res.json({
      patients,
      pagination,
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get patient by ID
router.get("/:id", authMiddleware, roleMiddleware(["ADMIN", "DOCTOR"]), async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.user.findUnique({
      where: { id, role: "PATIENT" },
      select: {
        id: true,
        dni: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
