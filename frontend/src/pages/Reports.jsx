import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Layout from "../components/Layout";

const Reports = () => {
  const [studies, setStudies] = useState([]);
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
    onlyWithoutReports: false,
  });
  const [pagination, setPagination] = useState(null);

  const fetchStudies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/studies?${params}`);
      setStudies(response.data.studies);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error("Error fetching studies:", err);
      setError("Error al cargar los estudios");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await axios.get("/api/patients");
      setPatients(response.data.patients);
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  }, []);

  useEffect(() => {
    fetchStudies();
    fetchPatients();
  }, [fetchStudies, fetchPatients]);

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
        studyId: selectedStudy.id,
      });

      setShowCreateReportModal(false);
      setSelectedStudy(null);
      setReportContent("");
      fetchStudies();
      toast.success(`✅ Informe creado exitosamente`, {
        autoClose: 15000, // 15 segundos
        hideProgressBar: false,
        closeOnClick: false, // No cerrar al hacer clic
        pauseOnHover: true,
        draggable: true,
        position: "top-right", // Esquina superior derecha
        style: {
          background: "linear-gradient(to right, #00b09b, #96c93d)",
          fontSize: "16px",
          fontWeight: "bold",
          padding: "16px",
        },
      });
    } catch (err) {
      setError("Error al crear informe");
      console.error("Error creating report:", err);
    }
  };

  const openCreateReportModal = (study) => {
    setSelectedStudy(study);
    setReportContent("");
    setShowCreateReportModal(true);
  };

  const openEditReportModal = (study) => {
    if (!study.reports || study.reports.length === 0) {
      toast.error("❌ Este estudio no tiene informes para editar", {
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
      return;
    }

    setSelectedStudy(study);
    setSelectedReport(study.reports[0]);
    setReportContent(study.reports[0].content);
    setShowEditReportModal(true);
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
      fetchStudies();
      toast.success(`✅ Informe actualizado exitosamente`, {
        autoClose: 15000, // 15 segundos
        hideProgressBar: false,
        closeOnClick: false, // No cerrar al hacer clic
        pauseOnHover: true,
        draggable: true,
        position: "top-right", // Esquina superior derecha
        style: {
          background: "linear-gradient(to right, #00b09b, #96c93d)",
          fontSize: "16px",
          fontWeight: "bold",
          padding: "16px",
        },
      });
    } catch (err) {
      setError("Error al actualizar informe");
      console.error("Error updating report:", err);
    }
  };

  const handleSendEmail = async (study) => {
    if (!study.reports || study.reports.length === 0) {
      toast.error("❌ Este estudio no tiene informes para notificar", {
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
      return;
    }

    try {
      const reportId = study.reports[0].id;
      await axios.post(`/api/reports/${reportId}/send-email`);
      toast.success(`✅ Notificación por email enviada exitosamente`, {
        autoClose: 15000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        position: "top-right",
        style: {
          background: "linear-gradient(to right, #00b09b, #96c93d)",
          fontSize: "16px",
          fontWeight: "bold",
          padding: "16px",
        },
      });
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("❌ Error al enviar notificación por email", {
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

  const handleViewImage = (study) => {
    if (study.imageUrl) {
      setSelectedImage(study.imageUrl);
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
            Informes Médicos
          </h1>

          <div className="p-4 mb-6 bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Buscar estudios o pacientes
                </label>
                <input
                  type="text"
                  placeholder="Buscar por paciente, DNI o tipo de estudio"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Mostrar
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
                    })
                  }
                  className="px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white rounded-lg shadow">
            {studies.length === 0 ? (
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
                <p className="text-gray-500">No se encontraron estudios</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Tipo de Estudio
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Informe
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studies.map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(study.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {study.patient?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {study.type}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {study.reports && study.reports.length > 0 ? (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full">
                              Creado
                            </span>
                          ) : (
                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full">
                              Sin informe
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          {study.reports && study.reports.length > 0 ? (
                            <>
                              <button
                                onClick={() => openEditReportModal(study)}
                                className="mr-3 text-blue-600 hover:text-blue-900"
                                title="Editar informe"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleViewImage(study)}
                                className="mr-3 text-green-600 hover:text-green-900"
                                title="Ver imagen"
                              >
                                🖼️ Ver Imagen
                              </button>
                              <button
                                onClick={() => handleSendEmail(study)}
                                className="text-green-500 hover:text-green-700"
                                title="Enviar notificación por email"
                              >
                                � Notificar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openCreateReportModal(study)}
                                className="mr-3 text-blue-600 hover:text-blue-900"
                                title="Crear informe"
                              >
                                📝 Crear Informe
                              </button>
                              <button
                                onClick={() => handleViewImage(study)}
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
                Crear Informe Médico
              </h2>

              <div className="p-4 mb-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <strong>Paciente:</strong> {selectedStudy.patient?.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Estudio:</strong> {selectedStudy.type}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Fecha:</strong>{" "}
                  {new Date(selectedStudy.date).toLocaleDateString()}
                </p>
              </div>

              <form onSubmit={handleCreateReport} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Contenido del Informe
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
                    Crear Informe
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
                    Cancelar
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
                Editar Informe Médico
              </h2>

              <div className="p-4 mb-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <strong>Paciente:</strong> {selectedStudy.patient?.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Estudio:</strong> {selectedStudy.type}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Fecha:</strong>{" "}
                  {new Date(selectedStudy.date).toLocaleDateString()}
                </p>
              </div>

              <form onSubmit={handleUpdateReport} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Contenido del Informe
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
                    Actualizar Informe
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
                    Cancelar
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
                Cerrar
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

export default Reports;
