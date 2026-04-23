import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
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
  const [viewMode, setViewMode] = useState("pending"); // "pending" o "completed"
  const [completedStudies, setCompletedStudies] = useState([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [existingPatients, setExistingPatients] = useState(new Set()); // Track existing patients by DNI:orthancId

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

      const studies = response.data.data || [];
      setOrthancStudies(studies);
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

  // Función para obtener estudios completados
  const fetchCompletedStudies = useCallback(async () => {
    try {
      setCompletedLoading(true);
      const response = await axios.get("/api/studies?status=COMPLETED");
      const studies = response.data.studies || response.data.items || [];
      setCompletedStudies(studies);

      // Verificar específicamente si nuestro estudio está en la lista
      const targetStudyId = "fc06fc2d-aa48f087-c3dd986b-455a88aa-7f9b72ef";
      const foundInCompleted = studies.some(
        (s) => s.orthancId === targetStudyId,
      );
    } catch (err) {
      console.error("Error fetching completed studies:", err);
    } finally {
      setCompletedLoading(false);
    }
  }, []);

  // Cargar datos específicos cuando cambia viewMode
  useEffect(() => {
    if (viewMode === "completed") {
      fetchCompletedStudies();
    }
  }, [viewMode, fetchCompletedStudies]);

  // Cargar estudios al montar el componente
  useEffect(() => {
    fetchOrthancStudies();
    fetchCompletedStudies();
  }, [fetchOrthancStudies, fetchCompletedStudies]);

  // Verificar pacientes existentes solo al cargar los estudios por primera vez
  useEffect(() => {
    if (orthancStudies.length > 0 && existingPatients.size === 0) {
      checkExistingPatients(orthancStudies);
    }
  }, [orthancStudies, existingPatients.size]);

  // Función para filtrar y ordenar estudios
  const filteredStudies = orthancStudies
    .filter((study) => {
      const patientDni = study.PatientID || study.patientDni;
      const uniqueKey = `${patientDni}:${study.orthancId}`;
      const hasExistingPatient = existingPatients.has(uniqueKey);
      const searchLower = searchTerm.toLowerCase();

      // Primero filtrar por búsqueda
      const matchesSearch =
        (study.PatientName || study.patientName)
          ?.toLowerCase()
          .includes(searchLower) ||
        study.orthancId?.toLowerCase().includes(searchLower) ||
        (study.StudyDate || study.studyDate)
          ?.toLowerCase()
          .includes(searchLower) ||
        (study.StudyDescription || study.type)
          ?.toLowerCase()
          .includes(searchLower);

      // Luego filtrar para no mostrar estudios ya completados
      const isAlreadyCompleted = completedStudies.some(
        (completedStudy) => completedStudy.orthancId === study.orthancId,
      );

      return matchesSearch && !isAlreadyCompleted;
    })
    .sort((a, b) => {
      // Ordenar por fecha de estudio (más reciente primero)
      const dateA = a.StudyDate || a.studyDate || "";
      const dateB = b.StudyDate || b.studyDate || "";

      // Convertir fecha DICOM (YYYYMMDD) a Date para comparación
      const convertDicomDate = (dateString) => {
        if (!dateString || dateString.length !== 8) return new Date(0);
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return new Date(`${year}-${month}-${day}`);
      };

      const dateAObj = convertDicomDate(dateA);
      const dateBObj = convertDicomDate(dateB);

      // Orden descendente (más reciente primero)
      return dateBObj - dateAObj;
    });

  // Función para verificar todos los pacientes existentes
  const checkExistingPatients = async (studies) => {
    const existing = new Set();

    for (const study of studies) {
      const patientDni = study.PatientID || study.patientDni;
      if (!patientDni) continue;

      try {
        const response = await axios.get(
          `/api/users?search=${encodeURIComponent(patientDni)}&limit=10&page=1`,
        );

        const found = response.data?.users?.find((u) => u.dni === patientDni);
        if (found) {
          const uniqueKey = `${patientDni}:${study.orthancId}`;
          existing.add(uniqueKey);
        }
      } catch (error) {
        console.error(`Error verificando paciente ${patientDni}:`, error);
      }
    }

    setExistingPatients(existing);
  };

  // Función para verificar si paciente ya existe
  const checkPatientExists = async (orthancStudy) => {
    const patientDni = orthancStudy.PatientID || orthancStudy.patientDni;
    if (!patientDni) return false;

    try {
      const response = await axios.get(
        `/api/users?search=${encodeURIComponent(patientDni)}&limit=10&page=1`,
      );

      const found = response.data?.users?.find((u) => u.dni === patientDni);
      return !!found;
    } catch (error) {
      console.error("Error verificando si paciente existe:", error);
      return false;
    }
  };

  // Función para marcar estudio como completado
  const handleMarkAsCompleted = async (study) => {
    try {
      // Solo marcar el estudio como completado (no crear usuario)
      const response = await axios.patch(
        `/api/studies/${study.orthancId}/status`,
        {
          status: "COMPLETED",
        },
      );

      toast.success("Estudio marcado como LISTO/CREADO", {
        autoClose: 3000,
        position: "top-right",
      });

      // Refrescar solo completedStudies (sin volver a verificar pacientes existentes)

      // Pequeño delay para asegurar que el backend actualizó los datos
      setTimeout(() => {
        fetchCompletedStudies();

        // También refrescar orthancStudies para que el estudio marcado desaparezca de pendientes
        // pero SIN volver a verificar pacientes existentes
        setOrthancStudies((prev) =>
          prev.filter((s) => s.orthancId !== study.orthancId),
        );

        // Actualizar el estado de pacientes existentes para mantener consistencia
        const patientDni = study.PatientID || study.patientDni;
        if (patientDni) {
          const uniqueKey = `${patientDni}:${study.orthancId}`;
          setExistingPatients((prev) => new Set([...prev, uniqueKey]));
        }
      }, 500);
    } catch (error) {
      console.error("Error marking study as completed:", error);
      toast.error("Error al marcar estudio como completado", {
        autoClose: 5000,
        position: "top-right",
      });
    }
  };

  // Función para importar desde Orthanc
  const handleImportFromOrthanc = async (orthancStudy) => {
    // Prevenir múltiples ejecuciones simultáneas
    if (orthancStudy.importing) {
      return;
    }

    // Marcar como importando
    orthancStudy.importing = true;
    try {
      // Crear usuario con datos formateados del DICOM
      const patientDni =
        orthancStudy.PatientID ||
        orthancStudy.patientDni ||
        "AUTO-" + Date.now();

      const payload = {
        name: formatDicomName(
          orthancStudy.PatientName || orthancStudy.patientName,
        ),
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
        if (
          err?.response?.status === 400 &&
          (String(msg).toLowerCase().includes("usuario ya existe") ||
            String(msg).toLowerCase().includes("already exists") ||
            String(msg).toLowerCase().includes("dni"))
        ) {
          const existing = await axios.get(
            `/api/users?search=${encodeURIComponent(patientDni)}&limit=1&page=1`,
          );
          const found = existing.data?.users?.find((u) => u.dni === patientDni);
          if (!found) {
            // Si no encontramos por búsqueda, intentamos buscar directamente por DNI
            try {
              const directSearch = await axios.get(
                `/api/users?search=${patientDni}&limit=10&page=1`,
              );
              const directFound = directSearch.data?.users?.find(
                (u) => u.dni === patientDni,
              );
              if (directFound) {
                userId = directFound.id;
                createdUser = directFound;
              } else {
                throw err;
              }
            } catch (searchErr) {
              throw err;
            }
          } else {
            userId = found.id;
            createdUser = found;
          }
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
        `Usuario "${createdUser?.name || payload.name}" listo!\n\nCredenciales de acceso:\nUsuario: ${patientDni}\nContraseña: ${patientDni}`,
      );

      // Actualizar el estado de pacientes existentes para habilitar el botón LISTO
      if (patientDni) {
        const uniqueKey = `${patientDni}:${orthancStudy.orthancId}`;
        setExistingPatients((prev) => new Set([...prev, uniqueKey]));
      }
    } catch (error) {
      console.error("Error creando usuario desde Orthanc:", error);
      toast.error("Error al crear usuario desde Orthanc", {
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        position: "top-right",
      });
    } finally {
      // Limpiar bandera de importación
      orthancStudy.importing = false;
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
                {viewMode === "pending"
                  ? "Importar desde Agfa"
                  : "Estudios LISTO/CREADO"}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={
                    viewMode === "pending"
                      ? fetchOrthancStudies
                      : fetchCompletedStudies
                  }
                  className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Refrescar
                </button>
                <button
                  onClick={() => {
                    setViewMode("pending");
                  }}
                  className={`px-4 py-2 transition-colors rounded-md ${
                    viewMode === "pending"
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Pendientes
                </button>

                <button
                  onClick={() => {
                    setViewMode("completed");
                  }}
                  className={`px-4 py-2 transition-colors rounded-md ${
                    viewMode === "completed"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  LISTO
                </button>
              </div>
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
          {viewMode === "pending" && orthancStudies.length === 0 ? (
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
                No se encontraron estudios pendientes en Orthanc
              </p>
            </div>
          ) : viewMode === "completed" && completedStudies.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-green-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">
                No hay estudios marcados como LISTO/CREADO
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
                        <span className="font-mono text-xs">DNI</span>
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        <span className="font-mono text-xs">Nombre</span>
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        <span className="font-mono text-xs">Fecha</span>
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        <span className="font-mono text-xs">Tipo</span>
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        <span className="font-mono text-xs">Imágenes</span>
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        <span className="font-mono text-xs">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(viewMode === "pending"
                      ? filteredStudies
                      : completedStudies
                    ).map((study, index) => (
                      <React.Fragment
                        key={`${viewMode}-desktop-${study.orthancId}-${index}`}
                      >
                        <tr className="hover:bg-primaryB">
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            <span className="font-mono text-xs">
                              {viewMode === "pending"
                                ? study.PatientID || study.patientDni || "N/A"
                                : study.patient?.dni || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {viewMode === "pending"
                              ? formatDicomName(
                                  study.PatientName || study.patientName,
                                )
                              : study.patient?.name || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {viewMode === "pending"
                              ? formatDicomDate(
                                  study.StudyDate || study.studyDate,
                                )
                              : study.date
                                ? new Date(study.date).toLocaleDateString(
                                    "es-AR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    },
                                  )
                                : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {viewMode === "pending"
                              ? study.StudyDescription || study.type || "N/A"
                              : study.type || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            <span className="font-mono text-xs">
                              {
                                viewMode === "pending"
                                  ? study.Series || "N/A"
                                  : "1" // Estudios completados siempre tienen al menos 1 imagen
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                            {viewMode === "pending" ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleImportFromOrthanc(study)}
                                  className="px-3 py-1 text-sm text-white transition-colors rounded-md bg-quinty hover:bg-cuarty"
                                  disabled={existingPatients.has(
                                    `${study.PatientID || study.patientDni}:${study.orthancId}`,
                                  )}
                                >
                                  Crear
                                </button>
                                <button
                                  onClick={() => handleMarkAsCompleted(study)}
                                  className={`px-3 py-1 text-sm text-white transition-colors rounded-md ${
                                    existingPatients.has(
                                      `${study.PatientID || study.patientDni}:${study.orthancId}`,
                                    )
                                      ? "bg-green-600 hover:bg-green-700"
                                      : "bg-gray-400 cursor-not-allowed"
                                  }`}
                                  disabled={
                                    !existingPatients.has(
                                      `${study.PatientID || study.patientDni}:${study.orthancId}`,
                                    )
                                  }
                                >
                                  ✅ LISTO
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-septy">
                                Completado
                              </span>
                            )}
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
                  {(viewMode === "pending"
                    ? filteredStudies
                    : completedStudies
                  ).map((study, index) => (
                    <div
                      key={`${viewMode}-mobile-${study.orthancId}-${index}`}
                      className="p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {viewMode === "pending"
                              ? formatDicomName(
                                  study.PatientName || study.patientName,
                                )
                              : study.patient?.name || "N/A"}
                          </h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">DNI:</span>{" "}
                              <span className="font-mono text-xs">
                                {viewMode === "pending"
                                  ? study.PatientID || study.patientDni || "N/A"
                                  : study.patient?.dni || "N/A"}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Fecha:</span>{" "}
                              {viewMode === "pending"
                                ? formatDicomDate(
                                    study.StudyDate || study.studyDate,
                                  )
                                : study.date
                                  ? new Date(study.date).toLocaleDateString(
                                      "es-AR",
                                      {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      },
                                    )
                                  : "N/A"}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Hora:</span>{" "}
                              {
                                viewMode === "pending"
                                  ? formatDicomTime(
                                      study.StudyTime || study.studyTime,
                                    )
                                  : "N/A" // Estudios completados no tienen hora específica
                              }
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Tipo:</span>{" "}
                              {viewMode === "pending"
                                ? study.StudyDescription || study.type || "N/A"
                                : study.type || "N/A"}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Imágenes:</span>{" "}
                              <span className="font-mono text-xs">
                                {
                                  viewMode === "pending"
                                    ? study.Series || "N/A"
                                    : "1" // Estudios completados siempre tienen al menos 1 imagen
                                }
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
                      {viewMode === "pending" ? (
                        <div className="flex pt-3 space-x-3 border-t border-gray-100">
                          <button
                            onClick={() => handleImportFromOrthanc(study)}
                            className={`flex-1 px-3 py-2 text-white transition-colors rounded-md ${
                              existingPatients.has(
                                `${study.PatientID || study.patientDni}:${study.orthancId}`,
                              )
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-quinty hover:bg-cuarty"
                            }`}
                            disabled={existingPatients.has(
                              `${study.PatientID || study.patientDni}:${study.orthancId}`,
                            )}
                          >
                            Crear
                          </button>
                          <button
                            onClick={() => handleMarkAsCompleted(study)}
                            className={`flex-1 px-3 py-2 text-white transition-colors rounded-md ${
                              existingPatients.has(
                                `${study.PatientID || study.patientDni}:${study.orthancId}`,
                              )
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-400 cursor-not-allowed"
                            }`}
                            disabled={
                              !existingPatients.has(
                                `${study.PatientID || study.patientDni}:${study.orthancId}`,
                              )
                            }
                          >
                            LISTO
                          </button>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="text-sm font-medium text-center text-gray-500">
                            Completado
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrthancImport;
