import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import {
  obtenerRoles,
  obtenerRolPorId,
  crearRol,
  actualizarRol,
} from "../controllers/rolesController.js";

const router = Router();

router.get("/", verifyToken, requirePermission("editar_configuracion"), obtenerRoles);
router.get("/:id", verifyToken, requirePermission("editar_configuracion"), obtenerRolPorId);
router.post("/", verifyToken, requirePermission("editar_configuracion"), crearRol);
router.put("/:id", verifyToken, requirePermission("editar_configuracion"), actualizarRol);

export default router;
