import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import DicomViewer from "../components/DicomViewer";
import Layout from "../components/Layout";

const AdminStudies = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [uploadData, setUploadData] = useState({
    patientDni: "",
    type: "", // Campo vacío para que el administrador escriba
    date: new Date().toISOString().split("T")[0],
    notes: "",
    imageFiles: [], // Cambiado de imageFile a imageFiles (array)
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    dateFrom: "",
    dateTo: "",
    onlyWithoutReports: false,
  });
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  const debounceTimerRef = useRef(null);

  const fetchUnifiedData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/unified?${params}`);
      setItems(response.data.items);
      setPagination(response.data.pagination);
      setSummary(response.data.summary);
    } catch (err) {
      setError("Error al cargar los datos");
      console.error("Error fetching unified data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUnifiedData();
  }, [fetchUnifiedData]);

  // Cleanup del timer cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounce para la búsqueda
  const handleSearchChange = (value) => {
    setSearchInput(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value, page: 1 }));
    }, 500);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get("/api/users?role=PATIENT");
      setUsers(response.data.users);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    try {
      let patientId;
      let isUpdate = false;
      let studyId = null;

      // Si es un paciente sin estudios, usar el ID directamente
      if (selectedStudy?.type === "patient") {
        patientId = selectedStudy.patientId;
      } else if (selectedStudy) {
        // Si es un estudio existente, usar el ID del paciente del estudio
        patientId = selectedStudy.patientId;
        isUpdate = true;
        studyId = selectedStudy.studyId;
      } else {
        // Si es un nuevo estudio, buscar por DNI
        const patient = users.find((u) => u.dni === uploadData.patientDni);
        if (!patient) {
          alert("Paciente no encontrado");
          return;
        }
        patientId = patient.id;
      }

      const formData = new FormData();
      formData.append("patientId", patientId); // Siempre enviar patientId
      formData.append("type", uploadData.type);
      formData.append("date", uploadData.date);
      formData.append("notes", uploadData.notes);

      // Agregar múltiples archivos
      if (uploadData.imageFiles && uploadData.imageFiles.length > 0) {
        uploadData.imageFiles.forEach((file) => {
          formData.append(`images`, file); // Mismo nombre para todos los archivos
        });
      }

      let response;
      if (isUpdate && studyId) {
        // Actualizar estudio existente
        response = await axios.put(`/api/studies/${studyId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // Crear nuevo estudio
        response = await axios.post("/api/studies", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      // Mostrar toast de éxito
      toast.success("✅ Radiografía subida correctamente");

      setShowUploadModal(false);
      setSelectedStudy(null);
      setUploadData({
        patientDni: "",
        type: "", // Campo vacío para que el administrador escriba
        date: new Date().toISOString().split("T")[0],
        notes: "",
        imageFiles: [], // Resetear array de archivos
      });
      fetchUnifiedData();
    } catch (err) {
      console.error("Error uploading study:", err);
      toast.error("❌ Error al subir el estudio", {
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        position: "top-right",
        style: {
          background: "linear-gradient(to right, #ff416c, #ff4b2b)",
          fontSize: "14px",
          fontWeight: "bold",
          padding: "12px",
        },
      });
    }
  };

  const handleViewImage = (studyId) => {
    if (studyId) {
      setSelectedStudy({ studyId });
      setShowImageViewer(true);
    } else {
      toast.error("❌ Este estudio no tiene imagen disponible", {
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        position: "top-right",
        style: {
          background: "linear-gradient(to right, #ff416c, #ff4b2b)",
          fontSize: "14px",
          fontWeight: "bold",
          padding: "12px",
        },
      });
    }
  };

  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setSelectedStudy(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    // Ajustar para evitar problemas de zona horaria
    const localDate = new Date(
      date.getTime() + date.getTimezoneOffset() * 60000,
    );

    return localDate.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="px-4 py-3 text-red-600 border border-red-200 rounded-md bg-red-50">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full mx-auto max-w-7xl">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            🏥 Gestión de Estudios - Administrador
          </h1>

          {/* Resumen 
          {summary && (
            <div className="p-4 mb-6 rounded-lg shadow bg-blue-50">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Resumen General
              </h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.totalPatients}
                  </div>
                  <div className="text-sm text-gray-600">Total Pacientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.withStudies}
                  </div>
                  <div className="text-sm text-gray-600">Con Estudios</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.withoutStudies}
                  </div>
                  <div className="text-sm text-gray-600">Sin Estudios</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {summary.withReports}
                  </div>
                  <div className="text-sm text-gray-600">Con Informes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {summary.withoutReports}
                  </div>
                  <div className="text-sm text-gray-600">Sin Informes</div>
                </div>
              </div>
            </div>
          )}*/}

          {/* Filtros 
          <div className="p-4 mb-6 rounded-lg shadow bg-quinty">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">
                  🔍 Buscar pacientes
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">
                  📅 Fecha desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">
                  📅 Fecha hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">
                  📄 Solo sin informes
                </label>
                <select
                  value={filters.onlyWithoutReports}
                  onChange={(e) =>
                    handleFilterChange("onlyWithoutReports", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={false}>Todos los estudios</option>
                  <option value={true}>Solo sin informes</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() =>
                    setFilters({
                      page: 1,
                      limit: 10,
                      search: "",
                      dateFrom: "",
                      dateTo: "",
                      onlyWithoutReports: false,
                    })
                  }
                  className="w-full px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  🔄 Limpiar filtros
                </button>
              </div>
            </div>
          </div>*/}

          {/* Tabla Unificada */}
          <div className="overflow-hidden bg-white rounded-lg shadow">
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500">
                  No se encontraron pacientes, estudios o informes
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-quinty">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        👤 Paciente
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        📅 Fecha
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        🏥 Tipo de Estudio
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        👨‍⚕️ Doctor
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        📄 Informe
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        ⚡ Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 ${
                          item.type === "patient" ? "bg-orange-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          <div className="font-medium text-center">
                            {item.patientName}
                          </div>
                          <div className="text-center text-gray-500">
                            DNI: {item.patientDni}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {item.studyDate ? formatDate(item.studyDate) : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {item.type === "patient" ? (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-center text-orange-800 bg-orange-100 rounded-full">
                              {item.studyType}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-center text-blue-800 bg-blue-100 rounded-full">
                              {item.studyType}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {item.doctorName}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {item.hasReport ? (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-center text-green-800 bg-green-100 rounded-full">
                              ✓ Con informe
                            </span>
                          ) : (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-center text-red-800 bg-red-100 rounded-full">
                              Sin informe
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {item.type === "patient" ? (
                            <button
                              onClick={() => {
                                setSelectedStudy(item);
                                setShowUploadModal(true);
                              }}
                              className="font-medium text-green-600 hover:text-green-900"
                              title="Subir radiografía"
                            >
                              📤 Subir Radiografía
                            </button>
                          ) : (
                            <div className="flex justify-center space-x-2">
                              {item.imageUrl && (
                                <button
                                  onClick={() => handleViewImage(item.studyId)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Ver imagen"
                                >
                                  👁️ Ver
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedStudy(item);
                                  setShowUploadModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Actualizar radiografía"
                              >
                                📤 Subir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginación */}
          {pagination && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Mostrando {items.length} de {pagination.total} resultados
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    handleFilterChange("page", pagination.page - 1)
                  }
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md bg-cuarty disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-1">
                  Página {pagination.page} de {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    handleFilterChange("page", pagination.page + 1)
                  }
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded-md bg-cuarty disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Modal de Subida */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-full max-w-md p-6 bg-white rounded-lg">
                <h3 className="mb-4 text-lg font-semibold">
                  {selectedStudy?.type === "patient"
                    ? `Subir Radiografía para: ${selectedStudy.patientName}`
                    : selectedStudy
                      ? `Actualizar Radiografía para: ${selectedStudy.patientName}`
                      : "Subir Nueva Radiografía"}
                </h3>
                <form onSubmit={handleUploadSubmit}>
                  {selectedStudy?.type === "patient" ? (
                    <div className="p-3 mb-4 rounded-md bg-blue-50">
                      <p className="text-sm text-sexty">
                        <strong>Paciente:</strong> {selectedStudy.patientName}
                        <br />
                        <strong>DNI:</strong> {selectedStudy.patientDni}
                        <br />
                        <strong>Estado:</strong> Sin estudios previos
                      </p>
                    </div>
                  ) : selectedStudy ? (
                    <div className="p-3 mb-4 rounded-md bg-green-50">
                      <p className="text-sm text-green-800">
                        <strong>Paciente:</strong> {selectedStudy.patientName}
                        <br />
                        <strong>DNI:</strong> {selectedStudy.patientDni}
                        <br />
                        <strong>Estudio actual:</strong>{" "}
                        {selectedStudy.studyType}
                        <br />
                        <strong>Fecha:</strong>{" "}
                        {selectedStudy.studyDate
                          ? formatDate(selectedStudy.studyDate)
                          : "N/A"}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        DNI del Paciente
                      </label>
                      <input
                        type="text"
                        value={uploadData.patientDni}
                        onChange={(e) =>
                          setUploadData({
                            ...uploadData,
                            patientDni: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Tipo de Estudio
                    </label>
                    <textarea
                      value={uploadData.type}
                      onChange={(e) =>
                        setUploadData({ ...uploadData, type: e.target.value })
                      }
                      placeholder="Ej: RX General, RX Tórax, TC Craneal, RMN Columna, Ecografía Abdominal..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-quinty focus:border-quinty"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={uploadData.date}
                      onChange={(e) =>
                        setUploadData({ ...uploadData, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-quinty focus:border-quinty"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Archivos de Imagen (múltiples)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.dcm"
                      multiple
                      onChange={(e) =>
                        setUploadData({
                          ...uploadData,
                          imageFiles: Array.from(e.target.files),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-quinty focus:border-quinty"
                    />
                    {uploadData.imageFiles &&
                      uploadData.imageFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            {uploadData.imageFiles.length} archivo(s)
                            seleccionado(s):
                          </p>
                          <div className="mt-1 overflow-y-auto border border-gray-200 rounded max-h-24">
                            {uploadData.imageFiles.map((file, index) => (
                              <p
                                key={index}
                                className="px-2 py-1 text-xs text-gray-500 truncate"
                                title={file.name}
                              >
                                • {file.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Notas
                    </label>
                    <textarea
                      value={uploadData.notes}
                      onChange={(e) =>
                        setUploadData({ ...uploadData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-quinty focus:border-quinty"
                      rows="3"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      {selectedStudy ? "Actualizar" : "Subir"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedStudy(null);
                        setUploadData({
                          patientDni: "",
                          type: "", // Campo vacío para que el administrador escriba
                          date: new Date().toISOString().split("T")[0],
                          notes: "",
                          imageFiles: [], // Resetear array de archivos
                        });
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 transition-colors bg-gray-300 rounded-md hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Visualizador de Imágenes */}
          {showImageViewer && (
            <DicomViewer
              studyId={selectedStudy?.studyId}
              onClose={handleCloseImageViewer}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminStudies;
