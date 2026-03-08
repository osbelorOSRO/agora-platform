import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { VaultService } from './vaultService.js';

dotenv.config();

const vaultService = new VaultService();

let cachedKeyBot = '';
let cachedKeyHuman = '';

export const verifyTokenBot = async (token: string): Promise<any> => {
  if (!cachedKeyBot) {
    // Clave pública del bot desde Vault
    cachedKeyBot = await vaultService.getSecretKey(
      'accesos/keys/public_bot', // path en Vault (sin 'secret/')
      'key',                      // campo dentro del secret
    );
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, cachedKeyBot, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.error('❌ Error en jwt.verify (bot):', err.message);
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

export const verifyTokenHuman = async (token: string): Promise<any> => {
  if (!cachedKeyHuman) {
    // Clave pública del backend (human) desde Vault
    cachedKeyHuman = await vaultService.getSecretKey(
      'accesos/keys/public', // path en Vault
      'key',                 // campo dentro del secret
    );
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, cachedKeyHuman, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.error('❌ Error en jwt.verify (human):', err.message);
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};
