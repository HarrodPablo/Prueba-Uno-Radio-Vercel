import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const Unified = () => {
  console.log("Unified component - mounting"); // Debug
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [reportContent, setReportContent] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    onlyMyStudies: false,
    onlyWithoutReports: false,
  });
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  const { user } = useAuth();
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    console.log("Unified component - cleanup on unmount");
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const fetchUnifiedData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/unified?${params}`);
      setItems(response.data.items || []);
      setPagination(response.data.pagination);
      setSummary(response.data.summary);
    } catch (err) {
      console.error("Error fetching unified data:", err);
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    console.log("Unified - useEffect triggered, calling fetchUnifiedData");
    fetchUnifiedData().catch((err) => {
      console.error("Unified - Error in useEffect:", err);
      setError("Error al cargar los datos iniciales");
    });
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

    // Limpiar el timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Configurar nuevo timer
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

  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/reports", {
        content: reportContent,
        studyId: selectedStudy.studyId,
      });

      setShowCreateReportModal(false);
      setSelectedStudy(null);
      setReportContent("");
      fetchUnifiedData();
      alert("Informe creado exitosamente");
    } catch (err) {
      setError("Error al crear informe");
      console.error("Error creating report:", err);
    }
  };

  const openCreateReportModal = (item) => {
    setSelectedStudy(item);
    setReportContent("");
    setShowCreateReportModal(true);
  };

  const openEditReportModal = (item) => {
    if (!item.hasReport) {
      alert("Este estudio no tiene informes para editar");
      return;
    }

    setSelectedStudy(item);
    setSelectedReport({ id: item.reportId });
    // Obtener el contenido del informe
    axios
      .get(`/api/reports/${item.reportId}`)
      .then((response) => {
        setReportContent(response.data.content);
        setShowEditReportModal(true);
      })
      .catch((err) => {
        console.error("Error fetching report:", err);
        alert("Error al cargar el informe");
      });
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/reports/${selectedReport.id}`, {
        content: reportContent,
      });

      setShowEditReportModal(false);
      setSelectedStudy(null);
      setSelectedReport(null);
      setReportContent("");
      fetchUnifiedData();
      alert("Informe actualizado exitosamente");
    } catch (err) {
      setError("Error al actualizar informe");
      console.error("Error updating report:", err);
    }
  };

  const handleSendWhatsApp = async (item) => {
    if (!item.hasReport) {
      alert("Este estudio no tiene informes para notificar");
      return;
    }

    try {
      await axios.post(`/api/reports/${item.reportId}/send-whatsapp`);
      alert("Notificación WhatsApp enviada exitosamente");
    } catch (err) {
      console.error("Error sending WhatsApp:", err);
      alert("Error al enviar notificación WhatsApp");
    }
  };

  const handleViewImage = (item) => {
    if (item.imageUrl) {
      setSelectedImage(item.imageUrl);
      setShowImageViewer(true);
    } else {
      alert("Este estudio no tiene imagen disponible");
    }
  };

  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            🏥 Gestión Médica Unificada
          </h1>

          {/* Resumen */}
          {summary && (
            <div className="p-4 mb-6 rounded-lg shadow bg-blue-50">
              <h3 className="mb-2 text-lg font-semibold text-blue-900">
                📊 Resumen General
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
          )}

          {/* Filtros */}
          <div className="p-4 mb-6 bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
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

              {user?.role === "DOCTOR" && (
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    👨‍⚕️ Mis estudios
                  </label>
                  <select
                    checked={filters.onlyMyStudies}
                    onChange={(e) =>
                      handleFilterChange("onlyMyStudies", e.target.checked)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={false}>Todos los estudios</option>
                    <option value={true}>Solo mis estudios</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  📋 Estado de informes
                </label>
                <select
                  value={filters.onlyWithoutReports ? "without" : "all"}
                  onChange={(e) =>
                    handleFilterChange(
                      "onlyWithoutReports",
                      e.target.value === "without",
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="without">Solo sin informe</option>
                  <option value="all">Todos</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() =>
                    setFilters({
                      page: 1,
                      limit: 10,
                      search: "",
                      onlyWithoutReports: false,
                      onlyMyStudies: false,
                    })
                  }
                  className="px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  🔄 Limpiar filtros
                </button>
              </div>
            </div>
          </div>

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
                        className={
                          item.type === "patient" ? "bg-orange-50" : ""
                        }
                      >
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.patientName}
                            </div>
                            <div className="text-xs text-gray-500">
                              DNI: {item.patientDni}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {item.studyDate
                            ? new Date(item.studyDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {item.studyType}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {item.doctorName}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {item.hasReport ? (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-center text-green-800 bg-green-100 rounded-full">
                              ✅ Creado
                            </span>
                          ) : (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full">
                              ❌ Sin informe
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                          {item.type === "patient" ? (
                            <span className="text-orange-600">
                              📋 Sin estudios - Crear estudio
                            </span>
                          ) : item.hasReport ? (
                            <>
                              <button
                                onClick={() => openEditReportModal(item)}
                                className="mr-2 text-blue-600 hover:text-blue-900"
                                title="Editar informe"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleViewImage(item)}
                                className="mr-2 text-green-600 hover:text-green-900"
                                title="Ver imagen"
                              >
                                🖼️ Ver Imagen
                              </button>
                              <button
                                onClick={() => handleSendWhatsApp(item)}
                                className="text-green-500 hover:text-green-700"
                                title="Enviar notificación WhatsApp"
                              >
                                📱 Notificar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openCreateReportModal(item)}
                                className="mr-2 text-blue-600 hover:text-blue-900"
                                title="Crear informe"
                              >
                                📝 Crear Informe
                              </button>
                              <button
                                onClick={() => handleViewImage(item)}
                                className="text-green-600 hover:text-green-900"
                                title="Ver imagen"
                              >
                                🖼️ Ver Imagen
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                <div className="flex justify-between flex-1 sm:hidden">
                  <button
                    onClick={() =>
                      handleFilterChange("page", pagination.page - 1)
                    }
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      handleFilterChange("page", pagination.page + 1)
                    }
                    disabled={pagination.page >= pagination.pages}
                    className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{" "}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{" "}
                      a{" "}
                      <span className="font-medium">
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total,
                        )}
                      </span>{" "}
                      de <span className="font-medium">{pagination.total}</span>{" "}
                      resultados
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() =>
                          handleFilterChange("page", pagination.page - 1)
                        }
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() =>
                          handleFilterChange("page", pagination.page + 1)
                        }
                        disabled={pagination.page >= pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Crear Informe */}
        {showCreateReportModal && selectedStudy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-4xl p-6 bg-white rounded-lg">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                📝 Crear Informe Médico
              </h2>

              <div className="p-4 mb-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <strong>👤 Paciente:</strong> {selectedStudy.patientName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>🏥 Estudio:</strong> {selectedStudy.studyType}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>📅 Fecha:</strong>{" "}
                  {selectedStudy.studyDate
                    ? new Date(selectedStudy.studyDate).toLocaleDateString()
                    : "-"}
                </p>
              </div>

              <form onSubmit={handleCreateReport} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    📄 Contenido del Informe
                  </label>
                  <textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    required
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ingrese el contenido del informe médico..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    ✅ Crear Informe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateReportModal(false);
                      setSelectedStudy(null);
                      setReportContent("");
                    }}
                    className="flex-1 px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Informe */}
        {showEditReportModal && selectedStudy && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-4xl p-6 bg-white rounded-lg">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                ✏️ Editar Informe Médico
              </h2>

              <div className="p-4 mb-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <strong>👤 Paciente:</strong> {selectedStudy.patientName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>🏥 Estudio:</strong> {selectedStudy.studyType}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>📅 Fecha:</strong>{" "}
                  {selectedStudy.studyDate
                    ? new Date(selectedStudy.studyDate).toLocaleDateString()
                    : "-"}
                </p>
              </div>

              <form onSubmit={handleUpdateReport} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    📄 Contenido del Informe
                  </label>
                  <textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    required
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ingrese el contenido del informe médico..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    ✅ Actualizar Informe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditReportModal(false);
                      setSelectedStudy(null);
                      setSelectedReport(null);
                      setReportContent("");
                    }}
                    className="flex-1 px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Visor de imágenes */}
        {showImageViewer && selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            <div className="relative max-w-6xl max-h-screen p-4">
              <button
                onClick={handleCloseImageViewer}
                className="absolute px-3 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-md top-4 right-4 hover:bg-red-700"
              >
                ❌ Cerrar
              </button>
              <img
                src={selectedImage}
                alt="Estudio médico"
                className="object-contain max-w-full max-h-full"
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Unified;
