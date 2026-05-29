import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AuthModule } from '../../auth/auth.module';
import { RequirePermissionGuard } from '../guards/require-permission.guard';

@Module({
  imports: [AuthModule],
  controllers: [SessionsController],
  providers: [SessionsService, RequirePermissionGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
