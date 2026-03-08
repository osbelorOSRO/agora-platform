import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';

interface Props {
  agrupados: Record<string, number>;
}

// Tooltip personalizado que muestra nombre completo y cantidad
const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#262626',
        padding: '10px',
        borderRadius: '8px',
        color: '#fafafa',
        border: '1px solid #a855f7',
        fontSize: 13
      }}>
        <div><strong>Nombre:</strong> {label}</div>
        <div><strong>Cantidad:</strong> {payload[0].value}</div>
      </div>
    );
  }
  return null;
};

export default function ProcesosAgrupadosBarras({ agrupados }: Props) {
  const data = Object.entries(agrupados).map(([key, value]) => ({
    name: key,
    cantidad: value,
  }));

  return (
    <div className="bg-white/5 p-4 rounded-xl shadow text-center col-span-1 md:col-span-2 xl:col-span-3">
      <h2 className="mb-2 font-semibold">Procesos Agrupados</h2>
      <ResponsiveContainer width="100%" height={330}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y + 10}
                textAnchor="end"
                transform={`rotate(-40 ${x},${y})`}
                fontSize={10}
                fill="#d4d4d8"
                style={{ fontFamily: 'inherit' }}
              >
                {payload.value}
              </text>
            )}
            interval={0}
            height={90}
          />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cantidad" fill="#a855f7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
