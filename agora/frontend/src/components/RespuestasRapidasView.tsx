import React, { useEffect, useState } from 'react';
import { X, Plus, Send, Edit, Trash2, Zap } from 'lucide-react';  // Importando iconos de lucide
import type { RespuestaRapida } from '../types/respuestas-rapidas';
import {
  fetchRespuestas,
  createRespuesta,
  updateRespuesta,
  deleteRespuesta,
} from '../services/respuestas-rapidas.service';

interface Props {
  onSend: (texto: string) => void; // Para enviar el texto al chat
  onClose: () => void; // Para cerrar la tarjeta flotante
}

export default function RespuestasRapidasView({ onSend, onClose }: Props) {
  const [respuestas, setRespuestas] = useState<RespuestaRapida[]>([]);
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
      const data = await fetchRespuestas();
      setRespuestas(data);
    } catch {
      setError('Error cargando respuestas');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(id: string) {
    setEditingId(id);
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
      const updated = await updateRespuesta(id, { atajo, texto });
      setRespuestas((prev) =>
        prev.map((r) => (r.uuid === id ? updated : r))
      );
      setEditingId(null);
      setError(null);
    } catch {
      setError('Error actualizando respuesta');
    }
  }

  async function saveCreate() {
    try {
      if (!newData.atajo.trim() || !newData.texto.trim()) {
        setError('Ambos campos son obligatorios');
        return;
      }
      const created = await createRespuesta(newData);
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
      await deleteRespuesta(id);
      setRespuestas((prev) => prev.filter((r) => r.uuid !== id));
      if (editingId === id) setEditingId(null);
      setError(null);
    } catch {
      setError('Error eliminando respuesta');
    }
  }

  return (
    <div className="fixed top-16 right-4 w-96 max-h-[600px] bg-white shadow-lg rounded-lg p-4 overflow-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center">
          <Zap className="mr-2 w-6 h-6 text-yellow-500" /> Respuestas Rápidas
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 rounded p-1"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-2 text-red-600 text-sm font-semibold">{error}</div>
      )}

      {loading ? (
        <div>Cargando respuestas...</div>
      ) : (
        <>
          {!creating && (
            <button
              onClick={startCreate}
              className="mb-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-1" /> Crear nueva
            </button>
          )}

          {creating && (
            <div className="mb-4 border p-3 rounded bg-gray-50">
              <input
                type="text"
                className="w-full mb-2 p-2 border rounded"
                placeholder="Atajo (ej: /gracias)"
                value={newData.atajo}
                onChange={(e) =>
                  setNewData((d) => ({ ...d, atajo: e.target.value }))
                }
              />
              <textarea
                className="w-full mb-2 p-2 border rounded"
                placeholder="Texto de la respuesta"
                value={newData.texto}
                onChange={(e) =>
                  setNewData((d) => ({ ...d, texto: e.target.value }))
                }
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelCreate}
                  className="px-3 py-1 border rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCreate}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          <ul className="space-y-3 max-h-[400px] overflow-auto">
            {respuestas.map(({ uuid, atajo, texto }) => (
              <li
                key={uuid}
                className="border rounded shadow-sm p-3 bg-white hover:bg-gray-50"
              >
                {editingId === uuid ? (
                  <>
                    <input
                      type="text"
                      className="w-full mb-2 p-2 border rounded"
                      value={atajo}
                      onChange={(e) => {
                        const newAtajo = e.target.value;
                        setRespuestas((prev) =>
                          prev.map((r) =>
                            r.uuid === uuid ? { ...r, atajo: newAtajo } : r
                          )
                        );
                      }}
                    />
                    <textarea
                      className="w-full mb-2 p-2 border rounded"
                      value={texto}
                      onChange={(e) => {
                        const newTexto = e.target.value;
                        setRespuestas((prev) =>
                          prev.map((r) =>
                            r.uuid === uuid ? { ...r, texto: newTexto } : r
                          )
                        );
                      }}
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 border rounded hover:bg-gray-200 flex items-center"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEdit(uuid, atajo, texto)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      >
                        Guardar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <span>{atajo}</span>
                    </div>
                    <div className="whitespace-pre-wrap mb-2">{texto}</div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onSend(texto)}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                      >
                        <Send className="w-4 h-4 mr-1" /> Enviar
                      </button>
                      <button
                        onClick={() => startEdit(uuid)}
                        className="px-2 py-1 border rounded hover:bg-gray-200 flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(uuid)}
                        className="px-2 py-1 border rounded hover:bg-red-100 text-red-600 flex items-center"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
