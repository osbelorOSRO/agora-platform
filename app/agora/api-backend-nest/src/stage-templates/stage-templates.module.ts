import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { StageTemplatesController } from './stage-templates.controller';
import { StageTemplatesService } from './stage-templates.service';

@Module({
  imports: [AuthModule],
  controllers: [StageTemplatesController],
  providers: [StageTemplatesService, PrismaService],
})
export class StageTemplatesModule {}
