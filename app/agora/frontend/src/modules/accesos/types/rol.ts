export interface Rol {
  id: number;
  nombre: string;
  permisos: number[];
  creado_por_username: string | null;
  actualizado_por_username: string | null;
  creado_en: string;
  actualizado_en: string;
}
