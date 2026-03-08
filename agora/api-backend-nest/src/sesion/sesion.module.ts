import { Module } from '@nestjs/common';
import { SesionController } from './sesion.controller';
import { SesionService } from './sesion.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module'; // 👈 AÑADE ESTA LÍNEA

@Module({
  imports: [
    JwtModule.register({}),
    AuthModule, // 👈 Y AÑADE ESTA EN EL ARRAY
  ],
  controllers: [SesionController],
  providers: [SesionService, PrismaService],
})
export class SesionModule {}
