import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import ImageViewer from "../components/ImageViewer";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { generatePDF } from "../utils/pdfGenerator";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    dateFrom: "",
    dateTo: "",
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

      params.append("patientId", user?.id || "");

      const response = await axios.get(`/api/studies?${params}`);
      setStudies(response.data.studies);
      setPagination(response.data.pagination);
    } catch (err) {
      setError("Error al cargar los estudios");
      console.error("Error fetching studies:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, user?.id]);

  useEffect(() => {
    if (user) {
      fetchStudies();
    }
  }, [fetchStudies, user]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageViewer(true);
  };

  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
  };

  const handleViewReport = (study) => {
    if (study.reports && study.reports.length > 0) {
      setSelectedReport(study.reports[0]);
      setShowReportModal(true);
    } else {
      alert("Este estudio no tiene un informe medico disponible");
    }
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setSelectedReport(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-xl text-red-600">{error}</div>
            <button
              onClick={fetchStudies}
              className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-lg shadow bg-quinty">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                🔍 Filtros de Historial
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">
                    📅 Fecha Desde
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
                    📅 Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() =>
                      setFilters({
                        page: 1,
                        limit: 10,
                        dateFrom: "",
                        dateTo: "",
                      })
                    }
                    className="w-full px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                Mi Historial de Estudios
              </h3>

              {studies.length === 0 ? (
                <div className="py-12 text-center">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No tienes estudios registrados
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Tu historial de estudios aparecera aqui cuando tengas
                    radiografias realizadas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-quinty">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                          Tipo de Estudio
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                          Informe
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studies.map((study) => (
                        <tr key={study.id}>
                          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            {formatDate(study.date)}
                            {study.imageUrl && (
                              <div className="mt-1 text-xs text-gray-500">
                                Imagen: {formatDateTime(study.createdAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-center${
                                study.type === "RX General"
                                  ? "bg-blue-100 text-blue-800"
                                  : study.type === "Tomografia"
                                    ? "bg-green-100 text-green-800"
                                    : study.type === "Resonancia"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {study.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {study.reports.length > 0 ? (
                              <div className="text-center">
                                <span className="inline-flex px-2 mb-1 text-xs font-semibold leading-5 text-green-900 bg-green-100 rounded-full">
                                  Con informe
                                </span>
                                <div className="text-xs text-gray-500">
                                  Creado:{" "}
                                  {formatDateTime(study.reports[0].createdAt)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Sin informe</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            <button
                              onClick={() => handleViewImage(study.imageUrl)}
                              className="mr-3 text-blue-600 hover:text-blue-900"
                            >
                              Ver Imagen
                            </button>
                            {study.reports.length > 0 && (
                              <>
                                <button
                                  onClick={() => handleViewReport(study)}
                                  className="mr-3 text-purple-600 hover:text-purple-900"
                                >
                                  Ver Informe
                                </button>
                                <button
                                  onClick={() =>
                                    generatePDF(study.reports[0], study)
                                  }
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Descargar Informe
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
            </div>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex justify-between flex-1 sm:hidden">
                <button
                  onClick={() =>
                    handleFilterChange("page", Math.max(1, filters.page - 1))
                  }
                  disabled={filters.page === 1}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    handleFilterChange(
                      "page",
                      Math.min(pagination.pages, filters.page + 1),
                    )
                  }
                  disabled={filters.page === pagination.pages}
                  className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Pagina <span className="font-medium">{filters.page}</span>{" "}
                    de <span className="font-medium">{pagination.pages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
                    <button
                      onClick={() =>
                        handleFilterChange(
                          "page",
                          Math.max(1, filters.page - 1),
                        )
                      }
                      disabled={filters.page === 1}
                      className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg
                        className="w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 001.414 0L5.586 10l3.293-3.293a1 1 0 001.414 1.414l4 4a1 1 0 001.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        handleFilterChange(
                          "page",
                          Math.min(pagination.pages, filters.page + 1),
                        )
                      }
                      disabled={filters.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50"
                    >
                      <span className="sr-only">Siguiente</span>
                      <svg
                        className="w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 011.414 0l4-4a1 1 0 011.414 1.414L11.586 10l4.293 4.293a1 1 0 001.414 1.414l-4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImageViewer && (
        <ImageViewer
          imageUrl={selectedImage}
          onClose={handleCloseImageViewer}
        />
      )}

      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Informe Medico Completo
              </h2>
              <button
                onClick={handleCloseReportModal}
                className="text-gray-400 hover:text-gray-600"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50">
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Informacion del Estudio
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Paciente:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedReport.study?.patient?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Tipo de Estudio:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedReport.study?.type}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Fecha del Estudio:
                    </span>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedReport.study?.date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Fecha del Informe:
                    </span>
                    <p className="text-sm text-gray-900">
                      {formatDateTime(selectedReport.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50">
                <h3 className="mb-2 text-lg font-medium text-blue-900">
                  Contenido del Informe
                </h3>
                <div className="p-4 bg-white border border-blue-200 rounded">
                  <pre className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {selectedReport.content}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() =>
                    generatePDF(selectedReport, selectedReport.study)
                  }
                  className="px-4 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700"
                >
                  Descargar PDF
                </button>
                <button
                  onClick={handleCloseReportModal}
                  className="px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PatientDashboard;
