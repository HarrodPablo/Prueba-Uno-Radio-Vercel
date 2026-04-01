// src/index.js — agregá compression() y sirve los uploads
import compression from "compression"; // npm install compression
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Importar rutas
import authRoutes from "./routes/auth.js";
import patientsRoutes from "./routes/patients.js";
import reportsRoutes from "./routes/reports.js";
import studiesRoutes from "./routes/studies.js";
import unifiedRoutes from "./routes/unified.js";
import usersRoutes from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ──────────────────────────────────────
app.use(cors());

// GZIP — comprime TODAS las respuestas automáticamente
// Los WebP ya están comprimidos, pero comprime JSON, JS, etc.
// Para binarios grandes usa threshold alto para no gastar CPU
app.use(
  compression({
    threshold: 10 * 1024, // solo comprimir si > 10KB
    filter: (req, res) => {
      // No comprimir WebP (ya están comprimidos internamente)
      if (res.getHeader("Content-Type")?.includes("image/webp")) return false;
      return compression.filter(req, res);
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Servir archivos de uploads (WebP) ───────────────────────
// Esto permite que el frontend pueda acceder a las imágenes
// directamente via /uploads/radiografias/archivo.webp
// (opcional si preferís servirlos solo via la API)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"), {
    maxAge: "1h", // cachear en browser 1 hora
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      }
    },
  }),
);

// ─── Rutas ────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/studies", studiesRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/unified", unifiedRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

export default app;
