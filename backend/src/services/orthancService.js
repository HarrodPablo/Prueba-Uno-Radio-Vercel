import axios from "axios";

const ORTHANC_URL = process.env.ORTHANC_URL;

export const orthancApi = axios.create({
  baseURL: ORTHANC_URL,
  auth: {
    username: process.env.ORTHANC_USER,
    password: process.env.ORTHANC_PASS,
  },
});

/** Ruta pública del proxy (frontend + imágenes; credenciales Orthanc solo en servidor) */
export const ORTHANC_PROXY_PUBLIC_PREFIX = "/api/orthanc/pacs";

// ─────────────────────────────────────────────
// Obtener lista de estudios
// ─────────────────────────────────────────────
export const getStudies = async () => {
  try {
    const response = await orthancApi.get("/studies");

    const studies = await Promise.all(
      response.data.map(async (id) => {
        const studyRes = await orthancApi.get(`/studies/${id}`);
        const study = studyRes.data;

        const seriesRes = await orthancApi.get(`/studies/${id}/series`);
        const series = seriesRes.data;

        let instancesCount = 0;
        if (series.length > 0) {
          const firstSeries = series[0];
          const instancesRes = await orthancApi.get(
            `/series/${firstSeries.ID}/instances`,
          );
          instancesCount = instancesRes.data.length;
        }

        return {
          orthancId: study.ID,

          // 🧠 DICOM REAL
          PatientName: study.PatientMainDicomTags?.PatientName || "Sin nombre",

          PatientID: study.PatientMainDicomTags?.PatientID || "Sin ID",

          StudyDate: study.MainDicomTags?.StudyDate || "Sin fecha",

          StudyTime: study.MainDicomTags?.StudyTime || "Sin hora",

          StudyDescription:
            study.MainDicomTags?.StudyDescription || "Sin descripción",

          // ✅ PRIORIDAD CORRECTA
          type:
            study.MainDicomTags?.StudyDescription ||
            study.MainDicomTags?.Modality ||
            "Sin tipo",

          // Frontend friendly
          patientName: study.PatientMainDicomTags?.PatientName || "Sin nombre",

          patientDni: study.PatientMainDicomTags?.PatientID || "Sin ID",

          studyDate: study.MainDicomTags?.StudyDate || "Sin fecha",

          studyTime: study.MainDicomTags?.StudyTime || "Sin hora",

          Series: series.length,
          seriesCount: series.length,
          instancesCount,
        };
      }),
    );

    return studies;
  } catch (error) {
    console.error(
      "Error fetching studies from Orthanc:",
      error.response?.data || error.message,
    );
    throw new Error("Error al obtener estudios desde Orthanc");
  }
};

// ─────────────────────────────────────────────
// Obtener detalles
// ─────────────────────────────────────────────
export const getStudyDetails = async (orthancId) => {
  try {
    const studyRes = await orthancApi.get(`/studies/${orthancId}`);
    const seriesRes = await orthancApi.get(`/studies/${orthancId}/series`);

    const study = studyRes.data;
    const series = seriesRes.data;

    let previewUrl = null;
    let instancesCount = 0;

    if (series.length > 0) {
      const firstSeries = series[0];

      const instancesRes = await orthancApi.get(
        `/series/${firstSeries.ID}/instances`,
      );

      const instances = instancesRes.data;
      instancesCount = instances.length;

      if (instances.length > 0) {
        previewUrl = `${ORTHANC_PROXY_PUBLIC_PREFIX}/instances/${instances[0].ID}/preview`;
      }
    }

    return {
      orthancId: study.ID,

      // 🧠 DICOM REAL (COMPLETO)
      patientName: study.PatientMainDicomTags?.PatientName || "Sin nombre",

      patientDni: study.PatientMainDicomTags?.PatientID || "Sin ID",

      studyDate: study.MainDicomTags?.StudyDate || "Sin fecha",

      studyInstanceUid: study.MainDicomTags?.StudyInstanceUID || study.ID,

      // ✅ PRIORIDAD CORRECTA
      type:
        study.MainDicomTags?.StudyDescription ||
        study.MainDicomTags?.Modality ||
        "Sin tipo",

      StudyDescription:
        study.MainDicomTags?.StudyDescription || "Sin descripción",

      previewUrl,
      seriesCount: series.length,
      instancesCount,
      series,
    };
  } catch (error) {
    console.error(
      "Error fetching study details:",
      error.response?.data || error.message,
    );
    throw new Error("Error al obtener detalles del estudio");
  }
};

// ─────────────────────────────────────────────
export const getPreviewUrl = (instanceId) => {
  return `${ORTHANC_PROXY_PUBLIC_PREFIX}/instances/${instanceId}/preview`;
};

// ─────────────────────────────────────────────
export const checkOrthancConnection = async () => {
  try {
    const response = await orthancApi.get("/system", { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error("Orthanc connection error:", error.message);
    return false;
  }
};

// ─────────────────────────────────────────────
export const getPatientInfo = async (patientId) => {
  try {
    const response = await orthancApi.get(`/patients/${patientId}`);
    const patient = response.data;

    return {
      orthancPatientId: patient.ID,
      patientName: patient.MainDicomTags?.PatientName,
      patientId: patient.MainDicomTags?.PatientID,
      birthDate: patient.MainDicomTags?.PatientBirthDate,
    };
  } catch (error) {
    console.error(
      "Error fetching patient info:",
      error.response?.data || error.message,
    );
    throw new Error("Error al obtener información del paciente");
  }
};
