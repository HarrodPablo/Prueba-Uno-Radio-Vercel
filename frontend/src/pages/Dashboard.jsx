import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case "ADMIN":
        return "Panel de Administración";
      case "DOCTOR":
        return "Panel Médico";
      case "PATIENT":
        return "Portal del Paciente";
      default:
        return "Bienvenido";
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case "ADMIN":
        return "Gestión de usuarios";
      case "DOCTOR":
        return "Atención de pacientes e informes médicos";
      case "PATIENT":
        return "Consulta de resultados y historial médico";
      default:
        return "";
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-5xl p-6 mx-auto">
          {/* Welcome Section */}

          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              {getWelcomeMessage()}
            </h1>

            <p className="text-base text-gray-900">Bienvenido, {user?.name}</p>

            <p className="mt-1 text-sm text-gray-700">{getRoleDescription()}</p>
          </div>

          {/* User Info Card - Para todos los roles */}

          <div className="mb-6 overflow-hidden bg-white rounded-lg shadow-lg">
            <div className="px-4 py-6 sm:p-6 bg-gradient-to-r from-quinty to-sexty">
              <h3 className="pb-2 mb-4 text-xl font-bold leading-7 text-gray-900 border-b-2 border-gray-200">
                {user?.role === "PATIENT"
                  ? "👤 Mi Perfil"
                  : "ℹ️ Información de Usuario"}
              </h3>

              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <dt className="mb-1 text-sm font-semibold text-gray-700">
                    👤 Nombre
                  </dt>

                  <dd className="text-base font-medium text-gray-900">
                    {user?.name}
                  </dd>
                </div>

                <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <dt className="mb-1 text-sm font-semibold text-gray-700">
                    🆔 DNI
                  </dt>

                  <dd className="text-base font-medium text-gray-900">
                    {user?.dni}
                  </dd>
                </div>

                {user?.role === "PATIENT" && (
                  <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <dt className="mb-1 text-sm font-semibold text-gray-700">
                      📞 Teléfono
                    </dt>

                    <dd className="text-base font-medium text-gray-900">
                      {user?.phone || "No registrado"}
                    </dd>
                  </div>
                )}

                <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <dt className="mb-1 text-sm font-semibold text-gray-700">
                    📧 Email
                  </dt>

                  <dd className="text-base font-medium text-gray-900">
                    {user?.email || "No registrado"}
                  </dd>
                </div>

                <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <dt className="mb-1 text-sm font-semibold text-gray-700">
                    🏷️ Rol
                  </dt>

                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${
                        user?.role === "PATIENT"
                          ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                          : user?.role === "DOCTOR"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      }`}
                    >
                      {user?.role === "PATIENT" ? "🏥 Paciente" : user?.role}
                    </span>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
