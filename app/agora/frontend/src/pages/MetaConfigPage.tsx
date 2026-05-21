import { useEffect, useState } from "react";
import { Eye, EyeOff, Instagram, MessageCircle, Network, Pencil, Save, Settings2, X } from "lucide-react";
import { getMetaConfig, revealMetaField, updateMetaConfig, type MetaConfig } from "@/services/metaConfig.service";

type Tab = "basic" | "messenger" | "instagram" | "graph";

const ENCRYPTED_FIELDS = new Set([
  "app_secret",
  "meta_page_access_token",
  "meta_ig_access_token",
  "admin_access_token",
]);

const WEBHOOK_URL = `${import.meta.env.VITE_API_URL ?? ""}/webhooks/meta`;

// ─── Componente campo editable ───────────────────────────────────────────────
function ConfigField({
  label,
  fieldKey,
  value,
  onSave,
  readOnly = false,
  sensitive = false,
}: {
  label: string;
  fieldKey: keyof MetaConfig;
  value: string | null | undefined;
  onSave: (key: keyof MetaConfig, val: string) => Promise<void>;
  readOnly?: boolean;
  sensitive?: boolean;
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
      const val = await revealMetaField(String(fieldKey));
      setRevealedValue(val ?? "");
      setShowValue(true);
    } finally {
      setRevealing(false);
    }
  };

  const handleEdit = () => {
    setDraft("");
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft("");
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
    <div className="py-3 border-b border-border/50 last:border-0">
      <label className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">{label}</label>
      {editing ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            className="flex-1 rounded border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
            type={sensitive ? "password" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={sensitive ? "Ingresa el nuevo valor" : displayValue || "—"}
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1 rounded bg-primary/10 border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 disabled:opacity-40"
          >
            <Save size={12} /> {saving ? "..." : "Guardar"}
          </button>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 rounded border border-border bg-input px-3 py-1.5 text-xs text-foreground/80 min-h-[30px] break-all">
            {sensitive
              ? showValue
                ? (revealedValue || <span className="text-muted-foreground/50">No configurado</span>)
                : (displayValue || <span className="text-muted-foreground/50">No configurado</span>)
              : (displayValue || <span className="text-muted-foreground/50">No configurado</span>)
            }
          </div>
          {sensitive && displayValue && (
            <button onClick={handleReveal} disabled={revealing} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
              {revealing ? <span className="text-[10px]">...</span> : showValue ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {!readOnly && (
            <button onClick={handleEdit} className="text-muted-foreground hover:text-primary">
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta ─────────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-lg">
      <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "basic",     label: "Basic",         Icon: Settings2 },
  { key: "messenger", label: "Messenger",     Icon: MessageCircle },
  { key: "instagram", label: "Instagram",     Icon: Instagram },
  { key: "graph",     label: "API Graph",     Icon: Network },
];

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MetaConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [config, setConfig] = useState<MetaConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMetaConfig()
      .then(setConfig)
      .catch(() => setError("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: keyof MetaConfig, value: string) => {
    const updated = await updateMetaConfig({ [key]: value });
    setConfig(updated);
  };

  const field = (
    label: string,
    key: keyof MetaConfig,
    opts?: { readOnly?: boolean; sensitive?: boolean }
  ) => (
    <ConfigField
      label={label}
      fieldKey={key}
      value={config[key] as string | null}
      onSave={handleSave}
      readOnly={opts?.readOnly}
      sensitive={opts?.sensitive ?? ENCRYPTED_FIELDS.has(key)}
    />
  );

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Cargando...</div>;
  if (error) return <div className="p-8 text-rose-400 text-sm">{error}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="rounded-xl border border-border bg-card p-6">
        <p className="page-label">Integrations</p>
        <h1 className="page-title mt-3">Configuración Meta</h1>
        <p className="page-subtitle mt-2">Facebook Developer App — tokens, webhooks y accesos de la plataforma.</p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex gap-1 border-b border-border px-4">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-all border-b-2 -mb-px ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

      {activeTab === "basic" && (
        <div className="space-y-0">
          <Card title="Configuración básica">
            <div className="grid grid-cols-2 gap-x-6">
              <div>
                {field("Identificador de la app", "app_id")}
                {field("Nombre visible", "display_name")}
                {field("Dominios de la app", "app_domains")}
                {field("URL de la política de privacidad", "privacy_policy_url")}
              </div>
              <div>
                {field("Clave secreta de la app", "app_secret", { sensitive: true })}
                {field("Espacio de nombres", "namespace")}
                {field("Correo electrónico de contacto", "contact_email")}
                {field("URL de Condiciones del servicio", "terms_of_service_url")}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "messenger" && (
        <div className="space-y-4">
          <Card title="Webhook">
            <ConfigField
              label="URL de devolución de llamada"
              fieldKey={"app_id" as keyof MetaConfig}
              value={WEBHOOK_URL}
              onSave={async () => {}}
              readOnly
            />
            {field("Token de verificación", "meta_verify_token")}
          </Card>
          <Card title="Token de acceso">
            {field("Token de acceso de la página", "meta_page_access_token", { sensitive: true })}
          </Card>
        </div>
      )}

      {activeTab === "instagram" && (
        <div className="space-y-4">
          <Card title="Webhook">
            <ConfigField
              label="URL de devolución de llamada"
              fieldKey={"app_id" as keyof MetaConfig}
              value={WEBHOOK_URL}
              onSave={async () => {}}
              readOnly
            />
            {field("Token de verificación", "meta_ig_verify_token")}
          </Card>
          <Card title="Token de acceso">
            {field("Token de acceso de Instagram", "meta_ig_access_token", { sensitive: true })}
          </Card>
        </div>
      )}

      {activeTab === "graph" && (
        <div className="space-y-4">
          <Card title="Token de acceso de páginas">
            <p className="text-[11px] text-muted-foreground mb-4">
              Token de larga duración para operaciones con la Graph API de Facebook. No se usa en el flujo de mensajería.
            </p>
            {field("Admin Access Token", "admin_access_token", { sensitive: true })}
          </Card>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
