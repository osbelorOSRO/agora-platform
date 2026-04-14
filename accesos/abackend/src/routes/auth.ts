import { Router } from "express";
import { register } from "../controllers/RegisterController.js";
import { login } from "../controllers/LoginController.js";
import { me } from "../controllers/MeController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { listarSesionesActivas, logout, registrarSesion } from "../controllers/SessionsController.js";
import { actualizarUltimaInteraccion } from "../middlewares/actualizarUltimaInteraccion.js";
import { registrarUsuario } from '../controllers/preRegistroController.js';
import { obtenerUsuarios, actualizarUsuario } from "../controllers/usuariosController.js";
import {
  obtenerOficinas,
  crearOficina,
  actualizarOficina,
} from '../controllers/oficinasController.js';

const router = Router();

router.post("/preregistrar-usuario", verifyToken, requirePermission("editar_configuracion"), register);
router.post("/login", login);
router.get("/me", verifyToken, me);
router.post("/registrar-sesion", verifyToken, registrarSesion);
router.get(
  "/sesiones-activas",
  verifyToken,
  actualizarUltimaInteraccion,
  listarSesionesActivas
);
router.post('/registrar-usuario', registrarUsuario);

router.delete(
  "/logout",
  verifyToken,
  actualizarUltimaInteraccion,
  logout
);
router.get("/usuarios", verifyToken, requirePermission("editar_configuracion"), obtenerUsuarios);
router.patch("/usuarios/:id", verifyToken, requirePermission("editar_configuracion"), actualizarUsuario);
router.get('/oficinas', obtenerOficinas);
router.post('/oficinas', crearOficina);
router.put('/oficinas/:id', actualizarOficina);

export default router;
