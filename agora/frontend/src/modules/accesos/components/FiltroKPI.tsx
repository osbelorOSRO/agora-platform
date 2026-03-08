import { useState } from "react";

type Props = {
  onFiltrar: (usuarioId: number, desde: string, hasta: string) => void;
};

export default function FiltroKPI({ onFiltrar }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [usuarioId, setUsuarioId] = useState<number>(12);
  const [desde, setDesde] = useState(firstDay);
  const [hasta, setHasta] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId || isNaN(usuarioId)) return;
    onFiltrar(usuarioId, desde, hasta);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end text-white mb-6">
      <div className="flex flex-col">
        <label htmlFor="usuarioId" className="text-sm font-semibold">Usuario ID</label>
        <input
          type="number"
          id="usuarioId"
          value={usuarioId}
          onChange={(e) => setUsuarioId(parseInt(e.target.value))}
          className="bg-white/10 text-white px-3 py-1 rounded-md border border-white/20"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="desde" className="text-sm font-semibold">Desde</label>
        <input
          type="date"
          id="desde"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="bg-white/10 text-white px-3 py-1 rounded-md border border-white/20"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="hasta" className="text-sm font-semibold">Hasta</label>
        <input
          type="date"
          id="hasta"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="bg-white/10 text-white px-3 py-1 rounded-md border border-white/20"
        />
      </div>

      <button
        type="submit"
        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
      >
        Filtrar
      </button>
    </form>
  );
}
