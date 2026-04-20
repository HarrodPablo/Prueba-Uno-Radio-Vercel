import bcrypt from "bcryptjs";
import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js"; // Agregado .js
const router = express.Router();

// Get users with pagination and search
router.get("/", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause
    let where = {};

    // Add search condition
    if (search) {
      where.OR = [
        { dni: { contains: search } },
        { name: { contains: search } },
      ];
    }

    // Add role filter
    if (req.query.role) {
      where.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(req.query.limit),
        take: parseInt(limit),
        select: {
          id: true,
          dni: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(req.query.page),
        limit: parseInt(req.query.limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error in users endpoint:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      meta: error.meta,
    });
    res.status(500).json({ error: "Server error" });
  }
});

// Create user
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { dni, name, phone, email, role, password } = req.body;

      if (!dni || !name || !phone || !role) {
        return res
          .status(400)
          .json({ error: "DNI, name, phone, and role are required" });
      }

      // Check if User
      const conditions = [{ dni }];
      if (email && email.trim() !== "") {
        conditions.push({ email: email.trim() });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: conditions,
        },
      });

      if (existingUser) {
        let errorMessage = "Usuario ya existe: ";
        if (existingUser.dni === dni) {
          errorMessage += `DNI "${dni}"`;
        }
        if (existingUser.email === (email ? email.trim() : null)) {
          if (errorMessage !== "Usuario ya existe: ") errorMessage += " and ";
          errorMessage += `Email "${email}"`;
        }

        return res.status(400).json({ error: errorMessage });
      }

      // Hash password (default to DNI if not provided)
      const hashedPassword = await bcrypt.hash(password || dni, 10);

      const user = await prisma.user.create({
        data: {
          dni,
          name,
          phone,
          email: email ? email.trim() : null,
          role,
          password: hashedPassword,
        },
        select: {
          id: true,
          dni: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      res.status(201).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Get user by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "ADMIN" && req.user.id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        dni: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { dni, name, phone, email, role, password } = req.body;

      if (!dni || !name || !phone || !role) {
        return res
          .status(400)
          .json({ error: "DNI, name, phone, and role are required" });
      }

      // Verificar si el usuario existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Check if DNI or email already exists for other users
      const conditions = [{ dni }];
      if (email && email.trim() !== "") {
        conditions.push({ email: email.trim() });
      }

      const duplicateUser = await prisma.user.findFirst({
        where: {
          OR: conditions,
          id: { not: id }, // Exclude current user
        },
      });

      if (duplicateUser) {
        let errorMessage = "Usuario ya existe: ";
        if (duplicateUser.dni === dni) {
          errorMessage += `DNI "${dni}"`;
        }
        if (duplicateUser.email === (email ? email.trim() : null)) {
          if (errorMessage !== "Usuario ya existe: ") errorMessage += " y ";
          errorMessage += `Email "${email}"`;
        }

        return res.status(400).json({ error: errorMessage });
      }

      // Prepare update data
      const updateData = {
        dni,
        name,
        phone,
        email: email ? email.trim() : null,
        role,
      };

      // Only update password if provided
      if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          dni: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Delete user
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar si el usuario existe
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          studiesAsPatient: true,
          studiesAsDoctor: true,
          reports: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Contar datos asociados
      const studyCount =
        user.studiesAsPatient.length + user.studiesAsDoctor.length;
      const reportCount = user.reports.length;

      // Si tiene datos asociados, mostrar advertencia pero permitir eliminación
      if (studyCount > 0 || reportCount > 0) {
        // Para desarrollo, permitimos la eliminación con advertencia
        // En producción, podrías querer archivar los datos en lugar de eliminar
        try {
          // Eliminar en cascada (si tienes onDelete: Cascade en el schema)
          await prisma.user.delete({
            where: { id },
          });

          res.json({
            message: "Usuario eliminado exitosamente (tenía datos asociados)",
            warning: `Se eliminaron ${studyCount} estudios y ${reportCount} informes asociados`,
          });
        } catch (cascadeError) {
          // Si la eliminación en cascada falla, intentamos eliminar manualmente

          // Eliminar informes primero
          if (user.reports.length > 0) {
            await prisma.report.deleteMany({
              where: { doctorId: id },
            });
          }

          // Eliminar estudios como paciente
          if (user.studiesAsPatient.length > 0) {
            await prisma.study.deleteMany({
              where: { patientId: id },
            });
          }

          // Eliminar estudios como doctor
          if (user.studiesAsDoctor.length > 0) {
            await prisma.study.deleteMany({
              where: { doctorId: id },
            });
          }

          // Finalmente eliminar el usuario
          await prisma.user.delete({
            where: { id },
          });

          res.json({
            message:
              "Usuario eliminado exitosamente (con eliminación manual de datos asociados)",
            warning: `Se eliminaron manualmente ${studyCount} estudios y ${reportCount} informes`,
          });
        }
      } else {
        // Eliminar usuario sin datos asociados
        await prisma.user.delete({
          where: { id },
        });

        res.json({ message: "Usuario eliminado exitosamente" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res
        .status(500)
        .json({ error: "Error al eliminar usuario", details: error.message });
    }
  },
);

export default router;
