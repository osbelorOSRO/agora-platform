import { clsx } from "clsx";

// Combina múltiples clases (como en Tailwind)
export function cn(...inputs: any[]) {
  return clsx(...inputs);
}
