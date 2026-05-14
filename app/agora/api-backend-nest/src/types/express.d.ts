// src/types/express.d.ts
import { UsuarioJWT } from '../../auth/interfaces/usuario.interface';

declare module 'express' {
  export interface Request {
    user?: UsuarioJWT;
  }
}
