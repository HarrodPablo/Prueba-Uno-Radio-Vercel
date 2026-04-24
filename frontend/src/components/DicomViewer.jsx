// DicomViewer.jsx — Stone Web Viewer vía proxy del backend (sin credenciales Orthanc en el cliente)
// --------------------------------------------------------------
import axios from "axios";
import { useEffect, useState } from "react";
import icon from "../assets/img/loogo.png";
import { useAuth } from "../context/AuthContext";
import { backendOrigin, withOrthancProxyAuth } from "../utils/orthancUrl";

const DicomViewer = ({
  studyId,
  studyInstanceUid: studyInstanceUidProp = null,
  notes: studyNotes = "",
  userRole = "PATIENT",
  onClose,
}) => {
  const { token } = useAuth();
  const [studyData, setStudyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orthancId, setOrthancId] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);

  const buildStoneUrl = (uid) => {
    if (!token) return null;
    const path = `/api/orthanc/pacs/stone-webviewer/index.html?study=${encodeURIComponent(uid)}`;
    return withOrthancProxyAuth(`${backendOrigin()}${path}`, token);
  };
  useEffect(() => {
    if (!studyId) return;

    const loadStudyForViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        if (studyInstanceUidProp) {
          const finalUrl = buildStoneUrl(studyInstanceUidProp);
          if (!finalUrl) {
            setError("Sesión no válida para cargar el visor.");
            return;
          }
          setViewerUrl(finalUrl);
          return;
        }

        const response = await axios.get(`/api/unified`);
        const study = response.data.items.find(
          (item) => item.studyId === studyId,
        );
        if (!study) {
          setError("No se encontró el estudio.");
          return;
        }
        const identifier = study.studyInstanceUid || study.orthancId;
        if (!identifier) {
          setError("Este estudio no tiene identificadores DICOM válidos.");
          return;
        }
        const finalUrl = buildStoneUrl(identifier);
        if (!finalUrl) {
          setError("Sesión no válida para cargar el visor.");
          return;
        }
        setOrthancId(study.orthancId);
        setViewerUrl(finalUrl);
        setStudyData(study);
      } catch (err) {
        console.error("Error loading study:", err);
        setError("Error de conexión con el servidor de imágenes.");
      } finally {
        setLoading(false);
      }
    };

    loadStudyForViewer();
  }, [studyId, token]);

  const refreshViewer = () => {
    const id = studyInstanceUidProp || studyData?.studyInstanceUid || orthancId;
    if (id) {
      setViewerUrl(null);
      setTimeout(() => setViewerUrl(buildStoneUrl(id)), 100);
    }
  };

  if (!studyId) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-shrink-0 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img src={icon} alt="DICOM" className="w-10 h-10" />
          <h3 className="text-sm font-semibold text-white">
            Visor diagnostico por imagenes López
          </h3>
          {/*-orthancId && (
            <p className="text-gray-400 text-[10px] uppercase tracking-wider">
              ID Interno: {orthancId}
            </p>
          )*/}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshViewer}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded hover:border-gray-700 transition-colors"
          >
            Refrescar
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="relative flex items-center justify-center flex-1 overflow-hidden bg-black">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">Cargando visor DICOM...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black">
            <div className="text-center">
              <div className="mb-4 text-4xl">:</div>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {viewerUrl && !loading && (
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            allowFullScreen
          />
        )}
      </div>

      {/* SIDEBAR */}
      <div className="flex-col hidden gap-6 p-5 overflow-y-auto bg-gray-900 border-l border-gray-800 lg:flex w-72">
        {studyData && (
          <section>
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
              Información del Estudio
            </p>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Paciente:</span>
                <span className="font-medium text-white">
                  {studyData.patientName || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">DNI:</span>
                <span className="text-[10px] text-gray-500 uppercase">
                  {studyData.PatientID || studyData.patientDni || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fecha:</span>
                <span className="text-[10px] text-gray-500 uppercase">
                  {studyData.studyDate
                    ? new Date(studyData.studyDate).toLocaleDateString("es-AR")
                    : "N/A"}
                </span>
              </div>
            </div>
          </section>
        )}

        {userRole !== "PATIENT" && (
          <section>
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
              Notas Médicas
            </p>
            <div className="p-3 text-xs italic leading-relaxed text-gray-400 border border-gray-700 rounded-lg bg-gray-800/50">
              {studyNotes || "Sin notas disponibles"}
            </div>
          </section>
        )}

        <div className="pt-6 mt-auto border-t border-gray-800">
          <p className="text-xs leading-tight text-gray-600">
            Utilice el mouse para ajustar brillo (W/L) y zoom.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DicomViewer;
