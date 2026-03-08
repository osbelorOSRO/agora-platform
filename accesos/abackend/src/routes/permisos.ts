import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { obtenerPermisos } from "../controllers/permisosController.js";

const router = Router();

router.get("/", verifyToken, obtenerPermisos);

export default router;
