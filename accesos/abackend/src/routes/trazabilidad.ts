import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { getProcesosPorCliente } from "../controllers/trazabilidad.controller.js";

const router = Router();

router.get("/cliente/:cliente_id", verifyToken, getProcesosPorCliente);

export default router;
