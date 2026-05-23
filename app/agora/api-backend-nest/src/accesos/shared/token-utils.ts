import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generarTokenUnico(): { plain: string; hash: string } {
  const plain = crypto.randomBytes(4).toString('hex').toUpperCase();
  const hash = bcrypt.hashSync(plain, 10);
  return { plain, hash };
}

export function expiracionEn(horas = 24): Date {
  const d = new Date();
  d.setHours(d.getHours() + horas);
  return d;
}
