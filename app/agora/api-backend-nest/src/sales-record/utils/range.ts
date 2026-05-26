export function computeRange(totalPoints: number): number {
  if (totalPoints >= 35) return 3;
  if (totalPoints >= 20) return 2;
  return 1;
}
