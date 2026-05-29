import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import BackgroundAnimation from "@/components/BackgroundAnimation";
import { login, registrarUsuario } from "@/services/authService";
import { guardarToken } from "@/utils/getTokenData";
import { storage } from "@/lib/storage";

const inp = "w-full rounded-full border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all";
const btnPrimary = "w-full rounded-full border-2 border-primary py-2.5 text-sm font-bold text-foreground transition-all hover:bg-primary/30 hover:border-primary active:scale-[0.98] focus:outline-none";
const btnSecondary = "w-full text-center text-sm text-muted-foreground hover:text-foreground underline transition-colors";

const MENSAJE_BLOQUEADO = "Cuenta bloqueada. Contacta al administrador del sistema.";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "", token_2fa: "" });
  const [registerData, setRegisterData] = useState({ username: "", invitationToken: "", password: "", confirmarPassword: "" });
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const response = await login(loginData.username, loginData.password, loginData.token_2fa);
      guardarToken(response.token);
      setMensaje("Login exitoso");
      navigate("/accesos/welcome");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
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
      storage.setOtpUrl(res.secret_otpauth_url);
      navigate("/escaneo-qr");
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
    }
  };

  const estaBloqueado = error === MENSAJE_BLOQUEADO;

  return (
    <div className="login-layout">
      <BackgroundAnimation />

      <div className="login-content">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl">
          <p className="page-label mb-1">Agora</p>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <h2 className="text-2xl font-black text-foreground">Iniciar sesión</h2>

              <input
                type="text"
                placeholder="Usuario"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
                className={inp}
              />

              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  className={`${inp} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <input
                type="text"
                placeholder="Token 2FA"
                value={loginData.token_2fa}
                onChange={(e) => setLoginData({ ...loginData, token_2fa: e.target.value })}
                className={inp}
              />

              {error && <p className="text-rose-400 text-sm">{error}</p>}
              {mensaje && <p className="text-emerald-400 text-sm">{mensaje}</p>}
              {estaBloqueado && (
                <p className="text-xs text-muted-foreground text-center">
                  Tu cuenta fue bloqueada por intentos fallidos. Contacta al administrador para reactivarla.
                </p>
              )}

              <button type="submit" className={btnPrimary}>Acceder</button>

              <button
                type="button"
                onClick={() => { setIsRegistering(true); setError(""); setMensaje(""); }}
                className={btnSecondary}
              >
                Registrarme con código de invitación
              </button>

              <div className="border-t border-border mt-2 pt-4">
                <p className="text-xs text-center text-muted-foreground mb-2">¿Tienes un código de recuperación?</p>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate("/reset-password")}
                    className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Cambiar contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/setup-2fa")}
                    className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Configurar autenticador
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <h2 className="text-2xl font-black text-foreground">Registro</h2>

              <div>
                <label className="field-label">Código de invitación</label>
                <input
                  type="text"
                  placeholder="Código entregado por el administrador"
                  value={registerData.invitationToken}
                  onChange={(e) => setRegisterData({ ...registerData, invitationToken: e.target.value.toUpperCase() })}
                  required
                  maxLength={8}
                  className={inp}
                />
              </div>

              <input
                type="text"
                placeholder="Usuario"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                required
                className={inp}
              />

              <div className="relative">
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  className={`${inp} pr-10`}
                />
                <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showRegisterConfirm ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={registerData.confirmarPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmarPassword: e.target.value })}
                  required
                  className={`${inp} pr-10`}
                />
                <button type="button" onClick={() => setShowRegisterConfirm(!showRegisterConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showRegisterConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-rose-400 text-sm">{error}</p>}

              <button type="submit" className={btnPrimary}>Registrarme</button>
              <button type="button" onClick={() => { setIsRegistering(false); setError(""); }}
                className={btnSecondary}>
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
