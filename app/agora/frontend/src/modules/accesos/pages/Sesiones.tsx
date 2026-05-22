import { useEffect, useState, useCallback } from "react";
import { LogOut, RefreshCw, Monitor } from "lucide-react";
import { obtenerSesionesActivas, cerrarSesion, type SesionActiva } from "../services/sesionesService";

const POLL_INTERVAL = 30_000;

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parsearDispositivo(ua: string): string {
  if (!ua || ua === "desconocido") return "Desconocido";
  if (/mobile|android/i.test(ua)) return "Móvil";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return "Escritorio";
}

export default function Sesiones() {
  const [sesiones, setSesiones] = useState<SesionActiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerSesionesActivas();
      setSesiones(data);
      setError(null);
    } catch {
      setError("No se pudo cargar las sesiones activas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [cargar]);

  const handleCerrar = async (id: number) => {
    if (!confirm("¿Cerrar esta sesión?")) return;
    setCerrando(id);
    try {
      await cerrarSesion(id);
      setSesiones((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("No se pudo cerrar la sesión.");
    } finally {
      setCerrando(null);
    }
  };

  return (
    <section className="space-y-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sesiones activas</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#999999]">
            Sesiones con token vigente. Se actualiza cada 30 segundos.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white"
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-[#5C1A1A] bg-[#1A0A0A] px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-[#666666]">Cargando...</p>
      ) : sesiones.length === 0 ? (
        <p className="text-sm text-[#666666]">No hay sesiones activas.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Dispositivo</th>
                <th className="px-4 py-3">Inicio sesión</th>
                <th className="px-4 py-3">Última actividad</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B1B1B]">
              {sesiones.map((s) => (
                <tr key={s.id} className="transition hover:bg-[#141414]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {s.usuario.nombre} {s.usuario.apellido}
                    </div>
                    <div className="text-xs text-[#666666]">{s.usuario.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#B3B3B3]">
                      {s.usuario.rol ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#B3B3B3]">{s.ip}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-[#B3B3B3]">
                      <Monitor size={13} />
                      {parsearDispositivo(s.userAgent)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#999999]">{formatFecha(s.horaLogin)}</td>
                  <td className="px-4 py-3 text-xs text-[#999999]">{formatFecha(s.ultimaInteraccion)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleCerrar(s.id)}
                      disabled={cerrando === s.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[#5C1A1A] bg-[#1A0A0A] px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-[#2A1010] disabled:opacity-40"
                    >
                      <LogOut size={12} />
                      {cerrando === s.id ? "Cerrando..." : "Cerrar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[#4D4D4D]">
        Total: {sesiones.length} sesión{sesiones.length !== 1 ? "es" : ""} activa{sesiones.length !== 1 ? "s" : ""}
      </p>
    </section>
  );
}
