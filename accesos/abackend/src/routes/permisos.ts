import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { obtenerPermisos } from "../controllers/permisosController.js";
import { requirePermission } from "../middlewares/requirePermission.js";

const router = Router();

router.get("/", verifyToken, requirePermission("editar_configuracion"), obtenerPermisos);

export default router;
