import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import QRCode from "react-qr-code";
import BackgroundAnimation from "@/components/BackgroundAnimation";
import { setup2FAInit, setup2FAConfirmar } from "@/services/authService";

const inp = "w-full rounded-full border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-all";
const btnPrimary = "w-full rounded-full border-2 border-primary py-2.5 text-sm font-bold text-foreground transition-all hover:bg-primary/30 hover:border-primary active:scale-[0.98] focus:outline-none";
const btnSecondary = "w-full text-center text-sm text-muted-foreground hover:text-foreground underline transition-colors";

type Paso = "credenciales" | "qr" | "confirmar" | "exito";

export default function Setup2FA() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [form, setForm] = useState({ username: "", password: "", bypassToken: "", totpCode: "" });
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await setup2FAInit(form.username, form.password, form.bypassToken.toUpperCase());
      setOtpauthUrl(res.otpauth_url);
      setPaso("qr");
    } catch (err: any) {
      setError(err.message || "Error al verificar las credenciales");
    }
  };

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await setup2FAConfirmar(form.username, form.bypassToken.toUpperCase(), form.totpCode);
      setPaso("exito");
    } catch (err: any) {
      setError(err.message || "Error al confirmar el código");
    }
  };

  return (
    <div className="login-layout">
      <BackgroundAnimation />

      <div className="login-content">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 backdrop-blur-md p-8 shadow-2xl">
          <p className="page-label mb-1">Agora</p>

          {paso === "credenciales" && (
            <form onSubmit={handleInit} className="space-y-4 mt-4">
              <h2 className="text-2xl font-black text-foreground">Configurar autenticador</h2>
              <p className="text-xs text-muted-foreground">
                Ingresa el código que te entregó el administrador para configurar tu nueva app de autenticación.
              </p>

              <div>
                <label className="field-label">Código de reset 2FA</label>
                <input
                  type="text"
                  placeholder="Código entregado por el administrador"
                  value={form.bypassToken}
                  onChange={(e) => setForm({ ...form, bypassToken: e.target.value.toUpperCase() })}
                  required
                  maxLength={8}
                  className={inp}
                />
              </div>

              <input
                type="text"
                placeholder="Usuario"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                className={inp}
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña actual"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className={`${inp} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-rose-400 text-sm">{error}</p>}

              <button type="submit" className={btnPrimary}>Continuar</button>
              <button type="button" onClick={() => navigate("/login")} className={btnSecondary}>
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {paso === "qr" && (
            <div className="space-y-4 mt-4 text-center">
              <h2 className="text-2xl font-black text-foreground">Escanea el código QR</h2>
              <p className="text-xs text-muted-foreground">
                Abre tu app de autenticación (Google Authenticator, Authy, etc.) y escanea este código.
              </p>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <QRCode value={otpauthUrl} size={180} />
                </div>
              </div>
              <button onClick={() => { setError(""); setPaso("confirmar"); }} className={btnPrimary}>
                Ya escaneé el código
              </button>
            </div>
          )}

          {paso === "confirmar" && (
            <form onSubmit={handleConfirmar} className="space-y-4 mt-4">
              <h2 className="text-2xl font-black text-foreground">Confirmar autenticador</h2>
              <p className="text-xs text-muted-foreground">
                Ingresa el código de 6 dígitos que muestra tu nueva app de autenticación.
              </p>
              <input
                type="text"
                placeholder="Código de 6 dígitos"
                value={form.totpCode}
                onChange={(e) => setForm({ ...form, totpCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                required
                maxLength={6}
                className={inp}
              />
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              <button type="submit" className={btnPrimary}>Confirmar</button>
              <button type="button" onClick={() => setPaso("qr")} className={btnSecondary}>
                Volver al código QR
              </button>
            </form>
          )}

          {paso === "exito" && (
            <div className="space-y-4 mt-4 text-center">
              <h2 className="text-2xl font-black text-foreground">Autenticador configurado</h2>
              <p className="text-emerald-400 text-sm">Tu app de autenticación fue configurada correctamente.</p>
              <button onClick={() => navigate("/login")} className={btnPrimary}>
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
