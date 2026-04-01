import { useState } from "react";
import Logo from "../assets/img/Logo_Completo.png";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({
    dni: "",
    password: "",
  });
  const { login, loading, error, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(formData.dni, formData.password);
  };

  return (
    <div className="flex flex-col justify-center min-h-screen px-4 py-8 bg-primaryB from-gray-50 to-gray-100 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo centrado y más grande */}
        <div className="flex justify-center mb-8">
          <img
            className="w-auto h-32 transition-transform duration-300 hover:scale-105"
            src={Logo}
            alt="Diagnóstico López"
          />
        </div>
      </div>

      {/* Card de login mejorada */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="overflow-hidden bg-white shadow-2xl rounded-2xl">
          {/* Header con gradiente */}
          <div className="px-6 py-8 bg-gradient-to-r from-quinty to-sexty sm:px-10">
            <h2 className="text-3xl font-bold text-center text-white">
              Bienvenido
            </h2>
            <p className="mt-2 text-center text-gray-200">
              Sistema de Gestión Médica
            </p>
          </div>

          {/* Formulario */}
          <div className="px-6 py-8 sm:px-10 ">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="px-4 py-3 text-red-700 border border-red-300 rounded-md bg-red-50">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="dni"
                  className="block text-sm font-medium text-gray-700"
                >
                  🆔 DNI
                </label>
                <div className="mt-1">
                  <input
                    id="dni"
                    name="dni"
                    type="text"
                    required
                    value={formData.dni}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 text-base placeholder-gray-500 transition-colors border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-quinty focus:border-quinty"
                    placeholder="Ingrese su DNI"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  🔐 Contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 text-base placeholder-gray-500 transition-colors border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-quinty focus:border-quinty"
                    placeholder="Ingrese su contraseña"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex justify-center w-full px-4 py-3 text-base font-medium text-white border border-transparent rounded-lg shadow-sm bg-gradient-to-r from-quinty to-sexty hover:from-cuarty hover:to-septy focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-quinty disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 -ml-1 text-white animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Iniciando sesión...
                    </span>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </button>
              </div>
            </form>

            {/* Información de ayuda */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 text-gray-500 bg-white">
                    ℹ️ Información
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center p-4 rounded-lg bg-blue-50">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">
                        Contraseña por defecto:
                      </span>{" "}
                      Use su DNI como contraseña
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
