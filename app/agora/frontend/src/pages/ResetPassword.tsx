import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import BackgroundAnimation from "@/components/BackgroundAnimation";
import { resetPassword } from "@/services/authService";

const inp = "w-full rounded-full border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-all";
const btnPrimary = "w-full rounded-full border-2 border-primary py-2.5 text-sm font-bold text-foreground transition-all hover:bg-primary/30 hover:border-primary active:scale-[0.98] focus:outline-none";
const btnSecondary = "w-full text-center text-sm text-muted-foreground hover:text-foreground underline transition-colors";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", resetToken: "", newPassword: "", confirmarPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      await resetPassword(form.username, form.resetToken.toUpperCase(), form.newPassword, form.confirmarPassword);
      setExito(true);
    } catch (err: any) {
      setError(err.message || "Error al resetear la contraseña");
    }
  };

  return (
    <div className="login-layout">
      <BackgroundAnimation />

      <div className="login-content">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 backdrop-blur-md p-8 shadow-2xl">
          <p className="page-label mb-1">Agora</p>

          {exito ? (
            <div className="space-y-4 mt-4 text-center">
              <h2 className="text-2xl font-black text-foreground">Contraseña actualizada</h2>
              <p className="text-emerald-400 text-sm">Tu contraseña fue cambiada correctamente.</p>
              <button onClick={() => navigate("/login")} className={btnPrimary}>
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <h2 className="text-2xl font-black text-foreground">Cambiar contraseña</h2>
              <p className="text-xs text-muted-foreground">Ingresa el código que te entregó el administrador.</p>

              <div>
                <label className="field-label">Código de reset</label>
                <input
                  type="text"
                  placeholder="Código entregado por el administrador"
                  value={form.resetToken}
                  onChange={(e) => setForm({ ...form, resetToken: e.target.value.toUpperCase() })}
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
                  placeholder="Nueva contraseña"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                  className={`${inp} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirmar nueva contraseña"
                  value={form.confirmarPassword}
                  onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })}
                  required
                  className={`${inp} pr-10`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-rose-400 text-sm">{error}</p>}

              <button type="submit" className={btnPrimary}>Cambiar contraseña</button>
              <button type="button" onClick={() => navigate("/login")} className={btnSecondary}>
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
