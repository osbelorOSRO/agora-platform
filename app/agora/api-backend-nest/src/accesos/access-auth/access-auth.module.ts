import { Module } from '@nestjs/common';
import { AccessAuthController } from './access-auth.controller';
import { AccessAuthService } from './access-auth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AccessAuthController],
  providers: [AccessAuthService],
})
export class AccessAuthModule {}
