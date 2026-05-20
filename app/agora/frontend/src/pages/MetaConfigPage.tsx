import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Save, X } from "lucide-react";
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
  const isMasked = sensitive && displayValue === "••••••••";

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

  const inp = "flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#6dfe9c]/50";
  const lbl = "block text-[11px] font-semibold text-slate-400 mb-1";

  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <label className={lbl}>{label}</label>
      {editing ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            className={inp}
            type={sensitive ? "password" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={sensitive ? "Ingresa el nuevo valor" : displayValue || "—"}
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1 rounded bg-[#6dfe9c]/10 border border-[#6dfe9c]/30 px-3 py-1.5 text-[11px] font-bold text-[#6dfe9c] hover:bg-[#6dfe9c]/20 disabled:opacity-40"
          >
            <Save size={12} /> {saving ? "..." : "Guardar"}
          </button>
          <button onClick={handleCancel} className="text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 min-h-[30px] break-all">
            {sensitive
              ? showValue
                ? (revealedValue || <span className="text-slate-600">No configurado</span>)
                : (displayValue || <span className="text-slate-600">No configurado</span>)
              : (displayValue || <span className="text-slate-600">No configurado</span>)
            }
          </div>
          {sensitive && displayValue && (
            <button onClick={handleReveal} disabled={revealing} className="text-slate-500 hover:text-slate-300 disabled:opacity-40">
              {revealing ? <span className="text-[10px]">...</span> : showValue ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {!readOnly && (
            <button onClick={handleEdit} className="text-slate-500 hover:text-[#6dfe9c]">
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
    <div className="rounded-xl border border-white/10 bg-[#0a1f27] p-5 shadow-lg">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#6dfe9c] mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; emoji?: string }[] = [
  { key: "basic", label: "Basic" },
  { key: "messenger", label: "Messenger", emoji: "💬" },
  { key: "instagram", label: "Instagram", emoji: "📸" },
  { key: "graph", label: "Configuración API Graph" },
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

  if (loading) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;
  if (error) return <div className="p-8 text-red-400 text-sm">{error}</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-black uppercase tracking-widest text-[#6dfe9c] mb-1">
        Integraciones
      </h1>
      <p className="text-xs text-slate-500 mb-6">Meta / Facebook Developer App</p>

      {/* Navbar interno */}
      <div className="flex gap-1 border-b border-white/10 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#6dfe9c] text-[#6dfe9c]"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.emoji && <span className="mr-1">{tab.emoji}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Basic ── */}
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

      {/* ── Messenger ── */}
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

      {/* ── Instagram ── */}
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

      {/* ── API Graph ── */}
      {activeTab === "graph" && (
        <div className="space-y-4">
          <Card title="Token de acceso de páginas">
            <p className="text-[11px] text-slate-500 mb-4">
              Token de larga duración para operaciones con la Graph API de Facebook. No se usa en el flujo de mensajería.
            </p>
            {field("Admin Access Token", "admin_access_token", { sensitive: true })}
          </Card>
        </div>
      )}
    </div>
  );
}
