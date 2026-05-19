export type Offer = {
  codigo: string;
  nombre: string | null;
  precio_base: string | null;
  tipo: string | null;
  descripcion: string | null;
  lineas: number | null;
  excluye_alta: boolean | null;
  excluye_portabilidad_postpago: boolean | null;
  url_archivo: string | null;
  precio_normal: number | null;
  duracion_precio: string | null;
  gigas: number | null;
  minutos: string | null;
  tiene_redes_libres: boolean | null;
  roaming: string | null;
};

export type CreateOfferInput = {
  codigo: string;
  nombre?: string | null;
  precio_base?: number | null;
  tipo?: string | null;
  descripcion?: string | null;
  lineas?: number | null;
  excluye_alta?: boolean;
  excluye_portabilidad_postpago?: boolean;
  url_archivo?: string | null;
  precio_normal?: number | null;
  duracion_precio?: string | null;
  gigas?: number | null;
  minutos?: string | null;
  tiene_redes_libres?: boolean;
  roaming?: string | null;
};

export type UpdateOfferInput = Partial<Omit<CreateOfferInput, 'codigo'>>;

export const TIPO_OPTIONS = ['individual', 'multilineas', 'adicional'] as const;
