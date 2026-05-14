import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { VaultService } from './vaultService.js';

dotenv.config();

const vaultService = new VaultService();

let cachedKeyBot = '';
let cachedKeyHuman = '';

export const verifyTokenBot = async (token: string): Promise<any> => {
  if (!cachedKeyBot) {
    const path = process.env.VAULT_JWT_BOT_PUBLIC_KEY_PATH || 'accesos/keys/public_bot';
    cachedKeyBot = await vaultService.getSecretKey(
      path,
      'key',
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
    const path = process.env.VAULT_JWT_PUBLIC_KEY_PATH || 'accesos/keys/public';
    cachedKeyHuman = await vaultService.getSecretKey(
      path,
      'key',
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
