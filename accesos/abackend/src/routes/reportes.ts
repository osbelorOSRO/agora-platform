import { Router } from "express";
import {
  listarCatalogoReportes,
  reporteClientesInfo,
  reporteDesempeno,
  reportePreciosPlanes,
  reporteProcesos,
  reporteProcesosSemanales,
} from "../controllers/reportesController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requirePermission } from "../middlewares/requirePermission.js";

const router = Router();

router.use(verifyToken, requirePermission("ver_reportes"));

router.get("/", listarCatalogoReportes);
router.get("/procesos", reporteProcesos);
router.get("/desempeno", reporteDesempeno);
router.get("/procesos-semanales", reporteProcesosSemanales);
router.get("/precios-planes", reportePreciosPlanes);
router.get("/clientes-info", reporteClientesInfo);

export default router;
