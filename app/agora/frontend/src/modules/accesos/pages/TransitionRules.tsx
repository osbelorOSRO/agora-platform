import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { obtenerTransitionRules, actualizarTransitionThreshold } from "../services/settingsService";
import type { TransitionRule } from "../types/settings";

const INPUT_CLS = "w-24 bg-transparent border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";

const OPERATOR_LABEL: Record<string, string> = {
  lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=",
};

const STATE_COLOR: Record<string, string> = {
  QUALIFIED: "text-emerald-400",
  CHURNED:   "text-red-400",
  BLOCKED:   "text-orange-400",
  NEW:       "text-[#B3B3B3]",
};

export default function TransitionRules() {
  const [rules, setRules]         = useState<TransitionRule[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEdit, setValorEdit]  = useState<string>("");
  const [guardando, setGuardando]  = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setRules(await obtenerTransitionRules());
  };

  const iniciarEdicion = (rule: TransitionRule) => {
    setEditandoId(rule.id);
    setValorEdit(rule.score_threshold ?? "");
  };

  const cancelar = () => { setEditandoId(null); setValorEdit(""); };

  const guardar = async (id: string) => {
    const num = parseFloat(valorEdit);
    if (isNaN(num)) return;
    setGuardando(true);
    try {
      const updated = await actualizarTransitionThreshold(id, num);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditandoId(null);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Reglas de transición</h1>
        <p className="mt-2 text-sm text-[#999999]">
          Umbrales de score que determinan el estado del actor en el ciclo de vida.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Estado destino</th>
              <th className="px-4 py-3">Condición score</th>
              <th className="px-4 py-3">Umbral</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B1B1B]">
            {rules.map((rule) => {
              const editando = editandoId === rule.id;
              return (
                <tr key={rule.id} className="transition hover:bg-[#141414]">
                  <td className="px-4 py-3 text-[#999999]">{rule.priority}</td>

                  <td className="px-4 py-3">
                    <span className={`font-semibold ${STATE_COLOR[rule.target_state] ?? "text-white"}`}>
                      {rule.target_state}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-[#CCCCCC]">
                    {rule.score_operator ? `score ${OPERATOR_LABEL[rule.score_operator]}` : <span className="text-[#4D4D4D]">—</span>}
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
                      <span className="font-mono text-white">
                        {rule.score_threshold ?? <span className="text-[#4D4D4D]">—</span>}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[#999999] text-xs">{rule.description ?? "—"}</td>

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
                        <button type="button" onClick={cancelar} title="Cancelar" className="text-[#666666] hover:text-[#B3B3B3] transition">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      rule.score_threshold !== null && (
                        <button type="button" onClick={() => iniciarEdicion(rule)} title="Editar" className="text-[#808080] hover:text-white transition">
                          <Pencil size={15} />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#4D4D4D]">Total: {rules.length} regla{rules.length !== 1 ? "s" : ""}</p>
    </section>
  );
}
