import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, ChevronLeft, Eye, EyeOff, KeyRound, LogOut, Pencil, Shield, User, X } from "lucide-react";
import QRCode from "react-qr-code";
import { getTokenData } from "@/utils/getTokenData";
import { hasPermission } from "@/utils/permissions";
import { getMe, logoutSession, removePhoto, updateMe, uploadPhoto, type MeProfile } from "@/services/profileService";
import { useProfilePhoto } from "@/context/ProfilePhotoContext";
import { resetPassword, setup2FAConfirmar, setup2FAInit } from "@/services/authService";

type Tab = "datos" | "permisos" | "seguridad";
type Setup2FAPaso = "form" | "qr" | "confirmar" | "exito";
type PwdPaso = "form" | "exito";

const inp = "w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-[#525252] focus:outline-none focus:border-[#7B3B10] transition-all";
const inpSm = "rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-[#525252] focus:outline-none focus:border-[#7B3B10] transition-all";

// ─── Avatar ─────────────────────────────────────────────────────────────────
function ProfileAvatar({
  nombre,
  username,
  photoUrl,
  onPhotoSelect,
  onRemove,
  uploading,
}: {
  nombre: string | null;
  username: string;
  photoUrl: string | null;
  onPhotoSelect: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState("");

  const initials = ((nombre ?? username ?? "?")[0] ?? "U").toUpperCase();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (Math.abs(img.naturalWidth - img.naturalHeight) > 10) {
        setPhotoError("La imagen debe ser cuadrada (1:1). Recórtala antes de subir.");
        return;
      }
      onPhotoSelect(file);
    };
    img.src = url;
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-2 border-[#6E3709] bg-[#1E1108] flex items-center justify-center overflow-hidden">
          {uploading ? (
            <span className="text-xs text-muted-foreground">...</span>
          ) : photoUrl ? (
            <img src={photoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-primary">{initials}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Cambiar foto"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#6E3709] bg-[#1E1108] text-primary hover:bg-[#321C0C] disabled:opacity-40 transition-colors"
        >
          <Camera size={13} />
        </button>
        {photoUrl && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            title="Quitar foto"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-rose-400 hover:border-rose-400/30 transition-colors"
          >
            <X size={10} />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      {photoError && <p className="text-xs text-rose-400 text-center max-w-[200px]">{photoError}</p>}
    </div>
  );
}

// ─── Sección Datos ───────────────────────────────────────────────────────────
function DatosTab({ profile, canEdit }: { profile: MeProfile; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nombre: profile.nombre ?? "",
    apellido: profile.apellido ?? "",
    email: profile.email ?? "",
    telefono: profile.telefono ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateMe(profile.id, form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const rows: { label: string; key: keyof typeof form }[] = [
    { label: "Nombre", key: "nombre" },
    { label: "Apellido", key: "apellido" },
    { label: "Email", key: "email" },
    { label: "Teléfono", key: "telefono" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Información personal</p>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors">
            <Pencil size={12} /> Editar
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg border border-[#6E3709] bg-[#1E1108] px-3 py-1 text-xs font-bold text-primary hover:bg-[#321C0C] disabled:opacity-50 transition-colors"
            >
              <Check size={12} /> {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr] divide-y divide-border">
          {/* username — siempre read-only */}
          <div className="contents">
            <div className="px-4 py-3 text-xs font-medium text-muted-foreground bg-muted">Usuario</div>
            <div className="px-4 py-3 text-sm text-foreground font-mono">{profile.username}</div>
          </div>
          <div className="contents">
            <div className="px-4 py-3 text-xs font-medium text-muted-foreground bg-muted">Rol</div>
            <div className="px-4 py-3 text-sm text-primary font-bold capitalize">{profile.rol ?? "—"}</div>
          </div>
          {rows.map(({ label, key }) => (
            <div key={key} className="contents">
              <div className="px-4 py-3 text-xs font-medium text-muted-foreground bg-muted">{label}</div>
              <div className="px-4 py-2.5">
                {editing ? (
                  <input
                    className={inpSm + " w-full"}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={`Ingresa ${label.toLowerCase()}`}
                  />
                ) : (
                  <span className="text-sm text-foreground">{form[key] || <span className="text-muted-foreground">—</span>}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {saved && <p className="text-xs text-emerald-400">Datos actualizados correctamente.</p>}
      {!canEdit && (
        <p className="text-[11px] text-muted-foreground">Solo los administradores pueden editar datos de perfil.</p>
      )}
    </div>
  );
}

// ─── Sección Permisos ────────────────────────────────────────────────────────
function PermisosTab({ permisos, rol }: { permisos: string[]; rol: string }) {
  const isSuperadmin = rol === "superadmin";
  const has = (p: string) => hasPermission(p, permisos);

  const items: [string, boolean][] = [
    ["Contacts / Threads / Ads WA", has("gestionar_usuarios")],
    ["Reportes CSV", has("ver_reportes")],
    ["Ajustes y config.", has("editar_configuracion")],
    ["Vista bot WA", has("vista_bot")],
    ["Control bot WA", has("control_bot")],
    ["Control agenda", has("control_agenda")],
    ...(isSuperadmin ? ([["Stages / Offers / Integrations", true]] as [string, boolean][]) : []),
  ];

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Accesos del rol <span className="text-primary capitalize">{rol}</span></p>
      <div className="space-y-2">
        {items.map(([label, active]) => (
          <div key={String(label)} className="flex items-center justify-between rounded-xl border border-border bg-input px-4 py-3">
            <span className="text-sm text-foreground">{label}</span>
            <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${active ? "bg-[#1E1108] text-primary" : "bg-card text-muted-foreground"}`}>
              {active ? "Activo" : "No"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sección Seguridad ───────────────────────────────────────────────────────
function SeguridadTab({ username }: { username: string }) {
  const [activeForm, setActiveForm] = useState<"none" | "password" | "2fa">("none");

  // — Password —
  const [pwdPaso, setPwdPaso] = useState<PwdPaso>("form");
  const [pwdForm, setPwdForm] = useState({ resetToken: "", newPassword: "", confirmarPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmarPassword) {
      setPwdError("Las contraseñas no coinciden");
      return;
    }
    setPwdLoading(true);
    setPwdError("");
    try {
      await resetPassword(username, pwdForm.resetToken.toUpperCase(), pwdForm.newPassword, pwdForm.confirmarPassword);
      setPwdPaso("exito");
    } catch (err: any) {
      setPwdError(err.message || "Error al cambiar la contraseña");
    } finally {
      setPwdLoading(false);
    }
  };

  // — 2FA —
  const [mfaPaso, setMfaPaso] = useState<Setup2FAPaso>("form");
  const [mfaForm, setMfaForm] = useState({ password: "", bypassToken: "", totpCode: "" });
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [showMfaPwd, setShowMfaPwd] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleMfaInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await setup2FAInit(username, mfaForm.password, mfaForm.bypassToken.toUpperCase());
      setOtpauthUrl(res.otpauth_url);
      setMfaPaso("qr");
    } catch (err: any) {
      setMfaError(err.message || "Error al verificar");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError("");
    try {
      await setup2FAConfirmar(username, mfaForm.bypassToken.toUpperCase(), mfaForm.totpCode);
      setMfaPaso("exito");
    } catch (err: any) {
      setMfaError(err.message || "Error al confirmar");
    } finally {
      setMfaLoading(false);
    }
  };

  const resetPwd = () => { setPwdPaso("form"); setPwdForm({ resetToken: "", newPassword: "", confirmarPassword: "" }); setPwdError(""); setActiveForm("none"); };
  const resetMfa = () => { setMfaPaso("form"); setMfaForm({ password: "", bypassToken: "", totpCode: "" }); setMfaError(""); setOtpauthUrl(""); setActiveForm("none"); };

  if (activeForm === "none") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Opciones de seguridad</p>
        <button
          onClick={() => setActiveForm("password")}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-input px-4 py-3 text-left hover:bg-card transition-colors"
        >
          <div>
            <p className="text-sm font-bold text-foreground">Cambiar contraseña</p>
            <p className="text-xs text-muted-foreground mt-0.5">Requiere código de reset del administrador</p>
          </div>
          <ChevronLeft size={16} className="rotate-180 text-muted-foreground" />
        </button>
        <button
          onClick={() => setActiveForm("2fa")}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-input px-4 py-3 text-left hover:bg-card transition-colors"
        >
          <div>
            <p className="text-sm font-bold text-foreground">Configurar autenticador</p>
            <p className="text-xs text-muted-foreground mt-0.5">Re-vincular app 2FA con código del administrador</p>
          </div>
          <ChevronLeft size={16} className="rotate-180 text-muted-foreground" />
        </button>
      </div>
    );
  }

  if (activeForm === "password") {
    return (
      <div className="space-y-4">
        <button onClick={resetPwd} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Volver
        </button>
        {pwdPaso === "exito" ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
            <p className="text-emerald-400 font-bold">Contraseña actualizada correctamente</p>
            <button onClick={resetPwd} className="text-xs text-primary underline">Volver a seguridad</button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Cambiar contraseña</p>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Código de reset (admin)</label>
              <input className={inp} type="text" placeholder="Código entregado por el administrador"
                value={pwdForm.resetToken} onChange={(e) => setPwdForm({ ...pwdForm, resetToken: e.target.value.toUpperCase() })}
                required maxLength={8} />
            </div>
            <div className="relative">
              <input className={inp + " pr-10"} type={showPwd ? "text" : "password"} placeholder="Nueva contraseña"
                value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="relative">
              <input className={inp + " pr-10"} type={showConfirm ? "text" : "password"} placeholder="Confirmar nueva contraseña"
                value={pwdForm.confirmarPassword} onChange={(e) => setPwdForm({ ...pwdForm, confirmarPassword: e.target.value })} required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {pwdError && <p className="text-xs text-rose-400">{pwdError}</p>}
            <button type="submit" disabled={pwdLoading}
              className="w-full rounded-xl border border-[#6E3709] bg-[#1E1108] py-2.5 text-sm font-bold text-primary hover:bg-[#321C0C] disabled:opacity-50 transition-colors">
              {pwdLoading ? "Procesando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // 2FA
  return (
    <div className="space-y-4">
      <button onClick={resetMfa} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Volver
      </button>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Configurar autenticador 2FA</p>

      {mfaPaso === "form" && (
        <form onSubmit={handleMfaInit} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Código de reset 2FA (admin)</label>
            <input className={inp} type="text" placeholder="Código entregado por el administrador"
              value={mfaForm.bypassToken} onChange={(e) => setMfaForm({ ...mfaForm, bypassToken: e.target.value.toUpperCase() })}
              required maxLength={8} />
          </div>
          <div className="relative">
            <input className={inp + " pr-10"} type={showMfaPwd ? "text" : "password"} placeholder="Contraseña actual"
              value={mfaForm.password} onChange={(e) => setMfaForm({ ...mfaForm, password: e.target.value })} required />
            <button type="button" onClick={() => setShowMfaPwd(!showMfaPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showMfaPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {mfaError && <p className="text-xs text-rose-400">{mfaError}</p>}
          <button type="submit" disabled={mfaLoading}
            className="w-full rounded-xl border border-[#6E3709] bg-[#1E1108] py-2.5 text-sm font-bold text-primary hover:bg-[#321C0C] disabled:opacity-50 transition-colors">
            {mfaLoading ? "Verificando..." : "Continuar"}
          </button>
        </form>
      )}

      {mfaPaso === "qr" && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-foreground">Escanea este código en tu app de autenticación (Google Authenticator, Authy, etc.)</p>
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={otpauthUrl} size={160} />
            </div>
          </div>
          <button onClick={() => { setMfaError(""); setMfaPaso("confirmar"); }}
            className="w-full rounded-xl border border-[#6E3709] bg-[#1E1108] py-2.5 text-sm font-bold text-primary hover:bg-[#321C0C] transition-colors">
            Ya escaneé el código
          </button>
        </div>
      )}

      {mfaPaso === "confirmar" && (
        <form onSubmit={handleMfaConfirmar} className="space-y-3">
          <p className="text-sm text-foreground">Ingresa el código de 6 dígitos de tu nueva app de autenticación.</p>
          <input className={inp} type="text" placeholder="Código de 6 dígitos"
            value={mfaForm.totpCode}
            onChange={(e) => setMfaForm({ ...mfaForm, totpCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            required maxLength={6} />
          {mfaError && <p className="text-xs text-rose-400">{mfaError}</p>}
          <button type="submit" disabled={mfaLoading}
            className="w-full rounded-xl border border-[#6E3709] bg-[#1E1108] py-2.5 text-sm font-bold text-primary hover:bg-[#321C0C] disabled:opacity-50 transition-colors">
            {mfaLoading ? "Confirmando..." : "Confirmar"}
          </button>
          <button type="button" onClick={() => setMfaPaso("qr")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline transition-colors">
            Volver al código QR
          </button>
        </form>
      )}

      {mfaPaso === "exito" && (
        <div className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
          <p className="text-emerald-400 font-bold">Autenticador configurado correctamente</p>
          <button onClick={resetMfa} className="text-xs text-primary underline">Volver a seguridad</button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const tokenData = getTokenData();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("datos");
  const { photoUrl, setPhotoUrl } = useProfilePhoto();
  const [uploading, setUploading] = useState(false);

  const permisos = tokenData?.permisos ?? [];
  const canEdit = hasPermission("editar_configuracion", permisos);

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logoutSession();
    navigate("/login", { replace: true });
  };

  const handlePhotoSelect = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      setPhotoUrl(url);
    } catch (err: any) {
      console.error("Error subiendo foto:", err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      await removePhoto();
      setPhotoUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const displayName = profile
    ? [profile.nombre, profile.apellido].filter(Boolean).join(" ") || profile.username
    : tokenData?.nombre || tokenData?.username || "Usuario";

  const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { key: "datos", label: "Datos", Icon: User },
    { key: "permisos", label: "Permisos", Icon: Shield },
    { key: "seguridad", label: "Seguridad", Icon: KeyRound },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Cabecera */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-3 text-center">
        <ProfileAvatar
          nombre={profile?.nombre ?? tokenData?.nombre ?? null}
          username={profile?.username ?? tokenData?.username ?? "?"}
          photoUrl={photoUrl}
          onPhotoSelect={handlePhotoSelect}
          onRemove={handleRemovePhoto}
          uploading={uploading}
        />
        <div>
          <h1 className="text-xl font-black text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{profile?.email ?? tokenData?.email ?? ""}</p>
          <p className="text-xs text-primary font-bold uppercase tracking-[0.18em] mt-1 capitalize">{profile?.rol ?? tokenData?.rol ?? ""}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold uppercase tracking-[0.16em] border-b-2 -mb-px transition-all ${
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

        <div className="p-5">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-6">Cargando...</p>
          ) : activeTab === "datos" && profile ? (
            <DatosTab profile={profile} canEdit={canEdit} />
          ) : activeTab === "permisos" ? (
            <PermisosTab permisos={permisos} rol={tokenData?.rol ?? "—"} />
          ) : activeTab === "seguridad" ? (
            <SeguridadTab username={profile?.username ?? tokenData?.username ?? ""} />
          ) : null}
        </div>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-muted-foreground hover:text-rose-400 hover:border-rose-400/30 transition-all"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </div>
  );
}
