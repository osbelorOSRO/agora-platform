import { useEffect, useMemo, useState } from "react";
import { Bot, Clock3, Lock, LogOut, QrCode, RefreshCw, ShieldBan, Wrench } from "lucide-react";
import { hasPermission } from "@/utils/permissions";
import { getTokenData } from "@/utils/getTokenData";
import { useWaDashboard } from "../hooks/useWaDashboard";

const relativeTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDuration = (ms?: number | null) => {
  if (!ms || ms <= 0) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

export default function WaControlPage() {
  const user = getTokenData();
  const permissions = user?.permisos ?? [];
  const canManageBot = hasPermission("control_bot", permissions);
  const [numeroBloqueo, setNumeroBloqueo] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());

  const {
    estado,
    stats,
    config,
    qrImage,
    qrStatus,
    logs,
    available,
    connected,
    generarQr,
    reiniciar,
    cerrarSesion,
    bloquear,
    desbloquear,
    refrescarStats,
  } = useWaDashboard();

  const estatus = useMemo(() => {
    if (!available) return { label: "No disponible", color: "bg-red-500" };
    if (estado?.conexion === "open") return { label: "Conectado", color: "bg-emerald-500" };
    return { label: "Desconectado", color: "bg-amber-500" };
  }, [available, estado?.conexion]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const tiempoConectadoMs = useMemo(() => {
    if (estado?.conexion !== "open") return 0;
    if (typeof estado?.connectedDurationMs === "number" && estado.connectedDurationMs > 0) {
      return estado.connectedDurationMs;
    }
    if (estado?.connectedSince) {
      const connectedAt = new Date(estado.connectedSince).getTime();
      if (!Number.isNaN(connectedAt)) {
        return Math.max(0, nowTick - connectedAt);
      }
    }
    return 0;
  }, [estado?.conexion, estado?.connectedDurationMs, estado?.connectedSince, nowTick]);

  return (
    <section className="space-y-6 text-white">
      <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
              WA Control
            </p>
            <h1 className="mt-2 text-3xl font-bold">Control operativo del bot</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Integracion nativa del dashboard de `wa-backend`. Aqui se concentran
              estado, QR, controles y trazas recientes.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${estatus.color}`} />
            <span>{estatus.label}</span>
            <span className="text-white/45">/</span>
            <span>{connected ? "Socket activo" : "Socket sin conexion"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Numero vinculado", value: estado?.numero ? `+${estado.numero}` : "Esperando conexion", Icon: Bot },
          { label: "Mensajes recibidos", value: String(stats?.mensajesRecibidos ?? 0), Icon: Bot },
          { label: "Mensajes enviados", value: String(stats?.mensajesEnviados ?? 0), Icon: Bot },
          {
            label: "Tiempo conectado",
            value: formatDuration(tiempoConectadoMs),
            Icon: Clock3,
          },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-black/20 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-white/70">
              <Icon className="h-5 w-5" />
              <span className="text-xs uppercase tracking-[0.24em]">{label}</span>
            </div>
            <div className="mt-4 text-2xl font-semibold text-white">{value}</div>
            {label === "Tiempo conectado" ? (
              <div className="mt-2 text-xs text-white/55">
                Último mensaje: {relativeTime(stats?.ultimoMensaje ?? estado?.ultimoMensaje)}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {qrStatus ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {qrStatus.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Controles</h2>
              <p className="mt-2 text-sm text-white/70">
                {canManageBot
                  ? "Tienes control total sobre las acciones del bot."
                  : "Tu acceso es informativo. Las acciones operativas estan bloqueadas."}
              </p>
            </div>

            <button
              type="button"
              onClick={refrescarStats}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Refrescar
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Generar QR",
                Icon: QrCode,
                onClick: generarQr,
              },
              {
                label: "Reiniciar bot",
                Icon: RefreshCw,
                onClick: reiniciar,
              },
              {
                label: "Cerrar sesion",
                Icon: LogOut,
                onClick: cerrarSesion,
              },
            ].map(({ label, Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                disabled={!canManageBot}
                className="rounded-[22px] border border-white/10 bg-white/5 p-5 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-6 w-6" />
                <div className="mt-4 text-lg font-semibold">{label}</div>
                {!canManageBot ? (
                  <div className="mt-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    <Lock className="h-3.5 w-3.5" />
                    Solo lectura
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <ShieldBan className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Bloqueos</h3>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={numeroBloqueo}
                onChange={(event) => setNumeroBloqueo(event.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 56912345678"
                disabled={!canManageBot}
                className="flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white placeholder:text-white/30"
              />
              <button
                type="button"
                disabled={!canManageBot || !numeroBloqueo}
                onClick={() => {
                  bloquear(numeroBloqueo);
                  setNumeroBloqueo("");
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bloquear
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {(config?.blocks ?? []).length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/60">
                  No hay numeros bloqueados.
                </div>
              ) : (
                (config?.blocks ?? []).map((numero) => (
                  <div
                    key={numero}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm"
                  >
                    <span>{numero}</span>
                    <button
                      type="button"
                      disabled={!canManageBot}
                      onClick={() => desbloquear(numero)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-cyan-200" />
              <h2 className="text-xl font-semibold">QR de vinculacion</h2>
            </div>

            <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/5 p-5">
              {qrImage ? (
                <div className="space-y-4 text-center">
                  <img src={qrImage} alt="QR WhatsApp" className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-4" />
                  <p className="text-sm text-white/70">
                    WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-white/60">
                  No hay QR activo en este momento.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-orange-200" />
              <h2 className="text-xl font-semibold">Actividad reciente</h2>
            </div>

            <div className="mt-5 space-y-3">
              {logs.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/60">
                  Aun no hay eventos del panel.
                </div>
              ) : (
                logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em]">
                      <span
                        className={`font-semibold ${
                          log.type === "success"
                            ? "text-emerald-200"
                            : log.type === "error"
                              ? "text-red-200"
                              : log.type === "warning"
                                ? "text-amber-200"
                                : "text-cyan-200"
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="text-white/40">
                        {relativeTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
