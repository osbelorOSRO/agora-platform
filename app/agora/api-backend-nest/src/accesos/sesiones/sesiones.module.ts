import { Module } from '@nestjs/common';
import { SesionesController } from './sesiones.controller';
import { SesionesService } from './sesiones.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SesionesController],
  providers: [SesionesService],
})
export class SesionesModule {}
