import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Facebook, Link2, Pencil, Save, Settings2, X } from "lucide-react";
import { getFcaConfig, getFcaMqttStatus, revealFcaField, updateFcaConfig, type FcaConfig, type FcaMqttStatus } from "@/services/fcaConfig.service";
import { getSocket } from "@/services/socket";

type Tab = "conexion" | "sesion";

const ENCRYPTED_FIELDS = new Set(["app_state"]);

// ─── Componente campo editable ───────────────────────────────────────────────
function ConfigField({
  label,
  fieldKey,
  value,
  onSave,
  readOnly = false,
  sensitive = false,
  multiline = false,
  hint,
}: {
  label: string;
  fieldKey: keyof FcaConfig;
  value: string | null | undefined;
  onSave: (key: keyof FcaConfig, val: string) => Promise<void>;
  readOnly?: boolean;
  sensitive?: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const displayValue = value ?? "";

  const handleReveal = async () => {
    if (showValue) {
      setShowValue(false);
      setRevealedValue(null);
      return;
    }
    if (revealedValue) {
      setShowValue(true);
      return;
    }
    setRevealing(true);
    try {
      const val = await revealFcaField(String(fieldKey));
      setRevealedValue(val ?? "");
      setShowValue(true);
    } finally {
      setRevealing(false);
    }
  };

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onSave(fieldKey, draft.trim());
      setEditing(false);
      setDraft("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-3 border-b border-border last:border-0">
      <label className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">{label}</label>
      {hint && !editing && (
        <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>
      )}
      {editing ? (
        <div className="flex flex-col gap-2 mt-1">
          {multiline ? (
            <textarea
              className="w-full rounded border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#4267B2] font-mono resize-y min-h-[120px]"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Pega el JSON del AppState aquí..."
              autoFocus
            />
          ) : (
            <input
              className="flex-1 rounded border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#4267B2]"
              type={sensitive ? "password" : "text"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={sensitive ? "Ingresa el nuevo valor" : displayValue || "—"}
              autoFocus
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="flex items-center gap-1 rounded bg-[#0E1B38] border border-[#4267B2] px-3 py-1.5 text-[11px] font-bold text-[#8B9DC3] hover:bg-[#1A2D5A] disabled:opacity-40"
            >
              <Save size={12} /> {saving ? "..." : "Guardar"}
            </button>
            <button onClick={() => { setEditing(false); setDraft(""); }} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <div className={`flex-1 rounded border border-border bg-input px-3 py-1.5 text-xs text-secondary-foreground min-h-[30px] ${multiline ? "font-mono break-all" : ""}`}>
            {sensitive
              ? showValue
                ? (revealedValue || <span className="text-muted-foreground">No configurado</span>)
                : (displayValue || <span className="text-muted-foreground">No configurado</span>)
              : (displayValue || <span className="text-muted-foreground">No configurado</span>)
            }
          </div>
          {sensitive && displayValue && (
            <button onClick={handleReveal} disabled={revealing} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
              {revealing ? <span className="text-[10px]">...</span> : showValue ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {!readOnly && (
            <button onClick={() => { setDraft(""); setEditing(true); }} className="text-muted-foreground hover:text-[#4267B2]">
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Toggle habilitado ────────────────────────────────────────────────────────
function EnabledToggle({
  value,
  onToggle,
}: {
  value: string | null | undefined;
  onToggle: (val: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const isEnabled = value === "true";

  const handleToggle = async () => {
    setSaving(true);
    try {
      await onToggle(isEnabled ? "false" : "true");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-3 border-b border-border">
      <label className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
        Estado de la integración
      </label>
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
          isEnabled ? "bg-[#4267B2]" : "bg-muted"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow ${isEnabled ? "translate-x-4" : "translate-x-1"}`} />
      </button>
      <span className="ml-2 text-xs text-muted-foreground">{isEnabled ? "Habilitado" : "Deshabilitado"}</span>
    </div>
  );
}

// ─── Tarjeta ─────────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-lg">
      <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-[#8B9DC3] mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "conexion", label: "Conexión", Icon: Settings2 },
  { key: "sesion",   label: "Sesión",   Icon: Link2 },
];

// ─── Indicador MQTT ───────────────────────────────────────────────────────────
function MqttStatusBadge({ status }: { status: FcaMqttStatus | null }) {
  if (!status || status.mqtt_connected === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        Desconocido
      </span>
    );
  }
  if (status.event === 'cycling') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-400">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Reconectando
      </span>
    );
  }
  if (status.mqtt_connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        MQTT conectado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-400">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      MQTT desconectado
    </span>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FcaConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("conexion");
  const [config, setConfig] = useState<FcaConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mqttStatus, setMqttStatus] = useState<FcaMqttStatus | null>(null);
  const listenerRef = useRef(false);

  useEffect(() => {
    getFcaConfig()
      .then(setConfig)
      .catch(() => setError("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));

    getFcaMqttStatus().then(setMqttStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (listenerRef.current) return;
    const socket = getSocket();
    if (!socket) return;
    listenerRef.current = true;
    const onStatus = (payload: FcaMqttStatus) => setMqttStatus(payload);
    socket.on("fcaMqttStatus", onStatus);
    return () => {
      socket.off("fcaMqttStatus", onStatus);
      listenerRef.current = false;
    };
  }, []);

  const handleSave = async (key: keyof FcaConfig, value: string) => {
    const updated = await updateFcaConfig({ [key]: value });
    setConfig(updated);
  };

  const field = (
    label: string,
    key: keyof FcaConfig,
    opts?: { readOnly?: boolean; sensitive?: boolean; multiline?: boolean; hint?: string }
  ) => (
    <ConfigField
      label={label}
      fieldKey={key}
      value={config[key] as string | null}
      onSave={handleSave}
      readOnly={opts?.readOnly}
      sensitive={opts?.sensitive ?? ENCRYPTED_FIELDS.has(key)}
      multiline={opts?.multiline}
      hint={opts?.hint}
    />
  );

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Cargando...</div>;
  if (error) return <div className="p-8 text-rose-400 text-sm">{error}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="rounded-xl border border-border bg-card p-6">
        <p className="page-label">Integrations</p>
        <div className="flex items-center gap-3 mt-3">
          <Facebook size={22} className="text-[#4267B2]" />
          <h1 className="page-title">Facebook Personal / Marketplace</h1>
        </div>
        <p className="page-subtitle mt-2">Integración via fca-unofficial — perfil personal de Facebook y Marketplace.</p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex gap-1 border-b border-border px-4">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-all border-b-2 -mb-px ${
                activeTab === key
                  ? "border-[#4267B2] text-[#8B9DC3]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "conexion" && (
            <div className="space-y-4">
              <Card title="Estado">
                <EnabledToggle
                  value={config.enabled}
                  onToggle={(val) => handleSave("enabled", val)}
                />
                <div className="py-3 border-b border-border">
                  <label className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Conexión MQTT
                  </label>
                  <MqttStatusBadge status={mqttStatus} />
                </div>
                {field("Nombre visible", "display_name")}
                {field("URL del servicio fb-backend", "fb_backend_url", {
                  hint: "Ej: http://fb-backend:3001 (interno Docker)",
                })}
              </Card>
              <Card title="Identidad conectada">
                {field("Facebook User ID", "fb_user_id", { readOnly: true })}
                {field("Nombre del perfil", "fb_user_name", { readOnly: true })}
              </Card>
            </div>
          )}

          {activeTab === "sesion" && (
            <div className="space-y-4">
              <Card title="AppState (sesión de Facebook)">
                <p className="text-[11px] text-muted-foreground mb-4">
                  Exporta las cookies de tu sesión de Facebook con la extensión <strong>Cookie Editor</strong> (formato JSON)
                  y pégalas aquí. El AppState se almacena encriptado. El servicio fb-backend lo cargará al arrancar.
                </p>
                {field("app_state", "app_state", {
                  sensitive: true,
                  multiline: true,
                  hint: 'JSON exportado desde "Cookie Editor" — array de objetos con key/name, value, domain, path.',
                })}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
