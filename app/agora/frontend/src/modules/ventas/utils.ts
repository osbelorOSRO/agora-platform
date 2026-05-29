export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatPrecio(n: number): string {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 });
}

export function progressInfo(
  totalPoints: number,
  activeRange: number,
): { percent: number; label: string } {
  if (activeRange >= 3) return { percent: 100, label: `${totalPoints} pts — Rango máximo alcanzado` };
  if (activeRange === 2) {
    return {
      percent: Math.min(((totalPoints - 20) / 15) * 100, 100),
      label: `${totalPoints} / 35 pts para Rango 3`,
    };
  }
  return {
    percent: Math.min((totalPoints / 20) * 100, 100),
    label: `${totalPoints} / 20 pts para Rango 2`,
  };
}
