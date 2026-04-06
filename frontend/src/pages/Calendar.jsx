import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";

const Calendar = () => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);

  const fetchStudies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );

      const response = await axios.get(
        `/api/studies?dateFrom=${startDate.toISOString().split("T")[0]}&dateTo=${endDate.toISOString().split("T")[0]}`,
      );
      setStudies(response.data.studies);
    } catch (err) {
      setError("Error al cargar los estudios");
      console.error("Error fetching studies:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const getStudiesForDate = (date) => {
    const dateStr = formatDate(date);
    return studies.filter((study) => study.date.startsWith(dateStr));
  };

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const handleDateClick = (date) => {
    const dayStudies = getStudiesForDate(date);
    if (dayStudies.length > 0) {
      setSelectedStudy(dayStudies[0]);
      setShowStudyModal(true);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 border border-gray-200"></div>,
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day,
      );
      const dayStudies = getStudiesForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(date)}
          className={`p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
            isToday ? "bg-blue-100" : "bg-white"
          } ${dayStudies.length > 0 ? "bg-green-50" : ""}`}
        >
          <div className="text-sm font-medium">{day}</div>
          {dayStudies.length > 0 && (
            <div className="mt-1">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-xs text-gray-600 ml-1">
                {dayStudies.length}
              </span>
            </div>
          )}
        </div>,
      );
    }

    return days;
  };

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Calendario de Estudios
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePreviousMonth}
                className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <span className="text-lg font-medium text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Siguiente →
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="grid grid-cols-7">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="p-2 bg-gray-50 text-center text-sm font-medium text-gray-700 border-b border-gray-200"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">{renderCalendar()}</div>
          </div>

          <div className="mt-6 bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Leyenda</h3>
            <div className="flex space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border border-gray-300 mr-2"></div>
                <span>Hoy</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-50 border border-gray-300 mr-2"></div>
                <span>Con estudios</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Número de estudios</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Detalles del Estudio */}
        {showStudyModal && selectedStudy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Detalles del Estudio
              </h2>

              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Fecha:</span>
                  <p className="text-gray-900">
                    {(() => {
                      const date = new Date(selectedStudy.date);
                      const localDate = new Date(
                        date.getTime() + date.getTimezoneOffset() * 60000,
                      );
                      return localDate.toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "America/Argentina/Buenos_Aires",
                      });
                    })()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Paciente:</span>
                  <p className="text-gray-900">{selectedStudy.patient.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">DNI:</span>
                  <p className="text-gray-900">{selectedStudy.patient.dni}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Tipo de estudio:
                  </span>
                  <p className="text-gray-900">{selectedStudy.type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Informe:</span>
                  <p className="text-gray-900">
                    {selectedStudy.reports &&
                    selectedStudy.reports.length > 0 ? (
                      <span className="text-green-600">✓ Informe creado</span>
                    ) : (
                      <span className="text-red-600">✗ Sin informe</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => {
                    window.location.href = `/reports`;
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {selectedStudy.reports && selectedStudy.reports.length > 0
                    ? "Ver Informe"
                    : "Crear Informe"}
                </button>
                <button
                  onClick={() => {
                    window.location.href = `/studies`;
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Ver Imagen
                </button>
                <button
                  onClick={() => {
                    setShowStudyModal(false);
                    setSelectedStudy(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Calendar;
