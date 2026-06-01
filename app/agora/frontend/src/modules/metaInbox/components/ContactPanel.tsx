import React from "react";
import { Ban, Save, ShieldCheck, X } from "lucide-react";
import type { MetaInboxContactUpdate, MetaInboxThread } from "@/types/metaInbox";
import { ATTENTION_MODE_OPTIONS, THREAD_STAGE_OPTIONS, THREAD_STATUS_OPTIONS } from "../constants";
import { formatRelativeTs } from "../utils";
import { s } from "../styles";
import { SalesAnalysisPanel } from "./SalesAnalysisPanel";
import { useSalesAnalysis } from "../hooks/useSalesAnalysis";

interface Props {
  thread: MetaInboxThread;
  contactForm: MetaInboxContactUpdate;
  savingContact: boolean;
  savingThreadControl: boolean;
  updatingWhatsappBlock: "block" | "unblock" | null;
  whatsappBlockFeedback: string | null;
  width?: number;
  onClose: () => void;
  onContactFormChange: (patch: Partial<MetaInboxContactUpdate>) => void;
  onSaveContact: () => void;
  onThreadControlChange: (patch: { threadStatus?: string; attentionMode?: string; threadStage?: string }) => void;
  onWhatsappBlock: (action: "block" | "unblock") => void;
}

export const ContactPanel: React.FC<Props> = ({
  thread,
  contactForm,
  savingContact,
  savingThreadControl,
  updatingWhatsappBlock,
  whatsappBlockFeedback,
  width,
  onClose,
  onContactFormChange,
  onSaveContact,
  onThreadControlChange,
  onWhatsappBlock,
}) => {
  const isWhatsapp = String(thread.objectType || "").toUpperCase() === "WHATSAPP";
  const { form: salesForm, saving: savingSales, saved: salesSaved, handleChange: onSalesChange, handleToggleTag, handleSave: onSaveSales } = useSalesAnalysis(thread.sessionId);

  const mp = (thread.metadata as Record<string, unknown> | null)?.["marketplace"] as
    | Record<string, string | null>
    | undefined;

  return (
    <aside
      className={s.contactAside + " shrink-0"}
      style={width !== undefined ? { width } : undefined}
    >
      <div className={s.contactHead}>
        <h2 className={s.contactTitle}>Detalle</h2>
        <button
          onClick={onClose}
          className={s.closeButton}
          aria-label="Cerrar detalle"
          title="Cerrar detalle"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2 border-b border-border pb-3">
        <div className="text-xs font-medium text-muted-foreground">Thread</div>
        <select
          value={thread.threadStatus}
          onChange={(e) => void onThreadControlChange({ threadStatus: e.target.value })}
          disabled={savingThreadControl}
          className={s.contactInput}
          aria-label="Estado del hilo"
        >
          {THREAD_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              Estado: {opt}
            </option>
          ))}
        </select>
        <select
          value={thread.attentionMode}
          onChange={(e) => void onThreadControlChange({ attentionMode: e.target.value })}
          disabled={savingThreadControl}
          className={s.contactInput}
          aria-label="Modo de atención"
        >
          {ATTENTION_MODE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              Modo: {opt}
            </option>
          ))}
        </select>
        <select
          value={thread.threadStage}
          onChange={(e) => void onThreadControlChange({ threadStage: e.target.value })}
          disabled={savingThreadControl}
          className={s.contactInput}
          aria-label="Etapa del hilo"
        >
          {THREAD_STAGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              Etapa: {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 border-b border-border pb-3">
        <div className="text-xs font-medium text-muted-foreground">Actor</div>
        <div className={s.contactInput}>Score: {thread.actorScore ?? "0"}</div>
        <div className={s.contactInput}>Lifecycle: {thread.actorLifecycleState ?? "SIN_ESTADO"}</div>
        <div className={s.contactInput}>
          Actualizado:{" "}
          {thread.actorLifecycleUpdatedAt ? formatRelativeTs(thread.actorLifecycleUpdatedAt) : "sin registro"}
        </div>
      </div>

      {isWhatsapp && (
        <div className="space-y-2 border-b border-border pb-3">
          <div className="text-xs font-medium text-muted-foreground">WhatsApp</div>
          <button
            type="button"
            onClick={() => void onWhatsappBlock("block")}
            disabled={!!updatingWhatsappBlock}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Ban size={16} />
            {updatingWhatsappBlock === "block" ? "Bloqueando..." : "Bloquear contacto"}
          </button>
          <button
            type="button"
            onClick={() => void onWhatsappBlock("unblock")}
            disabled={!!updatingWhatsappBlock}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck size={16} />
            {updatingWhatsappBlock === "unblock" ? "Desbloqueando..." : "Desbloquear contacto"}
          </button>
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            Usa el par PN/LID persistido cuando existe. Si falta LID, el backend intenta resolverlo con Baileys.
          </div>
          {whatsappBlockFeedback && (
            <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200">
              {whatsappBlockFeedback}
            </div>
          )}
        </div>
      )}

      <div className="text-xs uppercase tracking-wide text-muted-foreground">Contacto</div>
      {(
        [
          ["displayName", "Nombre completo"],
          ["firstName", "Nombres"],
          ["lastName", "Apellidos"],
          ["rut", "RUT"],
          ["phone", "Teléfono"],
          ["email", "Email"],
          ["address", "Dirección"],
          ["city", "Ciudad"],
          ["region", "Región"],
        ] as [keyof MetaInboxContactUpdate, string][]
      ).map(([field, placeholder]) => (
        <input
          key={field}
          value={(contactForm[field] as string) || ""}
          onChange={(e) => onContactFormChange({ [field]: e.target.value })}
          placeholder={placeholder}
          className={s.contactInput}
          aria-label={placeholder}
        />
      ))}

      <textarea
        value={contactForm.notes || ""}
        onChange={(e) => onContactFormChange({ notes: e.target.value })}
        placeholder="Notas"
        className={s.contactTextarea}
        aria-label="Notas"
      />

      <button onClick={onSaveContact} disabled={savingContact} className={s.contactSave}>
        <Save size={16} />
        Guardar contacto
      </button>

      {(mp?.title || mp?.itemUrl) && (
        <div className="rounded-lg border border-border bg-secondary p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Marketplace</p>
          {mp.imageUrl && (
            <img
              src={mp.imageUrl}
              alt={mp.title || "Artículo"}
              loading="lazy"
              className="mb-2 w-full rounded-md object-cover"
              style={{ maxHeight: 140 }}
            />
          )}
          {mp.title && <p className="text-sm font-semibold text-foreground">{mp.title}</p>}
          {mp.description && <p className="mt-0.5 text-xs text-muted-foreground">{mp.description}</p>}
          {mp.itemUrl && (
            <a
              href={mp.itemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline"
            >
              Ver artículo
            </a>
          )}
        </div>
      )}

      <SalesAnalysisPanel
        form={salesForm}
        saving={savingSales}
        saved={salesSaved}
        onChange={onSalesChange}
        onToggleTag={handleToggleTag}
        onSave={onSaveSales}
      />
    </aside>
  );
};
