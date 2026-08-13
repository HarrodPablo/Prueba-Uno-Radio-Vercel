import axios from "axios";

const ORTHANC_URL = process.env.ORTHANC_URL;

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(prefix, ...args) {
  return `${prefix}:${args.join(":")}`;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttl = CACHE_TTL_MS) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

function clearCache(pattern = null) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

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
  const cacheKey = getCacheKey("studies");
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Obtenemos todos los estudios detallados en una sola petición
    const response = await orthancApi.get("/studies?expand=true");
    const expandedStudies = response.data || [];

    if (expandedStudies.length === 0) {
      setCache(cacheKey, []);
      return [];
    }

    const studies = expandedStudies.map((study) => {
      const seriesCount = Array.isArray(study.Series) ? study.Series.length : 0;
      
      return {
        orthancId: study.ID,
        PatientName: study.PatientMainDicomTags?.PatientName || "Sin nombre",
        PatientID: study.PatientMainDicomTags?.PatientID || "Sin ID",
        StudyDate: study.MainDicomTags?.StudyDate || "Sin fecha",
        StudyTime: study.MainDicomTags?.StudyTime || "Sin hora",
        StudyDescription:
          study.MainDicomTags?.StudyDescription || "Sin descripción",
        type:
          study.MainDicomTags?.StudyDescription ||
          study.MainDicomTags?.Modality ||
          "Sin tipo",
        patientName: study.PatientMainDicomTags?.PatientName || "Sin nombre",
        patientDni: study.PatientMainDicomTags?.PatientID || "Sin ID",
        studyDate: study.MainDicomTags?.StudyDate || "Sin fecha",
        studyTime: study.MainDicomTags?.StudyTime || "Sin hora",
        Series: seriesCount,
        seriesCount: seriesCount,
        instancesCount: 0, // No lo necesitamos y ahorramos cientos de peticiones
      };
    });

    setCache(cacheKey, studies);
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
  const cacheKey = getCacheKey("study", orthancId);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Parallel requests for study and series
    const [studyRes, seriesRes] = await Promise.all([
      orthancApi.get(`/studies/${orthancId}`),
      orthancApi.get(`/studies/${orthancId}/series`),
    ]);

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

    const result = {
      orthancId: study.ID,
      patientName: study.PatientMainDicomTags?.PatientName || "Sin nombre",
      patientDni: study.PatientMainDicomTags?.PatientID || "Sin ID",
      studyDate: study.MainDicomTags?.StudyDate || "Sin fecha",
      studyInstanceUid: study.MainDicomTags?.StudyInstanceUID || study.ID,
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

    setCache(cacheKey, result);
    return result;
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
