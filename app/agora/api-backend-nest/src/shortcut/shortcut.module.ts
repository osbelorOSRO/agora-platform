import { Module } from '@nestjs/common';
import { ShortcutService } from './shortcut.service';
import { ShortcutController } from './shortcut.controller';
import { PrismaService } from '../database/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ShortcutController],
  providers: [ShortcutService, PrismaService],
})
export class ShortcutModule {}
