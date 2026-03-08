import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  obtenerRoles,
  obtenerRolPorId,
  crearRol,
  actualizarRol,
} from "../controllers/rolesController.js";

const router = Router();

router.get("/", verifyToken, obtenerRoles);
router.get("/:id", verifyToken, obtenerRolPorId);
router.post("/", verifyToken, crearRol);
router.put("/:id", verifyToken, actualizarRol);

export default router;
