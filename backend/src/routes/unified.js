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

      // Get all patients matching the filter with their studies and reports.
      // Ordering/pagination happens in-memory below by most recent study date,
      // not here, so no skip/take/orderBy on this query.
      const allPatients = await prisma.user.findMany({
        where: {
          ...patientWhere,
          role: "PATIENT",
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

      // Sort patients by their most recent study date (studiesAsPatient[0], since
      // that relation is already ordered desc), falling back to the patient's own
      // createdAt for patients without any studies yet. This makes a patient with
      // a brand-new study surface at the top, regardless of when their account
      // was created.
      const sortedPatients = allPatients.sort((a, b) => {
        const aDate = a.studiesAsPatient[0]?.date ?? a.createdAt;
        const bDate = b.studiesAsPatient[0]?.date ?? b.createdAt;
        return new Date(bDate) - new Date(aDate);
      });

      const patients = sortedPatients.slice(
        parseInt(skip),
        parseInt(skip) + parseInt(limit),
      );

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

      // Total count for pagination — already have the full matching list in memory.
      const totalPatients = allPatients.length;

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
