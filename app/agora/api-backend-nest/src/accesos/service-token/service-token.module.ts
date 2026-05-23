import { Module } from '@nestjs/common';
import { ServiceTokenController } from './service-token.controller';
import { ServiceTokenService } from './service-token.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ServiceTokenController],
  providers: [ServiceTokenService],
})
export class ServiceTokenModule {}
