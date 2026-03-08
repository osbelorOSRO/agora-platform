import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { Eye, EyeOff } from "lucide-react";

const EscaneoQR: React.FC = () => {
  const navigate = useNavigate();
  const [secretUrl, setSecretUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const otpauthUrl = localStorage.getItem("otpauth_url");
    if (!otpauthUrl) {
      navigate("/login");
    } else {
      setSecretUrl(otpauthUrl);
    }
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <div className="bg-white p-6 rounded shadow-lg text-center text-black max-w-md w-full">
        <h1 className="text-xl font-bold mb-4">Escanea el código QR</h1>
        <p className="mb-6">
          Escanea este código QR con tu app de autenticación (Google Authenticator, Authy, etc)
        </p>
        {secretUrl ? (
          <div className="inline-block bg-white p-4 mb-6">
            <QRCode value={secretUrl} />
          </div>
        ) : (
          <p className="text-red-500 mb-6">No se encontró el código QR. Intenta registrarte nuevamente.</p>
        )}

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña (ejemplo de uso ojo)"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-3 rounded border border-gray-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Volver al Login
        </button>
      </div>
    </div>
  );
};

export default EscaneoQR;
