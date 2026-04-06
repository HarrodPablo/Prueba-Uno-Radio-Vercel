// DicomViewer.jsx — versión WebP
// Ahora el backend sirve WebP directamente, no hace falta parsear el raw Agfa
// El visor simplemente carga la imagen con <img> y aplica filtros CSS para
// el ajuste de brillo/contraste (window/level equivalente)
// ─────────────────────────────────────────────────────────────
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import icon from "../assets/img/icon.png"

// ─── Helpers ───────────────────────────────────────────────────
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ─────────────────────────────────────────────────────────────
//  UPLOAD PANEL — igual que antes, no cambia
// ─────────────────────────────────────────────────────────────
function DicomUploadPanel({ studyId, onUploaded, currentFilename }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setStatus("idle");
      setErrorMsg("");
      setStats(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !studyId) return;
    setStatus("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`/api/studies/${studyId}/dicom`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) =>
          setProgress(Math.round((e.loaded / e.total) * 100)),
      });

      setStats(res.data);
      setStatus("done");
      onUploaded?.(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error ?? err.message);
      setStatus("error");
    }
  };

  return (
    <div className="pt-4 mt-4 border-t border-gray-700">
      <p className="mb-3 text-xs font-semibold tracking-widest text-gray-500 uppercase">
        Cargar imagen
      </p>

      {currentFilename && status !== "done" && (
        <p className="mb-2 text-xs text-gray-500 truncate">
          Actual: <span className="text-blue-400">{currentFilename}</span>
        </p>
      )}

      <div
        className="p-3 mb-2 text-center transition-colors border border-gray-600 border-dashed rounded-lg cursor-pointer hover:border-blue-500"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        {file ? (
          <div>
            <p className="text-xs font-medium text-white truncate">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Clic para seleccionar archivo Agfa DR100e
          </p>
        )}
      </div>

      {status === "uploading" && (
        <div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
            <div
              className="h-full transition-all bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Subiendo y convirtiendo a WebP... {progress}%
          </p>
        </div>
      )}

      {/* Resultado de compresión */}
      {status === "done" && stats && (
        <div className="p-2 mb-2 bg-gray-800 rounded">
          <p className="mb-1 text-xs font-medium text-green-400">
            ✓ Convertido a WebP
          </p>
          <p className="text-xs text-gray-400">
            {(stats.originalSize / 1024 / 1024).toFixed(1)} MB →{" "}
            {(stats.convertedSize / 1024).toFixed(0)} KB
            <span className="ml-1 text-green-400">
              (-{stats.compressionRatio})
            </span>
          </p>
          <p className="text-xs text-gray-500">
            {stats.width} × {stats.height} px
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="mb-2 text-xs text-red-400">✗ {errorMsg}</p>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || status === "uploading"}
        className={`w-full py-1.5 text-xs font-semibold rounded transition-colors ${
          !file || status === "uploading"
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : status === "done"
              ? "bg-green-700 text-white"
              : "bg-blue-600 text-white hover:bg-blue-500"
        }`}
      >
        {status === "uploading"
          ? `Procesando... ${progress}%`
          : status === "done"
            ? "✓ Completado"
            : "Subir y convertir"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DICOM VIEWER — versión WebP
//  Ya no parsea el raw Agfa. El backend sirve un WebP normal.
//  Window/Level se simula con filtros CSS: brightness + contrast
//  que son equivalentes perceptivos para diagnóstico web.
// ─────────────────────────────────────────────────────────────
const DicomViewer = ({
  studyId,
  studyType,
  notes: studyNotes = "",
  userRole = "PATIENT",
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [brightness, setBrightness] = useState(100); // Igual que Modo Foto
  const [contrast, setContrast] = useState(100); // Igual que Modo Foto
  const [invert, setInvert] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentFilename, setCurrentFilename] = useState(null);
  const [studyData, setStudyData] = useState(null);

  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Cargar datos del estudio
  useEffect(() => {
    if (!studyId) return;

    const loadStudyData = async () => {
      try {
        const response = await axios.get(`/api/unified`);
        const study = response.data.items.find(
          (item) => item.studyId === studyId,
        );
        if (study) {
          setStudyData(study);
        }
      } catch (error) {
        console.error("Error loading study data:", error);
      }
    };

    loadStudyData();
  }, [studyId]);

  // Cargar todas las imágenes del estudio
  useEffect(() => {
    if (!studyId) return;

    const loadAllImages = async () => {
      try {
        const response = await axios.get(`/api/studies/${studyId}/images`);
        setAllImages(response.data.images);
        setCurrentImageIndex(0); // Empezar con la primera imagen

        if (response.data.images.length > 0) {
          setCurrentFilename(response.data.images[0].originalName);
        }
      } catch (error) {
        console.error("Error loading study images:", error);
      }
    };

    loadAllImages();
  }, [studyId]);

  // Cargar imagen actual a través de axios para incluir autenticación
  useEffect(() => {
    if (!studyId || allImages.length === 0) return;

    const loadImage = async () => {
      try {
        setImgLoaded(false);
        setImgError(false);

        // Mantener valores actuales (brillo 100, contraste 100) - solo asegurar Modo RX
        setInvert(true);

        // Cargar la imagen actual usando su URL específica
        const currentImage = allImages[currentImageIndex];
        if (currentImage) {
          const response = await axios.get(currentImage.url, {
            responseType: "arraybuffer",
          });

          const blob = new Blob([response.data], { type: "image/webp" });
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setImgLoaded(true);
          setCurrentFilename(currentImage?.originalName || null);

          // Limpiar URL cuando el componente se desmonte
          return () => URL.revokeObjectURL(url);
        } else {
          setImgError(true);
          setImageUrl(null);
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setImgError(true);
        setImageUrl(null);
      }
    };

    loadImage();
  }, [studyId, currentImageIndex, allImages]); // Solo se ejecuta cuando cambia studyId

  // Funciones de navegación
  const goToNextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setZoom(1); // Resetear zoom al cambiar imagen
      setPan({ x: 0, y: 0 }); // Resetear pan
    }
  };

  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setZoom(1); // Resetear zoom al cambiar imagen
      setPan({ x: 0, y: 0 }); // Resetear pan
    }
  };

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && currentImageIndex < allImages.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.key === "ArrowLeft" && currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImageIndex, allImages]);

  // Zoom con rueda
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.1 : 0.9), 0.2, 10));
  }, []);

  // Registrar wheel sin passive
  const setContainerRef = useCallback(
    (el) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("wheel", handleWheel);
      }
      containerRef.current = el;
      if (el) {
        el.addEventListener("wheel", handleWheel, { passive: false });
      }
    },
    [handleWheel],
  );

  // Pan
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    setPan((p) => ({
      x: p.x + e.clientX - lastMouse.current.x,
      y: p.y + e.clientY - lastMouse.current.y,
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100); // Igual que Modo Foto
    setContrast(100); // Igual que Modo Foto
    setInvert(true); // Mantener Modo RX
    setRotation(0);
  };

  const canEdit = userRole === "ADMIN" || userRole === "DOCTOR";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-shrink-0 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10">
            <img src={icon} alt="icon" />
          </span>
          <div>
            <h3 className="font-semibold text-white text-s">
              {studyType ?? "Radiografía"}
            </h3>
            {allImages.length > 1 && (
              <p className="text-gray-400 text-s">
                Imagen {currentImageIndex + 1} de {allImages.length}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allImages.length > 1 && (
            <>
              <button
                onClick={goToPreviousImage}
                disabled={currentImageIndex === 0}
                className="px-2 py-1 text-xs text-white bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Imagen anterior (flecha izquierda)"
              >
                ◀
              </button>
              <button
                onClick={goToNextImage}
                disabled={currentImageIndex === allImages.length - 1}
                className="px-2 py-1 text-xs text-white bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Siguiente imagen (flecha derecha)"
              >
                ▶
              </button>
            </>
          )}
          <button
            onClick={() => setInvert((v) => !v)}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              invert
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            ⊙ {invert ? "Modo Foto" : "Modo RX"}
          </button>
          <button
            onClick={resetView}
            className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600"
          >
            ↺ Reset
          </button>
          <span className="px-2 py-1 font-mono text-xs text-gray-400 bg-gray-800 rounded">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* Visor Principal */}
        <div
          ref={setContainerRef}
          className="relative flex items-center justify-center flex-1 overflow-hidden bg-black cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Sin imagen */}
          {!imageUrl && (
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <span className="text-5xl">🩻</span>
              <p className="text-sm">
                {canEdit
                  ? "Sin imagen — cargá un archivo desde el panel lateral"
                  : "Sin imagen disponible"}
              </p>
            </div>
          )}

          {/* Error de carga */}
          {imageUrl && imgError && (
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <span className="text-5xl">🩻</span>
              <p className="text-sm">
                {canEdit
                  ? "Sin imagen aún — subí el archivo desde el panel"
                  : "Sin imagen disponible"}
              </p>
            </div>
          )}

          {/* Imagen WebP - simple img tag */}
          {imageUrl && (
            <img
              key={reloadKey}
              src={imageUrl}
              alt="DICOM study"
              onLoad={() => {
                setImgLoaded(true);
                setImgError(false);
              }}
              onError={() => {
                setImgLoaded(false);
                setImgError(true);
              }}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                imageRendering: zoom > 2 ? "pixelated" : "auto",
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(1)" : ""}`,
                display: imgError ? "none" : "block",
                maxWidth: "100%",
                maxHeight: "100%",
                userSelect: "none",
              }}
            />
          )}

          {/* Hint */}
          {imgLoaded && (
            <div className="absolute flex gap-3 text-xs text-gray-600 bottom-3 right-3">
              <span>🖱 Scroll = Zoom</span>
              <span>🖐 Arrastrar</span>
            </div>
          )}
        </div>

        {/* PANEL LATERAL */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto bg-gray-900 border-l border-gray-800 w-60">
          {/* Brillo / Contraste — equivalente al Window/Level */}
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Brillo / Contraste
          </p>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-400">Brillo</label>
              <span className="font-mono text-xs text-blue-400">
                {brightness}%
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={300}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-400">Contraste</label>
              <span className="font-mono text-xs text-blue-400">
                {contrast}%
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={400}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Presets clínicos */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Presets
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Auto", b: 100, c: 100 },
                { label: "Hueso", b: 80, c: 250 },
                { label: "Tejido", b: 130, c: 150 },
                { label: "Pulmón", b: 60, c: 300 },
              ].map(({ label, b, c }) => (
                <button
                  key={label}
                  onClick={() => {
                    setBrightness(b);
                    setContrast(c);
                  }}
                  className="py-1.5 text-xs font-medium text-gray-300 bg-gray-800 rounded hover:bg-gray-700 hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Zoom
            </p>
            <div className="flex gap-1.5">
              {[0.5, 1, 2, 4].map((z) => (
                <button
                  key={z}
                  onClick={() => {
                    setZoom(z);
                    setPan({ x: 0, y: 0 });
                  }}
                  className={`flex-1 py-1 text-xs rounded font-mono transition-colors ${
                    zoom === z
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {z}×
                </button>
              ))}
            </div>
          </div>
          {/* Rotación */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Rotación
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setRotation((r) => r - 90)}
                className="py-1 font-mono text-xs text-gray-400 transition-colors bg-gray-800 rounded hover:bg-gray-700"
              >
                ↺ 90°
              </button>
              <button
                onClick={() => setRotation((r) => r + 90)}
                className="py-1 font-mono text-xs text-gray-400 transition-colors bg-gray-800 rounded hover:bg-gray-700"
              >
                ↻ 90°
              </button>
              <button
                onClick={() => setRotation(0)}
                className="col-span-2 py-1 font-mono text-xs text-gray-400 transition-colors bg-gray-800 rounded hover:bg-gray-700"
              >
                ⟲ Reset
              </button>
            </div>
          </div>
          {/* Notas - Solo para DOCTOR y ADMIN */}
          {(studyData?.notes || studyNotes) && userRole !== "PATIENT" && (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Notas
              </p>
              <div className="p-2 text-xs leading-relaxed text-gray-400 break-words whitespace-normal bg-gray-800 rounded">
                {studyData?.notes || studyNotes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 mt-auto border-t border-gray-700">
            <p className="text-xs text-center text-gray-500">
              Diagnóstico por Imágenes López
            </p>
          </div>
          {/* Upload panel - Solo para ADMIN que puede subir */}
          {userRole !== "PATIENT" && userRole !== "DOCTOR" && studyId && (
            <DicomUploadPanel
              studyId={studyId}
              currentFilename={currentFilename}
              onUploaded={(data) => {
                setCurrentFilename(data.originalFilename ?? null);
                setImgLoaded(false);
                setImgError(false);
                setReloadKey((k) => k + 1); // fuerza recarga de la img
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DicomViewer;
