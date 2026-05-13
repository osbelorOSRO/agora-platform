import { Router } from "express";
import { register } from "../controllers/RegisterController.js";
import { login } from "../controllers/LoginController.js";
import { me } from "../controllers/MeController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requirePermission, requireRoles } from "../middlewares/requirePermission.js";
import { listarSesionesActivas, listarTodasSesionesActivas, cerrarSesionAdmin, logout, registrarSesion } from "../controllers/SessionsController.js";
import { actualizarUltimaInteraccion } from "../middlewares/actualizarUltimaInteraccion.js";
import { registrarUsuario } from "../controllers/preRegistroController.js";
import { obtenerUsuarios, actualizarUsuario } from "../controllers/usuariosController.js";
import { resetPassword as adminResetPassword, reset2FA, desbloquear, regenerarInvitacion, cancelarPreregistro } from "../controllers/credencialesAdminController.js";
import { resetPassword, setup2FAInit, setup2FAConfirmar } from "../controllers/recuperacionController.js";
import { limitadorLogin, limitadorRecuperacion, limitadorRegistro, limitadorSesionesAdmin } from "../utils/rateLimiter.js";

const router = Router();

// Auth pública
router.post("/login", limitadorLogin, login);
router.post("/registrar-usuario", limitadorRegistro, registrarUsuario);
router.post("/reset-password", limitadorRecuperacion, resetPassword);
router.post("/setup-2fa/init", limitadorRecuperacion, setup2FAInit);
router.post("/setup-2fa/confirmar", limitadorRecuperacion, setup2FAConfirmar);

// Auth privada
router.get("/me", verifyToken, me);
router.post("/registrar-sesion", verifyToken, registrarSesion);
router.get("/sesiones-activas", verifyToken, actualizarUltimaInteraccion, listarSesionesActivas);
router.delete("/logout", verifyToken, actualizarUltimaInteraccion, logout);

// Sesiones admin (superadmin / admin / supervisor)
router.get("/sesiones-activas-admin", verifyToken, requireRoles("superadmin", "admin", "supervisor"), limitadorSesionesAdmin, listarTodasSesionesActivas);
router.delete("/sesiones/:id", verifyToken, requireRoles("superadmin", "admin", "supervisor"), limitadorSesionesAdmin, cerrarSesionAdmin);

// Gestión de usuarios (SuperAdmin)
router.post("/preregistrar-usuario", verifyToken, requirePermission("editar_configuracion"), register);
router.get("/usuarios", verifyToken, requirePermission("editar_configuracion"), obtenerUsuarios);
router.patch("/usuarios/:id", verifyToken, requirePermission("editar_configuracion"), actualizarUsuario);
router.post("/usuarios/:id/reset-password", verifyToken, requirePermission("editar_configuracion"), adminResetPassword);
router.post("/usuarios/:id/reset-2fa", verifyToken, requirePermission("editar_configuracion"), reset2FA);
router.post("/usuarios/:id/desbloquear", verifyToken, requirePermission("editar_configuracion"), desbloquear);
router.post("/usuarios/:id/regenerar-invitacion", verifyToken, requirePermission("editar_configuracion"), regenerarInvitacion);
router.delete("/usuarios/:id/preregistro", verifyToken, requirePermission("editar_configuracion"), cancelarPreregistro);

export default router;
