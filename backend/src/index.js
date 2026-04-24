// src/index.js — agregá compression() y sirve los uploads
import compression from "compression"; // npm install compression
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, ".env") });

// Importar rutas
import authRoutes from "./routes/auth.js";
import orthancRoutes from "./routes/orthancStudies.js";
import patientsRoutes from "./routes/patients.js";
import reportsRoutes from "./routes/reports.js";
import studiesRoutes from "./routes/studies.js";
import unifiedRoutes from "./routes/unified.js";
import usersRoutes from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ──────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://diagnostico-lopez.vercel.app",
      "https://www.diagnosticolopez.com", // <--- AGREGÁ ESTA LÍNEA
      "https://diagnosticolopez.com", // <--- Y ESTA (por las dudas)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Agregué OPTIONS y PATCH
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }),
);

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
app.use("/api/orthanc", orthancRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = app.listen(PORT, () => {});

server.on("error", (err) => {
  console.error("❌ Error iniciando servidor:", err?.message || err);
});

// Nodemon uses SIGUSR2 to restart; close the server gracefully to avoid EADDRINUSE
process.once("SIGUSR2", () => {
  server.close(() => {
    process.kill(process.pid, "SIGUSR2");
  });
});

export default app;
