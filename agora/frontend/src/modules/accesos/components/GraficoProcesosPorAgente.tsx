import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { TooltipProps } from "recharts";
import type { ProcesoPorAgente } from "../types/productividad";

type Props = {
  datos: ProcesoPorAgente[];
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const abiertos = payload.find((p) => p.dataKey === "abiertos")?.value || 0;
    const cerrados = payload.find((p) => p.dataKey === "cerrados")?.value || 0;
    return (
      <div style={{
        background: '#222',
        padding: '10px',
        borderRadius: '8px',
        color: '#fff',
        border: '1px solid #06b6d4',
        fontSize: 13
      }}>
        <div><strong>Usuario ID:</strong> {label}</div>
        <div><strong>Abiertos:</strong> {abiertos}</div>
        <div><strong>Cerrados:</strong> {cerrados}</div>
      </div>
    );
  }
  return null;
};

export default function GraficoProcesosPorAgente({ datos }: Props) {
  const datosGraficos = datos.map((item) => ({
    ...item,
    usuario_id: String(item.usuario_id),
  }));

  return (
    <div className="bg-white/5 p-4 rounded-xl shadow text-white">
      <h2 className="text-lg font-semibold mb-4">Procesos Abiertos y Cerrados por Agente</h2>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={datosGraficos} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis
            dataKey="usuario_id"
            stroke="#fff"
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y + 10}
                textAnchor="end"
                transform={`rotate(-40 ${x},${y})`}
                fontSize={10}
                fill="#fff"
                style={{ fontFamily: "inherit" }}
              >
                {payload.value}
              </text>
            )}
            interval={0}
            height={90}
          />
          <YAxis stroke="#fff" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar stackId="a" dataKey="abiertos" name="Abiertos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          <Bar stackId="a" dataKey="cerrados" name="Cerrados" fill="#16f5ba" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
