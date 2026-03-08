import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  getProductividadAgente,
  getTodosLosProcesos,
  getResumenProcesosPorUsuarioPeriodo // ← IMPORTAR EL NUEVO HANDLER
} from "../controllers/productividad.controller.js";

const router = Router();

router.get("/agente/:usuario_id", verifyToken, getProductividadAgente);
router.get("/procesos", verifyToken, getTodosLosProcesos);
router.get("/resumen", verifyToken, getResumenProcesosPorUsuarioPeriodo); // ← AGREGAR ESTA LÍNEA

export default router;
