import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "../components/Layout";

const Users = () => {
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    console.log("🚀 Iniciando creación de usuario:", formData);
    console.log("📤 Enviando a:", "/api/users");

    try {
      const response = await axios.post("/api/users", formData);
      console.log("✅ Respuesta del backend:", response.data);

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
      console.log("🎉 Por mostrar toast de éxito...");
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
      console.log("✅ Toast de éxito mostrado");

      // Mayor retraso antes de cerrar modal y recargar
      setTimeout(() => {
        setShowCreateModal(false);
        fetchUsers();
      }, 2000); // 2 segundos para que el toast sea visible
    } catch (err) {
      console.error("❌ Error creating user:", err);
      console.error("❌ Status:", err.response?.status);
      console.error("❌ Error data:", err.response?.data);
      console.error("❌ Error message:", err.message);

      // Manejar diferentes tipos de errores con toast
      if (err.response?.status === 400) {
        const errorMsg = err.response.data.error;

        if (errorMsg.includes("DNI") && errorMsg.includes("already exists")) {
          toast.error("❌ Ya existe un usuario con ese DNI");
        } else if (
          errorMsg.includes("email") &&
          errorMsg.includes("already exists")
        ) {
          toast.error("❌ Ya existe un usuario con ese email");
        } else if (errorMsg.includes("required")) {
          toast.error("❌ Datos inválidos. Verifica todos los campos.");
        } else {
          toast.error(`❌ ${errorMsg}`);
        }
      } else if (err.response?.status === 401) {
        toast.error("❌ No autorizado. Inicia sesión nuevamente.");
      } else if (err.response?.status === 403) {
        toast.error("❌ No tienes permisos para crear usuarios.");
      } else if (err.code === "NETWORK_ERROR") {
        toast.error("❌ Error de conexión. Verifica tu internet.");
      } else {
        toast.error("❌ Error al crear usuario. Intenta nuevamente.");
      }
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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Gestión de Usuarios
            </h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2 text-white transition-colors rounded-md sm:w-auto bg-quinty hover:bg-cuarty"
            >
              Crear Usuario
            </button>
          </div>

          <div className="p-4 mb-6 rounded-lg shadow bg-quinty">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">
                  🔍Buscar
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-yellow-950"
                />
              </div>

              <div>
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

              <div className="flex items-end">
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
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {user.dni}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {user.email || "No registrado"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
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
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
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
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {user.name}
                        </h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">💳 DNI:</span>{" "}
                            {user.dni}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">📞 Teléfono:</span>{" "}
                            {user.phone}
                          </p>
                          {user.email && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">📩 Email:</span>{" "}
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
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
                      </div>
                    </div>
                    <div className="flex pt-3 space-x-3 border-t border-gray-100">
                      <button
                        onClick={() => openEditModal(user)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                      >
                        🗑️ Eliminar
                      </button>
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
