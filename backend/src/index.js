import cors from "cors";
import "dotenv/config";
import express from "express";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg"; // Necesitás importar pg para el adaptador
// 1. Borramos dotenv.config(), ya no es necesario por el import de arriba.

const app = express();

// 2. Configuración del Adaptador de Prisma (Neon usa Postgres)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Aumentado para imágenes base64
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. Rutas (Cambiamos 'require' por 'import' dinámico o estático)
// IMPORTANTE: Asegurate de que estos archivos existan y usen 'export default'
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import reportRoutes from "./routes/reports.js";
import studyRoutes from "./routes/studies.js";
import unifiedRoutes from "./routes/unified.js";
import userRoutes from "./routes/users.js";

app.get("/", (req, res) => {
  res.json({ message: "Portal Médico API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/users", userRoutes);
app.use("/api/studies", studyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/unified", unifiedRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
