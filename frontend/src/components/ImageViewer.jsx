import { useEffect, useRef, useState } from "react";

const ImageViewer = ({ imageUrl, studyType, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();

    img.onload = () => {
      setIsLoading(false);
      setError(null);
      // Reset position and zoom when new image loads
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };

    img.onerror = () => {
      setError("No se pudo cargar la imagen");
      setIsLoading(false);
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);
    setZoom(newZoom);
  };

  const handleMouseDown = (e) => {
    if (e.button === 1) {
      // Middle mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleContrast = (e) => {
    if (imageRef.current) {
      const currentFilter =
        imageRef.current.style.filter || "contrast(100%) brightness(100%)";
      const contrast = parseInt(
        currentFilter.match(/contrast\((\d+)%\)/)?.[1] || 100,
      );
      const brightness = parseInt(
        currentFilter.match(/brightness\((\d+)%\)/)?.[1] || 100,
      );

      if (e.shiftKey) {
        // Adjust brightness
        const newBrightness = Math.min(
          Math.max(brightness + (e.deltaY > 0 ? -10 : 10), 10),
          200,
        );
        imageRef.current.style.filter = `contrast(${contrast}%) brightness(${newBrightness}%)`;
      } else {
        // Adjust contrast
        const newContrast = Math.min(
          Math.max(contrast + (e.deltaY > 0 ? -10 : 10), 10),
          200,
        );
        imageRef.current.style.filter = `contrast(${newContrast}%) brightness(${brightness}%)`;
      }
    }
  };

  const handleZoomIn = () => {
    setZoom(zoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoom(zoom / 1.2);
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotateLeft = () => {
    // Add rotation logic here
  };

  const handleRotateRight = () => {
    // Add rotation logic here
  };

  const handleInvert = () => {
    if (imageRef.current) {
      const currentFilter =
        imageRef.current.style.filter || "contrast(100%) brightness(100%)";
      const contrast = parseInt(
        currentFilter.match(/contrast\((\d+)%\)/)?.[1] || 100,
      );
      const brightness = parseInt(
        currentFilter.match(/brightness\((\d+)%\)/)?.[1] || 100,
      );
      const invert = currentFilter.includes("invert(1)");

      imageRef.current.style.filter = `contrast(${contrast}%) brightness(${brightness}%) ${invert ? "" : "invert(1)"}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 text-white bg-gray-800 rounded-t-lg">
          <div>
            <h3 className="text-lg font-semibold">Visor de Radiografía</h3>
            <p className="text-sm text-gray-300">{studyType}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm transition-colors bg-red-500 rounded hover:bg-red-600"
          >
            Cerrar
          </button>
        </div>

        {/* Main Content */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden bg-gray-900"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                <p>Cargando imagen...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="inline-block p-4 mb-4 bg-red-500 rounded-full">
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
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div
              className="flex items-center justify-center w-full h-full"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: "center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Radiografía"
                className="object-contain max-w-full max-h-full"
                style={{ filter: "contrast(100%) brightness(100%)" }}
                onWheel={handleContrast}
                draggable={false}
              />
            </div>
          )}

          {/* Zoom Indicator */}
          {!isLoading && !error && (
            <div className="absolute px-3 py-1 text-sm text-white bg-black bg-opacity-50 rounded top-4 right-4">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center px-4 py-2 space-x-2 bg-gray-100 border-b">
          <button
            onClick={handleZoomIn}
            className="p-2 transition-colors bg-white rounded hover:bg-gray-200"
            title="Acercar"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>

          <button
            onClick={handleZoomOut}
            className="p-2 transition-colors bg-white rounded hover:bg-gray-200"
            title="Alejar"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>

          <button
            onClick={handleReset}
            className="p-2 transition-colors bg-white rounded hover:bg-gray-200"
            title="Restablecer"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          <button
            onClick={handleRotateLeft}
            className="p-2 transition-colors bg-white rounded hover:bg-gray-200"
            title="Rotar izquierda"
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
                d="M3 4v5h5M6 9a9 9 0 0111.5 7.5"
              />
            </svg>
          </button>

          <button
            onClick={handleRotateRight}
            className="p-2 transition-colors bg-white rounded hover:bg-gray-200"
            title="Rotar derecha"
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
                d="M21 4v5h-5M18 9a9 9 0 00-11.5 7.5"
              />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          <button
            onClick={handleInvert}
            className="p-2 transition-colors bg-white rounded hover:bg-gray-200"
            title="Invertir colores"
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Image Container */}
        <div className="relative bg-gray-900" style={{ height: "600px" }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto border-b-2 border-white rounded-full animate-spin"></div>
                <p className="mt-4 text-white">Cargando imagen...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-white">{error}</p>
              </div>
            </div>
          )}

          <div
            ref={imageElementRef}
            className="w-full h-full"
            style={{ display: isLoading || error ? "none" : "block" }}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 text-sm text-gray-600 bg-gray-100">
          <div className="flex items-center justify-between">
            <span>Controles:</span>
            <div className="flex space-x-4 text-xs">
              <span>🖱️ Izq: Ajustar contraste</span>
              <span>🖱️ Centro: Mover</span>
              <span>🖱️ Der: Zoom</span>
              <span>⌨️ Scroll: Navegar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
