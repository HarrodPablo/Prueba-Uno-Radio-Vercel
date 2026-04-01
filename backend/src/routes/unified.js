import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get unified view - patients, studies and reports all in one
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN", "DOCTOR", "PATIENT"]),
  async (req, res) => {
    try {
      // console.log("🔍 Unified endpoint - User:", {
      //   id: req.user.id,
      //   role: req.user.role,
      //   name: req.user.name,
      // });
      // console.log("🔍 Unified endpoint - Query params:", req.query);

      const {
        page = 1,
        limit = 10,
        search = "",
        onlyWithoutReports = false,
        onlyMyStudies = false, // For doctors to see only their studies
      } = req.query;
      const skip = (page - 1) * limit;

      // Build where clause for patients
      const patientWhere = search
        ? {
            OR: [{ name: { contains: search } }, { dni: { contains: search } }],
          }
        : {};

      // For PATIENTS, only show their own data
      if (req.user.role === "PATIENT") {
        patientWhere.id = req.user.id;
      }

      // Get all patients with their studies and reports
      const patients = await prisma.user.findMany({
        where: {
          ...patientWhere,
          role: "PATIENT",
        },
        include: {
          studiesAsPatient: {
            include: {
              doctor: {
                select: { id: true, name: true, dni: true },
              },
              reports: {
                select: { id: true, content: true, createdAt: true },
              },
            },
            orderBy: { date: "desc" },
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      });

      // Transform data to create unified list
      const unifiedList = [];

      for (const patient of patients) {
        if (patient.studiesAsPatient.length === 0) {
          // Patient without studies - add as empty row
          unifiedList.push({
            id: `patient_${patient.id}`,
            type: "patient",
            patientId: patient.id,
            patientName: patient.name,
            patientDni: patient.dni,
            studyDate: null,
            studyType: "Sin estudios",
            doctorName: "-",
            hasReport: false,
            studyId: null,
            reportId: null,
            imageUrl: null,
            patient: {
              id: patient.id,
              name: patient.name,
              dni: patient.dni,
              phone: patient.phone,
              email: patient.email,
            },
          });
        } else {
          // Patient with studies - add each study as separate row
          for (const study of patient.studiesAsPatient) {
            // Skip if onlyWithoutReports filter is applied and study has reports
            if (onlyWithoutReports === "true" && study.reports.length > 0) {
              continue;
            }

            // Skip if onlyMyStudies filter is applied and study is not by current doctor
            if (onlyMyStudies === "true" && study.doctorId !== req.user.id) {
              continue;
            }

            unifiedList.push({
              id: `study_${study.id}`,
              type: "study",
              patientId: patient.id,
              patientName: patient.name,
              patientDni: patient.dni,
              studyDate: study.date,
              studyType: study.type,
              notes: study.notes,
              doctorName: study.doctor.name,
              hasReport: study.reports.length > 0,
              studyId: study.id,
              reportId: study.reports.length > 0 ? study.reports[0].id : null,
              imageUrl: study.imageUrl,
              doctorId: study.doctorId,
              patient: {
                id: patient.id,
                name: patient.name,
                dni: patient.dni,
                phone: patient.phone,
                email: patient.email,
              },
              study: {
                id: study.id,
                type: study.type,
                date: study.date,
                notes: study.notes,
                imageUrl: study.imageUrl,
                doctor: study.doctor,
                reports: study.reports,
              },
            });
          }
        }
      }

      // Get total count for pagination
      const totalPatients = await prisma.user.count({
        where: {
          ...patientWhere,
          role: "PATIENT",
        },
      });

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPatients,
        pages: Math.ceil(totalPatients / limit),
      };

      res.json({
        items: unifiedList,
        pagination,
        summary: {
          totalPatients: totalPatients,
          totalItems: unifiedList.length,
          withStudies: unifiedList.filter((item) => item.type === "study")
            .length,
          withoutStudies: unifiedList.filter((item) => item.type === "patient")
            .length,
          withReports: unifiedList.filter((item) => item.hasReport).length,
          withoutReports: unifiedList.filter(
            (item) => item.type === "study" && !item.hasReport,
          ).length,
        },
      });
    } catch (error) {
      console.error("Error fetching unified data:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
