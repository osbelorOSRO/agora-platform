import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "@/services/authService";
import { Eye, EyeOff } from "lucide-react";
import { estilos } from "@/theme/estilos";
import LoginCard from "@/components/LoginCard";
import BackgroundAnimation from "@/components/BackgroundAnimation";

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
    <div className={estilos.login}>
      <div className={estilos.animacion}>
        <div className={estilos.animacionInner}><BackgroundAnimation /></div>
      </div>
      <div className={estilos.loginCol}>
        <LoginCard>
          {exito ? (
            <div className="space-y-6 text-center">
              <h2 className={estilos.loginCard.titulo}>Contraseña actualizada</h2>
              <p className="text-green-400 text-sm">Tu contraseña fue cambiada correctamente.</p>
              <button onClick={() => navigate("/login")} className={estilos.loginCard.buttonPrimary}>
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className={estilos.loginCard.titulo}>Cambiar contraseña</h2>
              <p className="text-xs text-gray-400">Ingresa el código que te entregó el administrador.</p>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Código de reset</label>
                <input
                  type="text"
                  placeholder="Código entregado por el administrador"
                  value={form.resetToken}
                  onChange={(e) => setForm({ ...form, resetToken: e.target.value.toUpperCase() })}
                  required
                  maxLength={8}
                  className={estilos.loginCard.input}
                />
              </div>
              <input
                type="text"
                placeholder="Usuario"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                className={estilos.loginCard.input}
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nueva contraseña"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                  className={`${estilos.loginCard.input} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirmar nueva contraseña"
                  value={form.confirmarPassword}
                  onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })}
                  required
                  className={`${estilos.loginCard.input} pr-10`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900">
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className={estilos.loginCard.mensajeError}>{error}</p>}
              <button type="submit" className={estilos.loginCard.buttonPrimary}>Cambiar contraseña</button>
              <button type="button" onClick={() => navigate("/login")} className={estilos.loginCard.buttonSecondary}>
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </LoginCard>
      </div>
    </div>
  );
}
