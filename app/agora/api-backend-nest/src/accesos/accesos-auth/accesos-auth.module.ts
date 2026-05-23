import { Module } from '@nestjs/common';
import { AccesosAuthController } from './accesos-auth.controller';
import { AccesosAuthService } from './accesos-auth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AccesosAuthController],
  providers: [AccesosAuthService],
  exports: [AccesosAuthService],
})
export class AccesosAuthModule {}
