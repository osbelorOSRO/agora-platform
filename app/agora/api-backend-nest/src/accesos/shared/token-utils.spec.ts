import { generarTokenUnico, expiracionEn } from './token-utils';

describe('token-utils', () => {
  describe('generarTokenUnico', () => {
    it('devuelve plain y hash distintos', () => {
      const { plain, hash } = generarTokenUnico();
      expect(plain).not.toBe(hash);
    });

    it('plain tiene 8 caracteres hex en mayúsculas', () => {
      const { plain } = generarTokenUnico();
      expect(plain).toMatch(/^[A-F0-9]{8}$/);
    });

    it('cada llamada genera un token distinto', () => {
      const a = generarTokenUnico();
      const b = generarTokenUnico();
      expect(a.plain).not.toBe(b.plain);
    });
  });

  describe('expiracionEn', () => {
    it('devuelve una fecha en el futuro por defecto (24h)', () => {
      const exp = expiracionEn();
      expect(exp.getTime()).toBeGreaterThan(Date.now());
    });

    it('devuelve fecha aproximadamente N horas en el futuro', () => {
      const horas = 2;
      const antes = Date.now();
      const exp = expiracionEn(horas);
      const despues = Date.now();
      const expectedMs = horas * 3600 * 1000;
      expect(exp.getTime()).toBeGreaterThanOrEqual(antes + expectedMs - 100);
      expect(exp.getTime()).toBeLessThanOrEqual(despues + expectedMs + 100);
    });
  });
});
