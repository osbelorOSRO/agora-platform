import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { obtenerSignalScoringRules, actualizarSignalDelta } from "../services/settingsService";
import type { SignalScoringRule } from "../types/settings";

const INPUT_CLS = "w-24 bg-transparent border border-border rounded px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const POLARITY_CONFIG = {
  POSITIVE: { label: "Positiva", color: "text-emerald-400" },
  NEGATIVE: { label: "Negativa", color: "text-red-400"     },
  NONE:     { label: "Neutral",  color: "text-muted-foreground" },
};

export default function SignalScoringRules() {
  const [rules, setRules]           = useState<SignalScoringRule[]>([]);
  const [editandoId, setEditandoId]  = useState<string | null>(null);
  const [valorEdit, setValorEdit]    = useState<string>("");
  const [guardando, setGuardando]    = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setRules(await obtenerSignalScoringRules());
  };

  const iniciarEdicion = (rule: SignalScoringRule) => {
    setEditandoId(rule.id);
    setValorEdit(rule.delta);
  };

  const cancelar = () => { setEditandoId(null); setValorEdit(""); };

  const guardar = async (id: string) => {
    const num = parseFloat(valorEdit);
    if (isNaN(num)) return;
    setGuardando(true);
    try {
      const updated = await actualizarSignalDelta(id, num);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditandoId(null);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Señales de puntuación</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deltas de score por tipo de señal detectada en conversaciones.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border scrollbar-custom">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Tipo de señal</th>
              <th className="px-4 py-3">Polaridad</th>
              <th className="px-4 py-3">Delta</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rules.map((rule) => {
              const editando = editandoId === rule.id;
              const pol = POLARITY_CONFIG[rule.polarity];
              const deltaNum = parseFloat(rule.delta);
              return (
                <tr key={rule.id} className="transition hover:bg-muted">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{rule.signal_type}</td>

                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${pol.color}`}>{pol.label}</span>
                  </td>

                  <td className="px-4 py-3">
                    {editando ? (
                      <input
                        type="number"
                        className={INPUT_CLS}
                        value={valorEdit}
                        onChange={(e) => setValorEdit(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span className={`font-mono font-semibold ${deltaNum > 0 ? "text-emerald-400" : deltaNum < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {deltaNum > 0 ? `+${rule.delta}` : rule.delta}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground">{rule.description ?? "—"}</td>

                  <td className="px-4 py-3">
                    {editando ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => guardar(rule.id)}
                          disabled={guardando}
                          title="Guardar"
                          className="text-emerald-400 hover:text-emerald-300 transition"
                        >
                          <Save size={16} />
                        </button>
                        <button type="button" onClick={cancelar} title="Cancelar" className="text-muted-foreground hover:text-muted-foreground transition">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => iniciarEdicion(rule)} title="Editar" className="text-muted-foreground hover:text-white transition">
                        <Pencil size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">Total: {rules.length} señal{rules.length !== 1 ? "es" : ""}</p>
    </section>
  );
}
