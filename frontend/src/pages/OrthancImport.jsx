import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { backendOrigin, withOrthancProxyAuth } from "../utils/orthancUrl";

const OrthancImport = () => {
  const { token } = useAuth();
  const [orthancStudies, setOrthancStudies] = useState([]);
  const [orthancLoading, setOrthancLoading] = useState(false);
  const [orthancError, setOrthancError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Función para formatear fecha DICOM (YYYYMMDD)
  const formatDicomDate = (dateString) => {
    if (!dateString || dateString === "Sin fecha") return "N/A";

    if (dateString.length === 8) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      const date = new Date(`${year}-${month}-${day}`);
      return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return dateString;
  };

  // Función para formatear hora DICOM (HHMMSS)
  const formatDicomTime = (timeString) => {
    if (!timeString || timeString === "Sin hora") return "N/A";

    if (timeString.length >= 4) {
      const hours = timeString.substring(0, 2);
      const minutes = timeString.substring(2, 4);
      const seconds =
        timeString.length >= 6 ? timeString.substring(4, 6) : "00";

      return `${hours}:${minutes}${seconds !== "00" ? `:${seconds}` : ""}`;
    }

    return timeString;
  };

  // Función para formatear nombre DICOM (apellido^nombre)
  const formatDicomName = (nameString) => {
    if (!nameString || nameString === "Sin nombre") return "N/A";

    const parts = nameString.split("^");

    if (parts.length >= 2) {
      const lastName = parts[0] || "";
      const firstName = parts[1] || "";

      const cleanLastName = lastName.trim();
      const cleanFirstName = firstName.trim();

      if (cleanLastName && cleanFirstName) {
        return `${cleanFirstName} ${cleanLastName}`;
      } else if (cleanLastName) {
        return cleanLastName;
      } else if (cleanFirstName) {
        return cleanFirstName;
      }
    }

    return nameString;
  };

  // Función para obtener estudios desde Orthanc
  const fetchOrthancStudies = useCallback(async () => {
    try {
      setOrthancLoading(true);
      setOrthancError(null);

      const response = await axios.get("/api/orthanc/studies");

      setOrthancStudies(response.data.data || []);
    } catch (err) {
      console.error("Error fetching Orthanc studies:", err);
      setOrthancError("Error al obtener estudios desde Orthanc");
      toast.error("No se pudo conectar con el servidor PACS", {
        autoClose: 5000,
        position: "top-right",
      });
    } finally {
      setOrthancLoading(false);
    }
  }, []);

  // Cargar estudios al montar el componente
  useEffect(() => {
    fetchOrthancStudies();
  }, [fetchOrthancStudies]);

  // Función para filtrar estudios
  const filteredStudies = orthancStudies.filter((study) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (study.PatientName || study.patientName)
        ?.toLowerCase()
        .includes(searchLower) ||
      study.orthancId?.toLowerCase().includes(searchLower) ||
      (study.StudyDate || study.studyDate)
        ?.toLowerCase()
        .includes(searchLower) ||
      (study.StudyDescription || study.type)
        ?.toLowerCase()
        .includes(searchLower)
    );
  });

  // Función para importar desde Orthanc
  const handleImportFromOrthanc = async (orthancStudy) => {
    try {
      // Crear usuario con datos formateados del DICOM
      const patientDni =
        orthancStudy.PatientID ||
        orthancStudy.patientDni ||
        "AUTO-" + Date.now();

      const payload = {
        name: formatDicomName(orthancStudy.PatientName || orthancStudy.patientName),
        dni: patientDni,
        phone: "0000000000",
        email: "",
        role: "PATIENT",
        password: patientDni,
      };

      let userId;
      let createdUser;
      try {
        const response = await axios.post("/api/users", payload);
        createdUser = response.data;
        userId = createdUser.id;
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || "";
        // Si ya existe, lo buscamos y lo reutilizamos
        if (err?.response?.status === 400 && String(msg).toLowerCase().includes("usuario ya existe")) {
          const existing = await axios.get(
            `/api/users?search=${encodeURIComponent(patientDni)}&limit=1&page=1`,
          );
          const found = existing.data?.users?.find((u) => u.dni === patientDni);
          if (!found) throw err;
          userId = found.id;
          createdUser = found;
        } else {
          throw err;
        }
      }

      // Asignar estudio Orthanc al usuario creado
      await axios.post("/api/orthanc/assign", {
        patientId: userId,
        orthancId: orthancStudy.orthancId,
      });

      // Mostrar mensaje de éxito con credenciales de login
      toast.success(
        `✅ Usuario "${createdUser?.name || payload.name}" listo!\n\n📋 Credenciales de acceso:\n• Usuario: ${patientDni}\n• Contraseña: ${patientDni}`,
        {
          autoClose: 20000, // 20 segundos para dar tiempo de leer
          hideProgressBar: false,
          closeOnClick: false, // No cerrar al hacer clic
          pauseOnHover: true,
          draggable: true,
          position: "top-right", // Esquina superior derecha
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
            fontSize: "14px",
            fontWeight: "bold",
            padding: "16px",
            whiteSpace: "pre-line",
          },
        },
      );

      // Refrescar lista de estudios Orthanc
      fetchOrthancStudies();
    } catch (error) {
      console.error("Error creando usuario desde Orthanc:", error);
      toast.error("Error al crear usuario desde Orthanc", {
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        position: "top-right",
      });
    }
  };

  if (orthancLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="ml-3 text-gray-600">
            Cargando estudios desde Orthanc...
          </p>
        </div>
      </Layout>
    );
  }

  if (orthancError) {
    return (
      <Layout>
        <div className="px-4 py-3 text-red-600 border border-red-200 rounded-md bg-red-50">
          {orthancError}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Importar desde Agfa
              </h1>
              <button
                onClick={fetchOrthancStudies}
                className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Refrescar
              </button>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, ID, fecha o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Tabla de estudios */}
          {orthancStudies.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.297V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">
                No se encontraron estudios en Orthanc
              </p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white rounded-lg shadow">
              {/* Versión Desktop - Tabla */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-quinty">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        💳 DNI
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        👤 NOMBRE
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        📅 Fecha
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        📄 Tipo
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        🧿 Imágenes
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        ⚡ Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudies.map((study) => (
                      <React.Fragment key={study.orthancId}>
                        <tr className="hover:bg-primaryB">
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            <span className="font-mono text-xs">
                              {study.PatientID || study.patientDni || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {formatDicomName(
                              study.PatientName || study.patientName,
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {formatDicomDate(
                              study.StudyDate || study.studyDate,
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {study.StudyDescription || study.type || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            <span className="font-mono text-xs">
                              {study.Series || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                            <button
                              onClick={() => handleImportFromOrthanc(study)}
                              className="px-3 py-1 text-sm text-white transition-colors rounded-md bg-quinty hover:bg-cuarty"
                            >
                              Crear
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Versión Mobile - Cards */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredStudies.map((study) => (
                    <div key={study.orthancId} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {formatDicomName(
                              study.PatientName || study.patientName,
                            )}
                          </h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">DNI:</span>{" "}
                              <span className="font-mono text-xs">
                                {study.PatientID || study.patientDni || "N/A"}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Fecha:</span>{" "}
                              {formatDicomDate(
                                study.StudyDate || study.studyDate,
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Hora:</span>{" "}
                              {formatDicomTime(
                                study.StudyTime || study.studyTime,
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Tipo:</span>{" "}
                              {study.StudyDescription || study.type || "N/A"}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Imágenes:</span>{" "}
                              <span className="font-mono text-xs">
                                {study.Series || "N/A"}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="ml-4">
                          {study.previewUrl ? (
                            <img
                              src={withOrthancProxyAuth(
                                `${backendOrigin()}${study.previewUrl}`,
                                token,
                              )}
                              alt={`Preview de ${study.patientName}`}
                              className="object-cover w-16 h-16 rounded-lg"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="items-center justify-center w-16 h-16 text-gray-400 bg-gray-100 rounded-lg"
                            style={{
                              display: study.previewUrl ? "none" : "flex",
                            }}
                          >
                            <svg
                              className="w-8 h-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="flex pt-3 space-x-3 border-t border-gray-100">
                        <button
                          onClick={() => handleImportFromOrthanc(study)}
                          className="flex-1 px-3 py-2 text-white transition-colors rounded-md bg-quinty hover:bg-cuarty"
                        >
                          Crear
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={8000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        limit={3}
      />
    </Layout>
  );
};

export default OrthancImport;
