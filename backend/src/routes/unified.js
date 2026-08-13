import { Prisma } from "@prisma/client";
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
      const {
        page = 1,
        limit = 10,
        search = "",
        onlyWithoutReports = false,
        onlyMyStudies = false, // For doctors to see only their studies
      } = req.query;
      const skip = (page - 1) * limit;

      const searchParam = search ? `%${search}%` : null;
      
      // Construir filtro de rol si es paciente
      const isPatient = req.user.role === "PATIENT";
      const patientId = req.user.id;

      // 1. Obtener el total de pacientes (para la paginación)
      const totalResult = await prisma.$queryRaw`
        SELECT COUNT(u.id)::int as count
        FROM users u
        WHERE u.role = 'PATIENT'
          ${
            searchParam
              ? Prisma.sql`AND (u.name ILIKE ${searchParam} OR u.dni ILIKE ${searchParam})`
              : Prisma.empty
          }
          ${isPatient ? Prisma.sql`AND u.id = ${patientId}` : Prisma.empty}
      `;
      const totalPatients = totalResult[0]?.count || 0;

      // 2. Obtener los IDs de los pacientes de esta página, ordenados por el último estudio
      const paginatedIdsResult = await prisma.$queryRaw`
        SELECT u.id
        FROM users u
        LEFT JOIN (
          SELECT "patientId", MAX("date") as latest_study_date
          FROM studies
          GROUP BY "patientId"
        ) s ON u.id = s."patientId"
        WHERE u.role = 'PATIENT'
          ${
            searchParam
              ? Prisma.sql`AND (u.name ILIKE ${searchParam} OR u.dni ILIKE ${searchParam})`
              : Prisma.empty
          }
          ${isPatient ? Prisma.sql`AND u.id = ${patientId}` : Prisma.empty}
        ORDER BY COALESCE(s.latest_study_date, u."createdAt") DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(skip)}
      `;

      const patientIds = paginatedIdsResult.map((r) => r.id);

      let patients = [];
      if (patientIds.length > 0) {
        // 3. Obtener los datos completos solo para los pacientes de esta página
        const fetchedPatients = await prisma.user.findMany({
          where: {
            id: { in: patientIds },
          },
          include: {
            studiesAsPatient: {
              select: {
                id: true,
                patientId: true,
                doctorId: true,
                orthancId: true,
                type: true,
                StudyDescription: true,
                notes: true,
                date: true,
                imageUrl: true,
                studyInstanceUid: true,
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
        });

        // 4. Prisma no garantiza el orden al usar 'in', así que reordenamos
        // según el arreglo 'patientIds' devuelto por la consulta SQL
        patients = patientIds.map((id) =>
          fetchedPatients.find((p) => p.id === id),
        ).filter(Boolean);
      }

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
              StudyDescription:
                study.StudyDescription || study.type || "Sin descripción",
              notes: study.notes,
              doctorName: study.doctor.name,
              hasReport: study.reports.length > 0,
              studyId: study.id,
              reportId: study.reports.length > 0 ? study.reports[0].id : null,
              imageUrl: study.imageUrl,
              orthancId: study.orthancId,
              studyInstanceUid: study.studyInstanceUid,
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
                StudyDescription:
                  study.StudyDescription || study.type || "Sin descripción",
                date: study.date,
                notes: study.notes,
                imageUrl: study.imageUrl,
                orthancId: study.orthancId,
                studyInstanceUid: study.studyInstanceUid,
                doctor: study.doctor,
                reports: study.reports,
              },
            });
          }
        }
      }


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
