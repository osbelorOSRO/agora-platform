import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { VaultService } from './vault.service';
import jwt, { SignOptions } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private privateKey: string | undefined;
  private publicKey: string | undefined;
  private publicKeyBot: string | undefined;

  constructor(private readonly vaultService: VaultService) {}

  private async getPrivateKey(): Promise<string> {
    if (!this.privateKey) {
      const path = process.env.VAULT_JWT_PRIVATE_KEY_PATH || 'accesos/keys/private';
      this.privateKey = await this.vaultService.getSecretKey(path);
    }
    return this.privateKey;
  }

  async firmarToken(payload: object, expiresIn: string | number = '12h'): Promise<string> {
    const key = await this.getPrivateKey();
    return jwt.sign(payload, key, { algorithm: 'RS256', expiresIn } as SignOptions);
  }

  private async getPublicKey(): Promise<string> {
    if (!this.publicKey) {
      const path = process.env.VAULT_JWT_PUBLIC_KEY_PATH || 'accesos/keys/public';
      this.publicKey = await this.vaultService.getSecretKey(path);
    }
    return this.publicKey;
  }

  private async getPublicKeyBot(): Promise<string> {
    if (!this.publicKeyBot) {
      const path = process.env.VAULT_JWT_BOT_PUBLIC_KEY_PATH || 'accesos/keys/public_bot';
      this.publicKeyBot = await this.vaultService.getSecretKey(path);
    }
    return this.publicKeyBot;
  }

  async verificarToken(token: string, origen: 'panel' | 'bot' = 'panel'): Promise<any> {
    try {
      const key = origen === 'bot' ? await this.getPublicKeyBot() : await this.getPublicKey();
      return jwt.verify(token, key, { algorithms: ['RS256'] });
    } catch (err: any) {
      this.logger.warn(`Token inválido: ${err.message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
