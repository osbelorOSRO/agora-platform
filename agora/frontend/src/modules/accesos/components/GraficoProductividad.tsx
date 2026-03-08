import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";
import type { ProcesoProductividad } from "../types/productividad";

type Props = {
  procesos: ProcesoProductividad[];
};

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#262626',
        padding: '10px',
        borderRadius: '8px',
        color: '#fafafa',
        border: '1px solid #16f5ba',
        fontSize: 13
      }}>
        <div><strong>Fecha:</strong> {label}</div>
        <div><strong>Cantidad:</strong> {payload[0].value}</div>
      </div>
    );
  }
  return null;
};

export default function GraficoProductividad({ procesos }: Props) {
  const agrupadosPorFecha: Record<string, number> = {};
  procesos.forEach((p) => {
    if (p.fecha_inicio) {
      const fechaDate = new Date(p.fecha_inicio);
      if (!isNaN(fechaDate.getTime())) {
        const fecha = fechaDate.toISOString().slice(0, 10);
        agrupadosPorFecha[fecha] = (agrupadosPorFecha[fecha] || 0) + 1;
      }
    }
  });

  // Ordenar fechas de más antiguo a más reciente
  const datosGrafico = Object.entries(agrupadosPorFecha)
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datosGrafico}>
          <XAxis
            dataKey="fecha"
            stroke="#fff"
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y + 10}
                textAnchor="end"
                transform={`rotate(-40 ${x},${y})`}
                fontSize={10}
                fill="#fff"
                style={{ fontFamily: 'inherit' }}
              >
                {payload.value}
              </text>
            )}
            interval={0}
            height={90}
          />
          <YAxis stroke="#fff" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cantidad" fill="#16f5ba" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
