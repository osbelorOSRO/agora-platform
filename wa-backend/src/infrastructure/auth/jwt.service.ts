import jwt from 'jsonwebtoken';
import { vaultService } from '../vault/vault.service.js';

export class JwtService {

  async signBotToken(): Promise<string> {
    const privateKey = await vaultService.getSecret(
      'accesos/keys/bot-private',
      'key'
    );

    const payload = {
      id: 20,
      username: 'baileysbot',
      rol: 'automate',
    };

    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: '12h',
    });
  }

  async verifyBackendToken(token: string): Promise<any> {
    const backendPublicKey = await vaultService.getSecret(
      'accesos/keys/public',
      'key'
    );

    return jwt.verify(token, backendPublicKey, {
      algorithms: ['RS256'],
    });
  }

  async getSocketSecret(): Promise<string> {
    return await vaultService.getSecret(
      'accesos/bot',
      'secret_key_wa'
    );
  }
}

export const jwtService = new JwtService();
