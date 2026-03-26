import axios from "axios";
import { useCallback, useEffect, useState } from "react";
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
      alert("Informe creado exitosamente");
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
      alert("Este estudio no tiene informes para editar");
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
      alert("Informe actualizado exitosamente");
    } catch (err) {
      setError("Error al actualizar informe");
      console.error("Error updating report:", err);
    }
  };

  const handleSendWhatsApp = async (study) => {
    if (!study.reports || study.reports.length === 0) {
      alert("Este estudio no tiene informes para notificar");
      return;
    }

    try {
      const reportId = study.reports[0].id;
      await axios.post(`/api/reports/${reportId}/send-whatsapp`);
      alert("Notificación WhatsApp enviada exitosamente");
    } catch (err) {
      console.error("Error sending WhatsApp:", err);
      alert("Error al enviar notificación WhatsApp");
    }
  };

  const handleViewImage = (study) => {
    if (study.imageUrl) {
      setSelectedImage(study.imageUrl);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Informes Médicos
          </h1>

          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            {studies.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Estudio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Informe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studies.map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(study.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {study.patient?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {study.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {study.reports && study.reports.length > 0 ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Creado
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Sin informe
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {study.reports && study.reports.length > 0 ? (
                            <>
                              <button
                                onClick={() => openEditReportModal(study)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                                title="Editar informe"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleViewImage(study)}
                                className="text-green-600 hover:text-green-900 mr-3"
                                title="Ver imagen"
                              >
                                🖼️ Ver Imagen
                              </button>
                              <button
                                onClick={() => handleSendWhatsApp(study)}
                                className="text-green-500 hover:text-green-700"
                                title="Enviar notificación WhatsApp"
                              >
                                📱 Notificar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openCreateReportModal(study)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
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
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() =>
                      handleFilterChange("page", pagination.page - 1)
                    }
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      handleFilterChange("page", pagination.page + 1)
                    }
                    disabled={pagination.page >= pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() =>
                          handleFilterChange("page", pagination.page - 1)
                        }
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() =>
                          handleFilterChange("page", pagination.page + 1)
                        }
                        disabled={pagination.page >= pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-4xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Crear Informe Médico
              </h2>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-4xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Editar Informe Médico
              </h2>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
            <div className="relative max-w-6xl max-h-screen p-4">
              <button
                onClick={handleCloseImageViewer}
                className="absolute top-4 right-4 text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
              <img
                src={selectedImage}
                alt="Estudio médico"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
