import { Module } from '@nestjs/common';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PermisosController],
  providers: [PermisosService],
})
export class PermisosModule {}
