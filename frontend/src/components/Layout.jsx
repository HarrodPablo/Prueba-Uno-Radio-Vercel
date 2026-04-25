import { useState } from "react";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Logo from "../assets/img/loogo.png";
import { useAuth } from "../context/AuthContext";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavItems = () => {
    const baseItems = [{ name: "Inicio", path: "/" }];

    if (user?.role === "ADMIN") {
      baseItems.push(
        { name: "Usuarios", path: "/users" },
        { name: "Importar", path: "/orthanc-import" },
        { name: "Estudios", path: "/admin-studies" },
      );
    } else if (user?.role === "DOCTOR") {
      baseItems.push({ name: "Gestión Médica", path: "/unified" });
    } else if (user?.role === "PATIENT") {
      baseItems.push({ name: "Mi Historial", path: "/profile" });
    }

    return baseItems;
  };

  return (
    <div className="flex flex-col min-h-screen bg-primaryB">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo a la izquierda */}
            <div className="flex items-center flex-shrink-0">
              <img
                className="w-auto h-12 transition-transform duration-300 sm:h-14 lg:h-16 hover:scale-105"
                src={Logo}
                alt="Diagnóstico López"
              />
            </div>

            {/* Navegación centrada - Desktop */}
            <div className="hidden sm:flex sm:items-center sm:justify-center sm:flex-1">
              <div className="flex sm:space-x-4 lg:space-x-8">
                {getNavItems().map((item) => (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 bg-transparent border-b-2 border-transparent rounded-lg text-septy hover:bg-septy hover:text-white hover:border-transparent"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Logout button - Desktop */}
            <div className="items-center hidden sm:flex">
              <div className="flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-white transition-colors duration-200 bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 text-gray-400 rounded-md hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-septy"
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg
                    className="block w-6 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block w-6 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        <div className={`sm:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {getNavItems().map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-base font-medium text-left text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
              >
                {item.name}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="block w-full px-3 py-2 mt-4 text-base font-medium text-left text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="max-w-full overflow-x-hidden">{children}</div>
      </main>

      {/* Footer */}
      <footer className="mt-auto text-white border-t border-gray-700 bg-septy">
        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Información de la Empresa */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="mb-4 text-lg font-semibold text-white">
                🏥 Diagnóstico por Imágenes López
              </h3>
              <div className="space-y-3">
                <p className="flex items-start text-sm text-white">
                  <svg
                    className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="break-words">
                    Lobo de la Vega 301, Clinica del Pilar - Yerba Buena
                  </span>
                </p>
                <p className="flex items-center text-sm text-white">
                  <svg
                    className="flex-shrink-0 w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="break-words">(+54) 381 6020324</span>
                </p>
                <p className="flex items-center text-sm text-white">
                  <svg
                    className="flex-shrink-0 w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="break-words">
                    diagnosticolopez2026@gmail.com
                  </span>
                </p>
              </div>
            </div>

            {/* Redes Sociales */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                🔽 Síguenos en Redes Sociales
              </h3>
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-1 lg:grid-cols-3">
                <div className="text-center">
                  <a
                    href="https://www.instagram.com/lic.melirlopez/"
                    target="_blank"
                    className="flex flex-col items-center p-3 space-y-2 transition-all duration-300 transform rounded-md group bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105"
                    title="Instagram"
                  >
                    <FaInstagram className="w-5 h-5 text-white" />
                    <span className="text-xs font-medium text-white">
                      Instagram
                    </span>
                  </a>
                </div>
                <div className="text-center">
                  <a
                    href="https://wa.me/54912345678"
                    target="_blank"
                    className="flex flex-col items-center p-3 space-y-2 transition-all duration-300 transform rounded-md group bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105"
                    title="WhatsApp"
                  >
                    <FaWhatsapp className="w-5 h-5 text-white" />
                    <span className="text-xs font-medium text-white">
                      WhatsApp
                    </span>
                  </a>
                </div>
                <div className="text-center">
                  <a
                    href="https://www.facebook.com/profile.php?id=61570820751873"
                    target="_blank"
                    className="flex flex-col items-center p-3 space-y-2 transition-all duration-300 transform rounded-md group bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105"
                    title="Facebook"
                  >
                    <FaFacebook className="w-5 h-5 text-white" />
                    <span className="text-xs font-medium text-white">
                      Facebook
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* Desarrollador */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                💻 Desarrollo
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                  <div className="flex space-x-3">
                    <a
                      href="https://www.linkedin.com/in/pablo-ezequiel-harrod-b172423ab/"
                      target="_blank"
                      className="inline-flex items-center justify-center w-12 h-12 text-gray-400 transition-all duration-200 bg-gray-800 rounded-lg hover:bg-blue-600 hover:text-white group"
                      title="LinkedIn"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </a>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-white">
                      Pablo Ezequiel Harrod
                    </p>
                    <p className="text-xs text-white">
                      Desarrollador Full Stack
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
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
    </div>
  );
};

export default Layout;
