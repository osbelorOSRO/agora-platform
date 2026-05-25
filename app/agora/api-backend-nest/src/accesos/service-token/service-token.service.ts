import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { IVaultGateway, VAULT_GATEWAY } from '../../auth/interfaces/vault-gateway.interface';

@Injectable()
export class ServiceTokenService {
  constructor(
    private readonly authService: AuthService,
    @Inject(VAULT_GATEWAY) private readonly vaultService: IVaultGateway,
  ) {}

  async issueServiceToken(serviceId: string, secretKey: string): Promise<object> {
    if (!serviceId || !secretKey) throw new BadRequestException('serviceId y secretKey son requeridos');
    if (typeof serviceId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(serviceId) || serviceId.length > 64)
      throw new BadRequestException('serviceId inválido');
    if (typeof secretKey !== 'string' || secretKey.length > 256)
      throw new BadRequestException('Credenciales inválidas');

    let storedSecret: string;
    try {
      storedSecret = await this.vaultService.getSecretKey(`accesos/service-keys/${serviceId}`);
    } catch {
      throw new BadRequestException('serviceId no válido');
    }

    if (secretKey !== storedSecret) throw new UnauthorizedException('Credenciales de servicio inválidas');

    const token = await this.authService.firmarToken({ sub: serviceId }, '30m');
    return { token, expiresIn: 1800, tokenType: 'Bearer' };
  }
}
