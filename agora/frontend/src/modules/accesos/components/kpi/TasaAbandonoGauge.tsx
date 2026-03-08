
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface Props {
  porcentaje: number;
}

export default function TasaAbandonoGauge({ porcentaje }: Props) {
  const data = [
    {
      name: 'Abandono',
      value: porcentaje,
      fill: '#ffffff',
    },
  ];

  return (
    <div className="text-center">
      <h2 className="text-white text-lg font-semibold mb-2">Tasa de Abandono</h2>
      <RadialBarChart
        width={250}
        height={150}
        innerRadius="80%"
        outerRadius="100%"
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar
          dataKey="value"
          cornerRadius={10}
          isAnimationActive
        />
      </RadialBarChart>
      <div className="text-white font-bold mt-2">{porcentaje.toFixed(1)}%</div>
    </div>
  );
}


