import { prisma } from "../lib/prisma.js";
import { orthancApi } from "./orthancService.js";

const STATIC_EXT =
  /\.(js|mjs|cjs|css|map|json|wasm|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i;

function isStoneViewerStatic(orthancPath) {
  return (
    orthancPath.includes("/stone-webviewer/") && STATIC_EXT.test(orthancPath)
  );
}

/**
 * Comprueba si un paciente puede acceder a un recurso de Orthanc vía proxy.
 */
export async function patientCanAccessOrthancPath(req) {
  const { user } = req;
  if (!user || user.role !== "PATIENT") return true;

  const raw = req.originalUrl || req.url || "";
  const u = new URL(raw, "http://internal");
  let pathname = u.pathname || "";
  const pacsIdx = pathname.indexOf("/pacs");
  if (pacsIdx !== -1) {
    pathname = pathname.slice(pacsIdx + "/pacs".length) || "/";
  }
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  if (isStoneViewerStatic(pathname)) return true;

  const studyParam = u.searchParams.get("study");
  const studyUidFromDicomWeb =
    u.searchParams.get("0020000D") || u.searchParams.get("StudyInstanceUID");

  // Allow minimal readonly system endpoint needed by Stone viewer
  if (pathname === "/system") return true;

  if (
    pathname.includes("stone-webviewer") &&
    pathname.endsWith(".html") &&
    studyParam
  ) {
    const study = await prisma.study.findFirst({
      where: {
        patientId: user.id,
        OR: [{ studyInstanceUid: studyParam }, { orthancId: studyParam }],
      },
    });
    return !!study;
  }

  // DICOMweb endpoints used by Stone viewer: authorize by StudyInstanceUID (0020000D)
  if (pathname.startsWith("/dicom-web/")) {
    // Some DICOMweb calls pass the StudyInstanceUID in the path:
    // /dicom-web/studies/{StudyInstanceUID}/...
    const dicomWebParts = pathname.split("/").filter(Boolean);
    const studyUidFromPath =
      dicomWebParts[1] === "studies" && dicomWebParts[2]
        ? decodeURIComponent(dicomWebParts[2])
        : null;

    const uid = studyUidFromDicomWeb || studyUidFromPath;
    if (!uid) return false;
    const study = await prisma.study.findFirst({
      where: {
        patientId: user.id,
        OR: [{ studyInstanceUid: uid }],
      },
      select: { id: true },
    });
    return !!study;
  }

  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "instances" && parts[1]) {
    return patientOwnsInstance(user.id, parts[1]);
  }
  if (parts[0] === "series" && parts[1]) {
    return patientOwnsSeries(user.id, parts[1]);
  }
  if (parts[0] === "studies" && parts[1]) {
    return patientOwnsStudyOrthancId(user.id, parts[1]);
  }

  if (pathname.includes("/stone-webviewer/") && !STATIC_EXT.test(pathname)) {
    return !!studyParam;
  }

  return false;
}

async function patientOwnsStudyOrthancId(patientId, orthancStudyId) {
  try {
    const st = await orthancApi.get(`/studies/${orthancStudyId}`);
    const uid = st.data.MainDicomTags?.StudyInstanceUID;
    const study = await prisma.study.findFirst({
      where: {
        patientId,
        OR: [
          { orthancId: orthancStudyId },
          ...(uid ? [{ studyInstanceUid: uid }] : []),
        ],
      },
    });
    return !!study;
  } catch {
    return false;
  }
}

async function patientOwnsSeries(patientId, seriesId) {
  try {
    const s = await orthancApi.get(`/series/${seriesId}`);
    const studyOrthancId = s.data.ParentStudy;
    if (!studyOrthancId) return false;
    return patientOwnsStudyOrthancId(patientId, studyOrthancId);
  } catch {
    return false;
  }
}

async function patientOwnsInstance(patientId, instanceId) {
  try {
    const i = await orthancApi.get(`/instances/${instanceId}`);
    const seriesId = i.data.ParentSeries;
    if (!seriesId) return false;
    return patientOwnsSeries(patientId, seriesId);
  } catch {
    return false;
  }
}
