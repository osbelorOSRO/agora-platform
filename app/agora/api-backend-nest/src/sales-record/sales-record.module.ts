import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { CacheConfigModule } from '../cache/cache.module';
import { SalesRecordController } from './sales-record.controller';
import { SalesCatalogService } from './sales-catalog.service';
import { SalesPriceLevelService } from './sales-price-level.service';
import { SalesService } from './sales.service';

@Module({
  imports: [AuthModule, CacheConfigModule],
  controllers: [SalesRecordController],
  providers: [SalesCatalogService, SalesPriceLevelService, SalesService, PrismaService],
})
export class SalesRecordModule {}
