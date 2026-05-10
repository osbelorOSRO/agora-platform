import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { Eye, EyeOff } from "lucide-react";
import { setup2FAInit, setup2FAConfirmar } from "@/services/authService";
import { estilos } from "@/theme/estilos";
import LoginCard from "@/components/LoginCard";
import BackgroundAnimation from "@/components/BackgroundAnimation";

type Paso = 'credenciales' | 'qr' | 'confirmar' | 'exito';

export default function Setup2FA() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('credenciales');
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
      setPaso('qr');
    } catch (err: any) {
      setError(err.message || "Error al verificar las credenciales");
    }
  };

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await setup2FAConfirmar(form.username, form.bypassToken.toUpperCase(), form.totpCode);
      setPaso('exito');
    } catch (err: any) {
      setError(err.message || "Error al confirmar el código");
    }
  };

  return (
    <div className={estilos.login}>
      <div className={estilos.animacion}>
        <div className={estilos.animacionInner}><BackgroundAnimation /></div>
      </div>
      <div className={estilos.loginCol}>
        <LoginCard>
          {paso === 'credenciales' && (
            <form onSubmit={handleInit} className="space-y-6">
              <h2 className={estilos.loginCard.titulo}>Configurar autenticador</h2>
              <p className="text-xs text-gray-400">
                Ingresa el código que te entregó el administrador para configurar tu nueva app de autenticación.
              </p>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Código de reset 2FA</label>
                <input
                  type="text"
                  placeholder="Código entregado por el administrador"
                  value={form.bypassToken}
                  onChange={(e) => setForm({ ...form, bypassToken: e.target.value.toUpperCase() })}
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
                  placeholder="Contraseña actual"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className={`${estilos.loginCard.input} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className={estilos.loginCard.mensajeError}>{error}</p>}
              <button type="submit" className={estilos.loginCard.buttonPrimary}>Continuar</button>
              <button type="button" onClick={() => navigate("/login")} className={estilos.loginCard.buttonSecondary}>
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {paso === 'qr' && (
            <div className="space-y-6 text-center">
              <h2 className={estilos.loginCard.titulo}>Escanea el código QR</h2>
              <p className="text-xs text-gray-400">
                Abre tu app de autenticación (Google Authenticator, Authy, etc.) y escanea este código.
              </p>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded">
                  <QRCode value={otpauthUrl} size={180} />
                </div>
              </div>
              <button onClick={() => { setError(""); setPaso('confirmar'); }} className={estilos.loginCard.buttonPrimary}>
                Ya escaneé el código
              </button>
            </div>
          )}

          {paso === 'confirmar' && (
            <form onSubmit={handleConfirmar} className="space-y-6">
              <h2 className={estilos.loginCard.titulo}>Confirmar autenticador</h2>
              <p className="text-xs text-gray-400">
                Ingresa el código de 6 dígitos que muestra tu nueva app de autenticación.
              </p>
              <input
                type="text"
                placeholder="Código de 6 dígitos"
                value={form.totpCode}
                onChange={(e) => setForm({ ...form, totpCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                required
                maxLength={6}
                className={estilos.loginCard.input}
              />
              {error && <p className={estilos.loginCard.mensajeError}>{error}</p>}
              <button type="submit" className={estilos.loginCard.buttonPrimary}>Confirmar</button>
              <button type="button" onClick={() => setPaso('qr')} className={estilos.loginCard.buttonSecondary}>
                Volver al código QR
              </button>
            </form>
          )}

          {paso === 'exito' && (
            <div className="space-y-6 text-center">
              <h2 className={estilos.loginCard.titulo}>Autenticador configurado</h2>
              <p className="text-green-400 text-sm">Tu app de autenticación fue configurada correctamente.</p>
              <button onClick={() => navigate("/login")} className={estilos.loginCard.buttonPrimary}>
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </LoginCard>
      </div>
    </div>
  );
}
