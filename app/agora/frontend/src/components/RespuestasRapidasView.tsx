import React, { useEffect, useState } from 'react';
import { X, Plus, Send, Edit2, Trash2, Zap } from 'lucide-react';
import type { Shortcut } from '../types/shortcut';
import {
  fetchShortcuts,
  createShortcut,
  updateShortcut,
  deleteShortcut,
} from '../services/shortcut.service';

interface Props {
  onSend: (texto: string) => void;
  onClose: () => void;
}

export default function RespuestasRapidasView({ onSend, onClose }: Props) {
  const [respuestas, setRespuestas] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newData, setNewData] = useState({ atajo: '', texto: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRespuestas();
  }, []);

  async function loadRespuestas() {
    setLoading(true);
    try {
      const data = await fetchShortcuts();
      setRespuestas(data);
    } catch {
      setError('Error cargando respuestas');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(id: string) {
    setEditingId(id);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  function startCreate() {
    setCreating(true);
    setNewData({ atajo: '', texto: '' });
    setError(null);
  }

  function cancelCreate() {
    setCreating(false);
    setNewData({ atajo: '', texto: '' });
    setError(null);
  }

  async function saveEdit(id: string, atajo: string, texto: string) {
    try {
      const updated = await updateShortcut(id, { atajo, texto });
      setRespuestas((prev) => prev.map((r) => (r.uuid === id ? updated : r)));
      setEditingId(null);
      setError(null);
    } catch {
      setError('Error actualizando respuesta');
    }
  }

  async function saveCreate() {
    if (!newData.atajo.trim() || !newData.texto.trim()) {
      setError('Ambos campos son obligatorios');
      return;
    }
    try {
      const created = await createShortcut(newData);
      setRespuestas((prev) => [created, ...prev]);
      setCreating(false);
      setNewData({ atajo: '', texto: '' });
      setError(null);
    } catch {
      setError('Error creando respuesta');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta respuesta rápida?')) return;
    try {
      await deleteShortcut(id);
      setRespuestas((prev) => prev.filter((r) => r.uuid !== id));
      if (editingId === id) setEditingId(null);
      setError(null);
    } catch {
      setError('Error eliminando respuesta');
    }
  }

  return (
    <div className="fixed top-16 right-4 z-50 w-96 max-h-[600px] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Respuestas rápidas
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-input text-muted-foreground transition hover:border-[#6E3709] hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">

        {/* Botón crear */}
        {!creating && (
          <button
            type="button"
            onClick={startCreate}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-xs font-bold text-foreground transition hover:border-[#6E3709] hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Nueva respuesta
          </button>
        )}

        {/* Formulario de creación */}
        {creating && (
          <div className="rounded-xl border border-border bg-input p-3 space-y-2">
            <input
              type="text"
              placeholder="Atajo (ej: /gracias)"
              value={newData.atajo}
              onChange={(e) => setNewData((d) => ({ ...d, atajo: e.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <textarea
              placeholder="Texto de la respuesta"
              value={newData.texto}
              onChange={(e) => setNewData((d) => ({ ...d, texto: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelCreate}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCreate}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-[var(--primary-hover)]"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : respuestas.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Sin respuestas rápidas aún.
          </div>
        ) : (
          respuestas.map(({ uuid, atajo, texto }) => (
            <div key={uuid} className="rounded-xl border border-border bg-input p-3 space-y-2">
              {editingId === uuid ? (
                <>
                  <input
                    type="text"
                    value={atajo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRespuestas((prev) =>
                        prev.map((r) => (r.uuid === uuid ? { ...r, atajo: val } : r))
                      );
                    }}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <textarea
                    value={texto}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRespuestas((prev) =>
                        prev.map((r) => (r.uuid === uuid ? { ...r, texto: val } : r))
                      );
                    }}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(uuid, atajo, texto)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-[var(--primary-hover)]"
                    >
                      Guardar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                      {atajo}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {texto}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSend(texto)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-[var(--primary-hover)]"
                    >
                      <Send className="h-3 w-3" />
                      Enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(uuid)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground transition hover:border-[#6E3709] hover:text-primary"
                    >
                      <Edit2 className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(uuid)}
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
