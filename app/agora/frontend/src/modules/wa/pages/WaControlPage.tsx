import { useEffect, useMemo, useState } from "react";
import { Bot, Clock3, Lock, LogOut, PauseCircle, PlayCircle, QrCode, RefreshCw, ShieldBan, Wrench } from "lucide-react";
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
  const features = getTokenData()?.features;
  const canManageBot = features?.botControl ?? false;
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
    socketPhase,
    reconnectAttempt,
    lastSyncAt,
    generarQr,
    reiniciar,
    cerrarSesion,
    setAutomationPaused,
    bloquear,
    desbloquear,
    refrescarStats,
  } = useWaDashboard();

  const estatus = useMemo(() => {
    if (!available) return { label: "No disponible", color: "bg-rose-500" };
    if (estado?.conexion === "open") return { label: "Conectado", color: "bg-emerald-500" };
    return { label: "Desconectado", color: "bg-amber-500" };
  }, [available, estado?.conexion]);

  const socketDetail = useMemo(() => {
    if (!available) return "Sin endpoint WA";
    if (socketPhase === "connecting") return "Conectando...";
    if (socketPhase === "reconnecting")
      return reconnectAttempt > 0 ? `Reconectando (intento ${reconnectAttempt})` : "Reconectando...";
    if (socketPhase === "connected") return connected ? "Socket activo" : "Socket conectado";
    return connected ? "Socket activo" : "Socket sin conexión";
  }, [available, connected, reconnectAttempt, socketPhase]);

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
    <section className="space-y-6 text-foreground">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Control operativo del bot</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Integración nativa del dashboard de wa-backend. Estado, QR, controles y trazas recientes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-input px-4 py-2 text-sm text-foreground self-start xl:self-auto xl:shrink-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${estatus.color}`} />
          <span>{estatus.label}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{socketDetail}</span>
          {lastSyncAt ? <span className="text-muted-foreground">· sync {relativeTime(lastSyncAt)}</span> : null}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {[
          { label: "Número vinculado", value: estado?.numero ? `+${estado.numero}` : "Esperando", Icon: Bot },
          { label: "Msj. recibidos",   value: String(stats?.mensajesRecibidos ?? 0), Icon: Bot },
          { label: "Msj. enviados",    value: String(stats?.mensajesEnviados ?? 0),  Icon: Bot },
          { label: "Tiempo conectado", value: formatDuration(tiempoConectadoMs),      Icon: Clock3 },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 md:p-5 shadow-xl">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[10px] md:text-xs leading-tight">{label}</span>
            </div>
            <div className="mt-2 md:mt-4 text-lg md:text-2xl font-bold text-foreground">{value}</div>
            {label === "Tiempo conectado" ? (
              <div className="mt-1 md:mt-2 text-[10px] md:text-xs text-muted-foreground">
                Último: {relativeTime(stats?.ultimoMensaje ?? estado?.ultimoMensaje)}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {qrStatus ? (
        <div className="rounded-xl border border-border bg-input p-4 text-sm text-muted-foreground">
          {qrStatus.message}
        </div>
      ) : null}

      {/* ── Controles + aside ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">

        <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Controles</h2>
              <p className="mt-1 md:mt-2 text-sm text-muted-foreground">
                {canManageBot
                  ? "Tienes control total sobre las acciones del bot."
                  : "Tu acceso es informativo. Las acciones operativas están bloqueadas."}
              </p>
            </div>
            <button
              type="button"
              onClick={refrescarStats}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-input px-3 md:px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>

          <div className="mt-4 md:mt-6 grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
            {/* Pausar / Reanudar */}
            <button
              type="button"
              onClick={() => setAutomationPaused(!(config?.automationPaused === true))}
              disabled={!canManageBot}
              className={`rounded-xl border p-3 md:p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                config?.automationPaused
                  ? "border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15"
                  : "border-border bg-input hover:bg-card"
              }`}
            >
              {config?.automationPaused
                ? <PlayCircle className="h-5 w-5 md:h-6 md:w-6 text-amber-400" />
                : <PauseCircle className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
              }
              <div className="mt-2 md:mt-4 text-sm md:text-base font-bold text-foreground">
                {config?.automationPaused ? "Reanudar bot" : "Pausar bot"}
              </div>
              <div className="mt-1 md:mt-2 text-xs text-muted-foreground hidden sm:block">
                {config?.automationPaused
                  ? "Automatización detenida; WhatsApp sigue conectado."
                  : "Detiene respuestas automáticas sin cerrar WhatsApp."}
              </div>
              {!canManageBot ? (
                <div className="mt-2 md:mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-[#525252]">
                  <Lock className="h-3.5 w-3.5" /> Solo lectura
                </div>
              ) : null}
            </button>

            {[
              { label: "Generar QR",    Icon: QrCode,    onClick: generarQr    },
              { label: "Reiniciar bot", Icon: RefreshCw, onClick: reiniciar    },
              { label: "Cerrar sesión", Icon: LogOut,    onClick: cerrarSesion },
            ].map(({ label, Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                disabled={!canManageBot}
                className="rounded-xl border border-border bg-input p-3 md:p-5 text-left transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
                <div className="mt-2 md:mt-4 text-sm md:text-base font-bold text-foreground">{label}</div>
                {!canManageBot ? (
                  <div className="mt-2 md:mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> Solo lectura
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          {/* Bloqueos */}
          <div className="mt-6 rounded-xl border border-border bg-input p-5">
            <div className="flex items-center gap-3">
              <ShieldBan className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-bold text-foreground">Bloqueos</h3>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={numeroBloqueo}
                onChange={(e) => setNumeroBloqueo(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 56912345678"
                disabled={!canManageBot}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border disabled:opacity-50"
              />
              <button
                type="button"
                disabled={!canManageBot || !numeroBloqueo}
                onClick={() => { bloquear(numeroBloqueo); setNumeroBloqueo(""); }}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-[#6E3709] hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bloquear
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {(config?.blocks ?? []).length === 0 ? (
                <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  No hay números bloqueados.
                </div>
              ) : (
                (config?.blocks ?? []).map((numero) => (
                  <div key={numero} className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
                    <span>{numero}</span>
                    <button
                      type="button"
                      disabled={!canManageBot}
                      onClick={() => desbloquear(numero)}
                      className="rounded-lg border border-border bg-input px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 md:space-y-6">
          {/* QR */}
          <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg md:text-xl font-bold text-foreground">QR de vinculación</h2>
            </div>
            <div className="mt-4 md:mt-5 rounded-xl border border-dashed border-border bg-input p-4 md:p-5">
              {qrImage ? (
                <div className="space-y-4 text-center">
                  <img src={qrImage} alt="QR WhatsApp" className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-4" />
                  <p className="text-sm text-muted-foreground">
                    WhatsApp › Dispositivos vinculados › Vincular dispositivo.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No hay QR activo en este momento.</div>
              )}
            </div>
          </section>

          {/* Actividad reciente */}
          <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg md:text-xl font-bold text-foreground">Actividad reciente</h2>
            </div>
            <div className="mt-4 md:mt-5 space-y-3">
              {logs.length === 0 ? (
                <div className="rounded-xl border border-border bg-input p-4 text-sm text-muted-foreground">
                  Aún no hay eventos del panel.
                </div>
              ) : (
                logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded-xl border border-border bg-input p-4">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`font-medium ${
                        log.type === "success" ? "text-emerald-400"
                          : log.type === "error"   ? "text-rose-400"
                          : log.type === "warning" ? "text-amber-400"
                          : "text-muted-foreground"
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-muted-foreground">{relativeTime(log.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{log.message}</p>
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
