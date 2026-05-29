import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { RequirePermission } from '../accesos/decorators/permission.decorator';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { CreatePriceLevelDto } from './dto/create-price-level.dto';
import { UpdatePriceLevelDto } from './dto/update-price-level.dto';
import { BulkImportSaleDto } from './dto/bulk-import-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesCatalogService } from './sales-catalog.service';
import { SalesPriceLevelService } from './sales-price-level.service';
import { SalesService } from './sales.service';

@ApiTags('Ventas')
@ApiBearerAuth('panel-jwt')
@Controller('sales-record')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('gestion_ventas')
@UseInterceptors(TransformInterceptor)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class SalesRecordController {
  constructor(
    private readonly catalogService: SalesCatalogService,
    private readonly priceLevelService: SalesPriceLevelService,
    private readonly salesService: SalesService,
  ) {}

  // ─── Catálogo de ofertas ─────────────────────────────────────────────────

  @Get('catalog')
  listCatalog() {
    return this.catalogService.listCatalog();
  }

  @Post('catalog')
  createCatalog(@Body() dto: CreateCatalogDto) {
    return this.catalogService.createCatalog(dto);
  }

  @Patch('catalog/:id')
  updateCatalog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogDto,
  ) {
    return this.catalogService.updateCatalog(id, dto);
  }

  @Delete('catalog/:id')
  deleteCatalog(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteCatalog(id);
  }

  // ─── Matriz de precios ───────────────────────────────────────────────────

  @Get('price-matrix')
  listPriceMatrix() {
    return this.priceLevelService.listPriceMatrix();
  }

  @Post('price-matrix')
  createPriceLevel(@Body() dto: CreatePriceLevelDto) {
    return this.priceLevelService.createPriceLevel(dto);
  }

  @Patch('price-matrix/:id')
  updatePriceLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceLevelDto,
  ) {
    return this.priceLevelService.updatePriceLevel(id, dto);
  }

  @Delete('price-matrix/:id')
  deletePriceLevel(@Param('id', ParseIntPipe) id: number) {
    return this.priceLevelService.deletePriceLevel(id);
  }

  // ─── Puntos mensuales ────────────────────────────────────────────────────

  @Get('monthly-points')
  listMonthlyPoints() {
    return this.salesService.listMonthlyPoints();
  }

  @Get('monthly-points/:year/:month')
  getMonthlyPoints(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.salesService.getMonthlyPoints(year, month);
  }

  // ─── Ventas ──────────────────────────────────────────────────────────────

  @Get()
  listSales(@Query('year') year?: number, @Query('month') month?: number) {
    return this.salesService.listSales(year, month);
  }

  @Post('bulk')
  bulkImportSales(@Body() dto: BulkImportSaleDto) {
    return this.salesService.bulkImportSales(dto.records);
  }

  @Post()
  createSale(@Body() dto: CreateSaleDto) {
    return this.salesService.createSale(dto);
  }

  @Patch(':id')
  updateSale(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.salesService.updateSale(id, dto);
  }

  @Delete(':id')
  deleteSale(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.deleteSale(id);
  }
}
