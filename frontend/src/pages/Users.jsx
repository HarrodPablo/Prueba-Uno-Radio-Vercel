import axios from "axios";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import Layout from "../components/Layout";

import { useAuth } from "../context/AuthContext";

import { backendOrigin, withOrthancProxyAuth } from "../utils/orthancUrl";

const Users = () => {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    dni: "",

    name: "",

    phone: "",

    email: "",

    role: "PATIENT",

    password: "",
  });

  const [filters, setFilters] = useState({
    page: 1,

    limit: 10,

    search: "",

    role: "",
  });

  const [pagination, setPagination] = useState(null);

  // Estados para Orthanc

  const [orthancStudies, setOrthancStudies] = useState([]);

  const [orthancLoading, setOrthancLoading] = useState(false);

  const [orthancError, setOrthancError] = useState(null);

  const [showOrthancModal, setShowOrthancModal] = useState(false);

  const [orthancSearchTerm, setOrthancSearchTerm] = useState("");

  const [expandedStudies, setExpandedStudies] = useState(new Set());

  // Ref para el input de búsqueda

  const searchInputRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      setError(null);

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/users?${params}`);

      setUsers(response.data.users);

      setPagination(response.data.pagination);
    } catch (err) {
      setError("Error al cargar los usuarios");

      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,

      [key]: value,

      page: key === "page" ? value : 1,
    }));
  };

  // Debounce mejorado para búsqueda

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 500); // Aumentado a 500ms para menos llamadas

    return () => clearTimeout(debounceTimer);
  }, [filters.search, fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("/api/users", formData);

      // Limpiar formulario

      setFormData({
        dni: "",

        name: "",

        phone: "",

        email: "",

        role: "PATIENT",

        password: "",
      });

      // Mostrar mensaje de éxito con toast primero

      toast.success(
        `✅ Usuario "${response.data.name}" creado exitosamente con DNI: ${response.data.dni}`,

        {
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
        },
      );

      // Cerrar modal

      setShowCreateModal(false);

      setEditingUser(null);

      // Refrescar lista de usuarios

      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);

      toast.error("Error al crear usuario", {
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

  // Función para formatear fecha DICOM (YYYYMMDD)

  const formatDicomDate = (dateString) => {
    if (!dateString || dateString === "Sin fecha") return "N/A";

    // Formato DICOM: YYYYMMDD

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

    // Fallback para otros formatos

    return dateString;
  };

  // Función para formatear hora DICOM (HHMMSS)

  const formatDicomTime = (timeString) => {
    if (!timeString || timeString === "Sin hora") return "N/A";

    // Formato DICOM: HHMMSS o HHMM

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

    // Formato DICOM: apellido^nombre o apellido^nombre^segundoNombre^titulo

    const parts = nameString.split("^");

    if (parts.length >= 2) {
      const lastName = parts[0] || "";

      const firstName = parts[1] || "";

      // Limpiar espacios y formatear

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

    // Fallback: si no tiene el formato esperado, devolver como está

    return nameString;
  };

  // Función para filtrar estudios de Orthanc

  const filteredOrthancStudies = orthancStudies.filter((study) => {
    const searchLower = orthancSearchTerm.toLowerCase();

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

  // Función para toggle del menú hamburguesa

  const toggleStudyExpansion = (studyId) => {
    const newExpanded = new Set(expandedStudies);

    if (newExpanded.has(studyId)) {
      newExpanded.delete(studyId);
    } else {
      newExpanded.add(studyId);
    }

    setExpandedStudies(newExpanded);
  };

  const handleImportFromOrthanc = async (orthancStudy) => {
    try {
      // Crear paciente con datos del DICOM

      const patientResponse = await axios.post("/api/users", {
        name: orthancStudy.patientName || "Paciente Orthanc",

        dni: orthancStudy.patientId || "AUTO-" + Date.now(),

        phone: "",

        email: "",

        role: "PATIENT",

        password: "temp123", // Contraseña temporal
      });

      const newPatientId = patientResponse.data.id;

      // Asignar estudio al paciente creado

      await axios.post("/api/orthanc/assign", {
        patientId: newPatientId,

        orthancId: orthancStudy.orthancId,
      });

      toast.success("Paciente creado y estudio asignado correctamente", {
        autoClose: 3000,

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

      setShowOrthancModal(false);

      fetchUsers(); // Refrescar lista de usuarios
    } catch (err) {
      console.error("Error importing from Orthanc:", err);

      toast.error("Error al importar paciente desde Orthanc", {
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

  const handleEditUser = async (e) => {
    e.preventDefault();

    try {
      // Si la contraseña está vacía, no la enviamos para mantener la actual

      const dataToSend = { ...formData };

      if (!dataToSend.password || dataToSend.password.trim() === "") {
        delete dataToSend.password;
      }

      await axios.put(`/api/users/${editingUser.id}`, dataToSend);

      setEditingUser(null);

      setFormData({
        dni: "",

        name: "",

        phone: "",

        email: "",

        role: "PATIENT",

        password: "",
      });

      fetchUsers();

      // Mostrar mensaje de éxito con toast

      const passwordChanged = dataToSend.password
        ? " y contraseña actualizada"
        : "";

      toast.success(
        `✅ Usuario "${formData.name}" actualizado exitosamente${passwordChanged}`,

        {
          position: "top-right",

          autoClose: 5000,

          hideProgressBar: false,

          closeOnClick: true,

          pauseOnHover: true,

          draggable: true,

          progress: undefined,

          theme: "colored",
        },
      );
    } catch (err) {
      toast.error("❌ Error al actualizar usuario. Intenta nuevamente.", {
        position: "top-right",

        autoClose: 5000,

        theme: "colored",
      });

      console.error("Error updating user:", err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("¿Está seguro de eliminar este usuario?")) {
      try {
        await axios.delete(`/api/users/${userId}`);

        fetchUsers();

        // Mostrar mensaje de éxito con toast

        toast.success("✅ Usuario eliminado exitosamente", {
          position: "top-right",

          autoClose: 5000,

          hideProgressBar: false,

          closeOnClick: true,

          pauseOnHover: true,

          draggable: true,

          progress: undefined,

          theme: "colored",
        });
      } catch (err) {
        toast.error("❌ Error al eliminar usuario. Intenta nuevamente.", {
          position: "top-right",

          autoClose: 5000,

          theme: "colored",
        });

        console.error("Error deleting user:", err);
      }
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);

    setFormData({
      dni: user.dni,

      name: user.name,

      phone: user.phone,

      email: user.email,

      role: user.role,

      password: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,

      [name]: value,
    }));
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
          <div className="mb-6">
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Gestión de Usuarios
              </h1>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:w-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full px-4 py-2 text-white transition-colors rounded-md sm:w-auto bg-quinty hover:bg-cuarty"
                >
                  Crear Usuario
                </button>
              </div>
            </div>

            <div className="p-4 mb-6 rounded-lg shadow bg-quinty">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex-1 min-w-0 sm:flex-initial sm:w-64 lg:w-80">
                  <label className="block mb-1 text-sm font-medium text-gray-900">
                    🔍Buscar
                  </label>

                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar por nombre o DNI"
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="w-full px-3 py-2 border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-yellow-950"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <label className="block mb-1 text-sm font-medium text-gray-900">
                    🏷️ Rol
                  </label>

                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange("role", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>

                    <option value="ADMIN">Administrador</option>

                    <option value="DOCTOR">Doctor</option>

                    <option value="PATIENT">Paciente</option>
                  </select>
                </div>

                <div className="w-full sm:w-auto">
                  <button
                    onClick={() =>
                      setFilters({ page: 1, limit: 10, search: "", role: "" })
                    }
                    className="w-full px-4 py-2 text-white transition-colors bg-gray-500 rounded-md hover:bg-gray-600"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>

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
                        👤 Nombre
                      </th>

                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        📩 Email
                      </th>

                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        📞Teléfono
                      </th>

                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        🏷️ Rol
                      </th>

                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-900 uppercase">
                        ⚡ Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-primaryB">
                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {user.dni}
                        </td>

                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {user.name}
                        </td>

                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {user.email || "No registrado"}
                        </td>

                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          {user.phone}
                        </td>

                        <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800"
                                : user.role === "DOCTOR"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.role === "ADMIN"
                              ? "Administrador"
                              : user.role === "DOCTOR"
                                ? "Doctor"
                                : "Paciente"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(user)}
                            className="mr-3 text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Versión Mobile - Cards */}

              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <div
                      key={`mobile-${user.id}`}
                      className="w-full p-4 pb-6 hover:bg-gray-50"
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-start justify-between w-full mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {user.name}
                            </h3>

                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">💳 DNI:</span>{" "}
                                <span className="font-mono text-xs">
                                  {user.dni || "N/A"}
                                </span>
                              </p>

                              <p className="text-sm text-gray-600">
                                <span className="font-medium">
                                  📞 Teléfono:
                                </span>{" "}
                                <span className="break-all">
                                  {user.phone || "N/A"}
                                </span>
                              </p>

                              {user.email && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">📩 Email:</span>{" "}
                                  <span className="break-all">
                                    {user.email}
                                  </span>
                                </p>
                              )}

                              <p className="text-sm text-gray-600">
                                <span className="font-medium">🏷️ Rol:</span>{" "}
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    user.role === "ADMIN"
                                      ? "bg-purple-100 text-purple-800"
                                      : user.role === "DOCTOR"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {user.role === "ADMIN"
                                    ? "Administrador"
                                    : user.role === "DOCTOR"
                                      ? "Doctor"
                                      : "Paciente"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex-shrink-0 ml-4">
                            <div className="flex items-center justify-center w-16 h-16 text-gray-400 bg-gray-100 rounded-lg">
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
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col w-full pt-3 space-y-2 border-t border-gray-100 sm:flex-row sm:space-y-0 sm:space-x-3">
                          <button
                            onClick={() => openEditModal(user)}
                            className="w-full px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 sm:w-auto sm:flex-1"
                          >
                            ✏️ Editar
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="w-full px-3 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 sm:w-auto sm:flex-1"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      handleFilterChange("page", Math.max(1, filters.page - 1))
                    }
                    disabled={filters.page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md bg-quinty hover:bg-cuarty disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900"
                  >
                    Anterior
                  </button>

                  <span className="px-3 py-2 text-sm text-gray-700">
                    Página {filters.page} de {pagination.pages}
                  </span>

                  <button
                    onClick={() =>
                      handleFilterChange(
                        "page",

                        Math.min(pagination.pages, filters.page + 1),
                      )
                    }
                    disabled={filters.page === pagination.pages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md bg-quinty hover:bg-cuarty disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Modal Crear/Editar Usuario */}

        {(showCreateModal || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="w-full max-w-md max-h-screen p-6 overflow-y-auto rounded-lg bg-primaryB">
              <h2 className="mb-4 text-lg font-semibold text-center text-gray-900">
                {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </h2>

              <form
                onSubmit={editingUser ? handleEditUser : handleCreateUser}
                className="space-y-4"
              >
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 ">
                    DNI
                  </label>

                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-septy focus:border-quinty"
                    placeholder="Ej: 12345678"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Nombre Completo
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-septy focus:border-quinty"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-septy focus:border-quinty"
                    placeholder="Ej: correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Teléfono
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-septy focus:border-quinty"
                    placeholder="Ej: +5493811234567"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Rol
                  </label>

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-septy focus:border-quinty"
                  >
                    <option value="PATIENT">Paciente</option>

                    <option value="DOCTOR">Doctor</option>

                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Contraseña{" "}
                    {editingUser && "(dejar en blanco para mantener la actual)"}
                  </label>

                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-septy focus:border-quinty"
                    placeholder={
                      editingUser
                        ? "Dejar vacío para no cambiar"
                        : "Mínimo 6 caracteres"
                    }
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white transition-colors rounded-md bg-quinty hover:bg-cuarty"
                  >
                    {editingUser ? "Actualizar" : "Crear"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);

                      setEditingUser(null);

                      setFormData({
                        dni: "",

                        name: "",

                        phone: "",

                        email: "",

                        role: "PATIENT",

                        password: "",
                      });
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
      </div>

      {/* Modal de Importar desde Orthanc */}

      {showOrthancModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] p-6 bg-white rounded-lg overflow-hidden">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Importar Pacientes desde Orthanc PACS
                </h3>

                <button
                  onClick={() => setShowOrthancModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
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
              </div>

              {/* Buscador */}

              <div className="relative">
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
                  value={orthancSearchTerm}
                  onChange={(e) => setOrthancSearchTerm(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {orthancSearchTerm && (
                  <button
                    onClick={() => setOrthancSearchTerm("")}
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

            {orthancLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>

                <p className="ml-3 text-gray-600">
                  Cargando estudios desde Orthanc...
                </p>
              </div>
            ) : orthancError ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>

                <p className="font-medium text-red-600">{orthancError}</p>

                <p className="mt-2 text-sm text-gray-500">
                  Verifique que Orthanc esté disponible en la configuración
                </p>
              </div>
            ) : orthancStudies.length === 0 ? (
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
              <div className="overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredOrthancStudies.map((study) => (
                    <div
                      key={study.orthancId}
                      className="overflow-hidden transition-shadow border border-gray-200 rounded-lg hover:shadow-md"
                    >
                      {study.previewUrl && (
                        <div className="bg-gray-100 aspect-video">
                          <img
                            src={withOrthancProxyAuth(
                              `${backendOrigin()}${study.previewUrl}`,

                              token,
                            )}
                            alt={`Preview de ${study.patientName}`}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              e.target.style.display = "none";

                              e.target.nextSibling.style.display = "flex";
                            }}
                          />

                          <div
                            className="items-center justify-center w-full h-full text-gray-400"
                            style={{ display: "none" }}
                          >
                            <svg
                              className="w-12 h-12"
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
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4
                              className="font-medium text-gray-900 truncate"
                              title={formatDicomName(
                                study.PatientName || study.patientName,
                              )}
                            >
                              {formatDicomName(
                                study.PatientName || study.patientName,
                              )}
                            </h4>

                            <p className="mt-1 text-sm text-gray-500">
                              DNI:{" "}
                              <span className="font-mono text-xs">
                                {study.PatientID || study.patientDni || "N/A"}
                              </span>
                            </p>

                            <p className="text-sm text-gray-500">
                              Fecha:{" "}
                              {formatDicomDate(
                                study.StudyDate || study.studyDate,
                              )}
                            </p>

                            <p className="text-sm text-gray-500">
                              Hora:{" "}
                              {formatDicomTime(
                                study.StudyTime || study.studyTime,
                              )}
                            </p>

                            <p className="text-sm text-gray-500">
                              Tipo:{" "}
                              {study.StudyDescription || study.type || "N/A"}
                            </p>

                            <p className="text-sm text-gray-500">
                              Imagenes:{" "}
                              <span className="font-mono text-xs">
                                {study.Series || "N/A"}
                              </span>
                            </p>
                          </div>

                          {/* Menú hamburguesa para múltiples radiografías */}

                          {(study.Series > 1 || study.instancesCount > 1) && (
                            <button
                              onClick={() =>
                                toggleStudyExpansion(study.orthancId)
                              }
                              className="p-2 text-gray-400 transition-colors rounded-md hover:text-gray-600 hover:bg-gray-100"
                              title={`Ver ${study.Series} series y ${study.instancesCount} imágenes`}
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${
                                  expandedStudies.has(study.orthancId)
                                    ? "rotate-90"
                                    : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 6h16M4 12h16M4 18h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Sección expandible para múltiples radiografías */}

                        {expandedStudies.has(study.orthancId) && (
                          <div className="p-3 mt-3 border border-gray-200 rounded-md bg-gray-50">
                            <p className="mb-2 text-sm font-medium text-gray-700">
                              Detalles del Estudio
                            </p>

                            <div className="space-y-1 text-xs text-gray-600">
                              <p>Series: {study.Series}</p>

                              <p>Imágenes: {study.instancesCount}</p>

                              <p>
                                Study Instance UID: {study.studyInstanceUid}
                              </p>
                            </div>

                            {study.seriesCount > 1 && (
                              <div className="pt-2 mt-2 border-t border-gray-200">
                                <p className="mb-1 text-xs text-gray-500">
                                  Este estudio contiene múltiples series. Todas
                                  serán importadas.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => handleImportFromOrthanc(study)}
                          className="w-full px-3 py-2 mt-3 text-sm text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          Importar Paciente
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

export default Users;
