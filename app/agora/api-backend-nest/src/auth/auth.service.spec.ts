import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const { privateKey: otherPrivateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const makeCache = () => {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(async <T>(k: string) => store.get(k) as T | undefined),
    set: jest.fn(async <T>(k: string, v: T) => {
      store.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
};

const makeConfig = () => ({ get: jest.fn().mockReturnValue(undefined) });

const makeVault = (privKey = privateKey, pubKey = publicKey) => ({
  getSecretKey: jest.fn(async (path: string) => {
    if (path.includes('private')) return privKey;
    return pubKey;
  }),
  getSecretField: jest.fn(async () => ''),
});

describe('AuthService', () => {
  describe('firmarToken', () => {
    it('devuelve un JWT RS256 con el payload', async () => {
      const svc = new AuthService(
        makeVault(),
        makeCache() as any,
        makeConfig() as any,
      );
      const payload = { id: 1, rol: 'admin' };
      const token = await svc.firmarToken(payload);

      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded['id']).toBe(1);
      expect(decoded['rol']).toBe('admin');
    });

    it('usa la clave privada desde vault una sola vez y cachea', async () => {
      const vault = makeVault();
      const cache = makeCache();
      const svc = new AuthService(vault, cache as any, makeConfig() as any);

      await svc.firmarToken({ id: 1 });
      await svc.firmarToken({ id: 2 });

      expect(vault.getSecretKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('verificarToken — origen panel', () => {
    it('devuelve el payload con token válido', async () => {
      const svc = new AuthService(
        makeVault(),
        makeCache() as any,
        makeConfig() as any,
      );
      const token = jwt.sign({ id: 99, rol: 'superadmin' }, privateKey, {
        algorithm: 'RS256',
      });

      const result = await svc.verificarToken(token, 'panel');
      expect(result.id).toBe(99);
      expect(result.rol).toBe('superadmin');
    });

    it('lanza UnauthorizedException con token expirado', async () => {
      const svc = new AuthService(
        makeVault(),
        makeCache() as any,
        makeConfig() as any,
      );
      const token = jwt.sign({ id: 1 }, privateKey, {
        algorithm: 'RS256',
        expiresIn: -1,
      });

      await expect(svc.verificarToken(token, 'panel')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException con firma de otra clave', async () => {
      const svc = new AuthService(
        makeVault(),
        makeCache() as any,
        makeConfig() as any,
      );
      const token = jwt.sign({ id: 1 }, otherPrivateKey, {
        algorithm: 'RS256',
      });

      await expect(svc.verificarToken(token, 'panel')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException con token malformado', async () => {
      const svc = new AuthService(
        makeVault(),
        makeCache() as any,
        makeConfig() as any,
      );

      await expect(svc.verificarToken('no.es.un.jwt', 'panel')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException con algoritmo HS256', async () => {
      const svc = new AuthService(
        makeVault(),
        makeCache() as any,
        makeConfig() as any,
      );
      const token = jwt.sign({ id: 1 }, 'secreto-hmac', {
        algorithm: 'HS256',
      });

      await expect(svc.verificarToken(token, 'panel')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verificarToken — origen bot', () => {
    it('usa la clave pública del bot (diferente a la de panel)', async () => {
      const vault = makeVault();
      const cache = makeCache();
      const svc = new AuthService(vault, cache as any, makeConfig() as any);

      const token = jwt.sign({ id: 1 }, privateKey, { algorithm: 'RS256' });
      await svc.verificarToken(token, 'bot');

      const callPaths = vault.getSecretKey.mock.calls.map(
        (c: string[]) => c[0],
      );
      expect(callPaths.some((p: string) => p.includes('bot'))).toBe(true);
    });
  });

  describe('cache de claves', () => {
    it('getPublicKey consulta vault una vez y cachea para llamadas siguientes', async () => {
      const vault = makeVault();
      const cache = makeCache();
      const svc = new AuthService(vault, cache as any, makeConfig() as any);

      const token = jwt.sign({ id: 1 }, privateKey, { algorithm: 'RS256' });
      await svc.verificarToken(token, 'panel');
      await svc.verificarToken(token, 'panel');

      expect(vault.getSecretKey).toHaveBeenCalledTimes(1);
    });
  });
});
