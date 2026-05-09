import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import helmet from "helmet";
import rolesRoutes from "./routes/roles.js";
import permisosRoutes from "./routes/permisos.js";
import serviceAuthRoutes from "./routes/serviceAuth.js";
import reportesRoutes from "./routes/reportes.js";
import prisma from "./utils/prisma.js";

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Seguridad + parsing
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Rutas API
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.status(200).json({ ok: true, db: "up" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/service-auth", serviceAuthRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/reportes", reportesRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({ error: 'Payload demasiado grande' });
    return;
  }
  console.error('Error interno:', err?.message ?? err);
  res.status(err?.status ?? 500).json({ error: 'Error interno' });
});

// Puerto
const PORT = process.env.PORT || 4002;

const start = async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    console.log("✅ Smoke check DB OK");
  } catch (error) {
    console.error("⚠️ Smoke check DB falló al iniciar:", error);
  }

  app.listen(PORT, () => {
    console.log(`✅ Backend corriendo en el puerto ${PORT}`);
  });
};

start();
