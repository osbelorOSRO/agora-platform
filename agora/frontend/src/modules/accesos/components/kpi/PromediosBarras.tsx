import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  tmo: number;
  sla: number;
}

export default function PromediosBarras({ tmo, sla }: Props) {
  const data = [
    { name: 'TMO', valor: tmo },
    { name: 'SLA', valor: sla },
  ];

  return (
    <div className="bg-white/5 p-4 rounded-xl shadow text-center">
      <h2 className="mb-2 font-semibold">Tiempos Promedio (seg)</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="valor" fill="#38bdf8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
