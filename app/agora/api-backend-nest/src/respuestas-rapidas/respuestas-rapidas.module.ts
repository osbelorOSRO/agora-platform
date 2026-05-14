import { Module } from '@nestjs/common';
import { RespuestasRapidasService } from './respuestas-rapidas.service';
import { RespuestasRapidasController } from './respuestas-rapidas.controller';
import { PrismaService } from '../database/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RespuestasRapidasController],
  providers: [RespuestasRapidasService, PrismaService],
})
export class RespuestasRapidasModule {}
