export type EstadoUsuario = 'activo' | 'preregistrado' | 'invitacion_expirada' | 'sin_invitacion' | 'bloqueado' | 'reset_contraseña' | 'reset_2fa';

export interface Usuario {
  id: number;
  username: string;
  nombre: string | null;
  apellido: string | null;
  run: string | null;
  telefono: string | null;
  email: string | null;
  creado_en: string;
  actualizado_en: string;
  creado_por_username: string | null;
  actualizado_por_username: string | null;
  rol: { id: number; nombre: string } | null;
  oficina: { id: number; nombre: string; region: string } | null;
  estado: EstadoUsuario;
}
