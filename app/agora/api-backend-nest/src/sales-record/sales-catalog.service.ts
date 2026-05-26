import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { offer } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

const CACHE_KEY = 'sales:catalog:list';
const CACHE_TTL = 300;

@Injectable()
export class SalesCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listCatalog(): Promise<offer[]> {
    const cached = await this.cache.get<offer[]>(CACHE_KEY);
    if (cached) return cached;
    const result = await this.prisma.offer.findMany({
      orderBy: [{ code: 'asc' }, { modality: 'asc' }],
    });
    await this.cache.set(CACHE_KEY, result, CACHE_TTL);
    return result;
  }

  async createCatalog(dto: CreateCatalogDto): Promise<offer> {
    const exists = await this.prisma.offer.findUnique({
      where: { code_modality: { code: dto.code, modality: dto.modality } },
    });
    if (exists) throw new ConflictException(`Ya existe oferta "${dto.code}" / ${dto.modality}`);
    const result = await this.prisma.offer.create({ data: dto });
    await this.cache.del(CACHE_KEY);
    return result;
  }

  async updateCatalog(id: number, dto: UpdateCatalogDto): Promise<offer> {
    await this.findOfferOrThrow(id);
    const result = await this.prisma.offer.update({ where: { id }, data: dto });
    await this.cache.del(CACHE_KEY);
    return result;
  }

  async deleteCatalog(id: number): Promise<{ ok: boolean; id: number }> {
    await this.findOfferOrThrow(id);
    try {
      await this.prisma.offer.delete({ where: { id } });
    } catch {
      throw new ConflictException('No se puede eliminar: la oferta tiene ventas asociadas');
    }
    await this.cache.del(CACHE_KEY);
    return { ok: true, id };
  }

  private async findOfferOrThrow(id: number): Promise<offer> {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException(`Oferta #${id} no encontrada`);
    return offer;
  }
}
