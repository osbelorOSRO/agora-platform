import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

@Controller('ping') // Esto define la ruta /ping
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getPing(): string {
   return 'pong\n';
  }

  @Get('db')
  async getDbPing() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { ok: true, db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: 'down' });
    }
  }
}
