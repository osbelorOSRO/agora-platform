import { Injectable, UnauthorizedException } from '@nestjs/common';
import { VaultService } from './vault.service';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private publicKey: string | undefined;
  private publicKeyBot: string | undefined;

  constructor(private readonly vaultService: VaultService) {}

  private async getPublicKey(): Promise<string> {
    if (!this.publicKey) {
      this.publicKey = await this.vaultService.getSecretKey('accesos/keys/public');
    }
    return this.publicKey;
  }

  private async getPublicKeyBot(): Promise<string> {
    if (!this.publicKeyBot) {
      this.publicKeyBot = await this.vaultService.getSecretKey('accesos/keys/public_bot');
    }
    return this.publicKeyBot;
  }

  async verificarToken(token: string, origen: 'panel' | 'bot' = 'panel'): Promise<any> {
    try {
      const key = origen === 'bot' ? await this.getPublicKeyBot() : await this.getPublicKey();
      return jwt.verify(token, key, { algorithms: ['RS256'] });
    } catch (err: any) {
      console.error('❌ Error al verificar token:', err.message);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
