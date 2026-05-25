import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IVaultGateway,
  VAULT_GATEWAY,
} from './interfaces/vault-gateway.interface';
import { CacheService } from '../cache/cache.service';
import jwt, { SignOptions } from 'jsonwebtoken';

const CACHE_TTL_JWT_KEY = 3600; // 1 hora — misma instancia entre redeployos normales

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(VAULT_GATEWAY) private readonly vaultService: IVaultGateway,
    private readonly cache: CacheService,
  ) {}

  private async getPrivateKey(): Promise<string> {
    const cached = await this.cache.get<string>('auth:jwt:privateKey');
    if (cached) return cached;
    const vaultPath =
      process.env.VAULT_JWT_PRIVATE_KEY_PATH || 'accesos/keys/private';
    const key = await this.vaultService.getSecretKey(vaultPath);
    await this.cache.set('auth:jwt:privateKey', key, CACHE_TTL_JWT_KEY);
    return key;
  }

  async firmarToken(
    payload: object,
    expiresIn: string | number = '12h',
  ): Promise<string> {
    const key = await this.getPrivateKey();
    return jwt.sign(payload, key, {
      algorithm: 'RS256',
      expiresIn,
    } as SignOptions);
  }

  private async getPublicKey(): Promise<string> {
    const cached = await this.cache.get<string>('auth:jwt:publicKey');
    if (cached) return cached;
    const vaultPath =
      process.env.VAULT_JWT_PUBLIC_KEY_PATH || 'accesos/keys/public';
    const key = await this.vaultService.getSecretKey(vaultPath);
    await this.cache.set('auth:jwt:publicKey', key, CACHE_TTL_JWT_KEY);
    return key;
  }

  private async getPublicKeyBot(): Promise<string> {
    const cached = await this.cache.get<string>('auth:jwt:publicKeyBot');
    if (cached) return cached;
    const vaultPath =
      process.env.VAULT_JWT_BOT_PUBLIC_KEY_PATH || 'accesos/keys/public_bot';
    const key = await this.vaultService.getSecretKey(vaultPath);
    await this.cache.set('auth:jwt:publicKeyBot', key, CACHE_TTL_JWT_KEY);
    return key;
  }

  async verificarToken(
    token: string,
    origen: 'panel' | 'bot' = 'panel',
  ): Promise<any> {
    try {
      const key =
        origen === 'bot'
          ? await this.getPublicKeyBot()
          : await this.getPublicKey();
      return jwt.verify(token, key, { algorithms: ['RS256'] });
    } catch (err: any) {
      this.logger.warn(`Token inválido: ${err.message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
