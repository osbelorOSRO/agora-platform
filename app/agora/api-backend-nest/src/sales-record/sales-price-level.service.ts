import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { price_level } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreatePriceLevelDto } from './dto/create-price-level.dto';
import { UpdatePriceLevelDto } from './dto/update-price-level.dto';

const CACHE_KEY = 'sales:price-matrix:list';
const CACHE_TTL = 300;

@Injectable()
export class SalesPriceLevelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listPriceMatrix(): Promise<price_level[]> {
    const cached = await this.cache.get<price_level[]>(CACHE_KEY);
    if (cached) return cached;
    const result = await this.prisma.price_level.findMany({
      orderBy: [{ level: 'asc' }, { range: 'asc' }],
    });
    await this.cache.set(CACHE_KEY, result, CACHE_TTL);
    return result;
  }

  async createPriceLevel(dto: CreatePriceLevelDto): Promise<price_level> {
    const exists = await this.prisma.price_level.findUnique({
      where: { level_range: { level: dto.level, range: dto.range } },
    });
    if (exists) throw new ConflictException(`Ya existe precio para level ${dto.level} / rango ${dto.range}`);
    const result = await this.prisma.price_level.create({ data: dto });
    await this.cache.del(CACHE_KEY);
    return result;
  }

  async updatePriceLevel(id: number, dto: UpdatePriceLevelDto): Promise<price_level> {
    const entry = await this.prisma.price_level.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Entrada de precio #${id} no encontrada`);
    const result = await this.prisma.price_level.update({ where: { id }, data: dto });
    await this.cache.del(CACHE_KEY);
    return result;
  }

  async deletePriceLevel(id: number): Promise<{ ok: boolean; id: number }> {
    const entry = await this.prisma.price_level.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Entrada de precio #${id} no encontrada`);
    await this.prisma.price_level.delete({ where: { id } });
    await this.cache.del(CACHE_KEY);
    return { ok: true, id };
  }
}
