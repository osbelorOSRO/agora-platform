import type { Etiqueta } from '@/types/Etiqueta';
import { ETIQUETA_COLOR_MAP } from '@/theme/etiquetas';

export function etiquetaClasses(etiqueta?: Etiqueta): string {
  // 1) Si backend ya trae clases, úsalas
  if (etiqueta?.bg_class || etiqueta?.text_class) {
    const bg = etiqueta.bg_class ?? 'bg-[#6F2DBD]';
    const fg = etiqueta.text_class ?? 'text-white';
    return `${bg} ${fg}`;
  }
  // 2) Fallback por id (lookup local)
  if (etiqueta?.etiqueta_id) {
    const m = ETIQUETA_COLOR_MAP[etiqueta.etiqueta_id];
    if (m) return `${m.bg_class} ${m.text_class}`;
  }
  // 3) Fallback final seguro
  return 'bg-[#6F2DBD] text-white';
}
