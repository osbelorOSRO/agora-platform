export interface UsuarioJWT {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  permisos: string[];
  iat?: number;
  exp?: number;
}
