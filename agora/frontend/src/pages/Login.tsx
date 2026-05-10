import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundAnimation from "@/components/BackgroundAnimation";
import { login, registrarUsuario } from "@/services/authService";
import { Eye, EyeOff } from "lucide-react";
import { estilos } from "@/theme/estilos";
import LoginCard from "@/components/LoginCard";
import { guardarToken } from "@/utils/getTokenData";

const MENSAJE_BLOQUEADO = "Cuenta bloqueada. Contacta al administrador del sistema.";

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "", token_2fa: "" });
  const [registerData, setRegisterData] = useState({ username: "", invitationToken: "", password: "", confirmarPassword: "" });
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const response = await login(loginData.username, loginData.password, loginData.token_2fa);
      guardarToken(response.token);
      setMensaje("Login exitoso 🔐");
      navigate("/accesos/welcome");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (registerData.password !== registerData.confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      const res = await registrarUsuario(
        registerData.username,
        registerData.invitationToken,
        registerData.password,
        registerData.confirmarPassword
      );
      localStorage.setItem("otpauth_url", res.secret_otpauth_url);
      navigate("/escaneo-qr");
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
    }
  };

  const estaBloqueado = error === MENSAJE_BLOQUEADO;

  return (
    <div className={estilos.login}>
      <div className={estilos.animacion}>
        <div className={estilos.animacionInner}>
          <BackgroundAnimation />
        </div>
      </div>
      <div className={estilos.loginCol}>
        <LoginCard>
          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <h2 className={estilos.loginCard.titulo}>Iniciar Sesión</h2>
              <input
                type="text"
                placeholder="Usuario"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
                className={estilos.loginCard.input}
              />
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  className={`${estilos.loginCard.input} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
                >
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <input
                type="text"
                placeholder="Token 2FA"
                value={loginData.token_2fa}
                onChange={(e) => setLoginData({ ...loginData, token_2fa: e.target.value })}
                className={estilos.loginCard.input}
              />
              {error && <p className={estilos.loginCard.mensajeError}>{error}</p>}
              {mensaje && <p className={estilos.loginCard.mensajeExito}>{mensaje}</p>}
              {estaBloqueado && (
                <p className="text-xs text-gray-400 text-center">
                  Tu cuenta ha sido bloqueada por intentos fallidos. Contacta al administrador del sistema para que la reactive.
                </p>
              )}
              <button type="submit" className={estilos.loginCard.buttonPrimary}>
                Acceder
              </button>
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setError(""); setMensaje(""); }}
                className={estilos.loginCard.buttonSecondary}
              >
                Registrarme
              </button>
              <div className="text-xs text-gray-400 text-center mt-2 space-y-1">
                <p>¿El administrador te dio un código de recuperación?</p>
                <div className="flex justify-center gap-4 mt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/reset-password")}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Cambiar contraseña
                  </button>
                  <span className="text-gray-600">·</span>
                  <button
                    type="button"
                    onClick={() => navigate("/setup-2fa")}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Configurar autenticador
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <h2 className={estilos.loginCard.titulo}>Registro</h2>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Código de invitación</label>
                <input
                  type="text"
                  placeholder="Código entregado por el administrador"
                  value={registerData.invitationToken}
                  onChange={(e) => setRegisterData({ ...registerData, invitationToken: e.target.value.toUpperCase() })}
                  required
                  className={estilos.loginCard.input}
                  maxLength={8}
                />
              </div>
              <input
                type="text"
                placeholder="Usuario"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                required
                className={estilos.loginCard.input}
              />
              <div className="relative">
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  className={`${estilos.loginCard.input} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
                >
                  {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showRegisterConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={registerData.confirmarPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmarPassword: e.target.value })}
                  required
                  className={`${estilos.loginCard.input} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
                >
                  {showRegisterConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className={estilos.loginCard.mensajeError}>{error}</p>}
              <button type="submit" className={estilos.loginCard.buttonPrimary}>
                Registrarme
              </button>
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setError(""); setMensaje(""); }}
                className={estilos.loginCard.buttonSecondary}
              >
                Iniciar Sesión
              </button>
            </form>
          )}
        </LoginCard>
      </div>
    </div>
  );
}

export default Login;
