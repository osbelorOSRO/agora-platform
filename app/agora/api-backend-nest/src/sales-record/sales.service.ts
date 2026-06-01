import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { points_level } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { computeRange } from './utils/range';

type SaleWithOffer = Prisma.sale_recordGetPayload<{ include: { offer: true } }>;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMonthlyPoints(): Promise<points_level[]> {
    return this.prisma.points_level.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getMonthlyPoints(
    year: number,
    month: number,
  ): Promise<{
    year: number;
    month: number;
    total_points: number;
    active_range: number;
  }> {
    const entry = await this.prisma.points_level.findUnique({
      where: { year_month: { year, month } },
    });
    const totalPoints = entry ? Number(entry.total_points) : 0;
    return {
      year,
      month,
      total_points: totalPoints,
      active_range: computeRange(totalPoints),
    };
  }

  async listSales(year?: number, month?: number): Promise<SaleWithOffer[]> {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    return this.prisma.sale_record.findMany({
      where: {
        fecha: {
          gte: new Date(y, m - 1, 1),
          lt: new Date(y, m, 1),
        },
      },
      orderBy: { fecha: 'desc' },
      include: { offer: true },
    });
  }

  async createSale(dto: CreateSaleDto): Promise<SaleWithOffer> {
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: {
          code_modality: { code: dto.offers_code, modality: dto.modality },
        },
      });
      if (!offer) {
        throw new NotFoundException(
          `Oferta "${dto.offers_code}" / ${dto.modality} no encontrada en el catálogo`,
        );
      }

      const fecha = new Date(dto.fecha);
      const year = fecha.getFullYear();
      const month = fecha.getMonth() + 1;

      const monthly = await tx.points_level.findUnique({
        where: { year_month: { year, month } },
      });
      const oldTotal = monthly ? Number(monthly.total_points) : 0;
      const oldRange = computeRange(oldTotal);
      const newTotal = oldTotal + Number(offer.points);
      const newRange = computeRange(newTotal);

      await tx.points_level.upsert({
        where: { year_month: { year, month } },
        create: { year, month, total_points: newTotal },
        update: { total_points: newTotal },
      });

      if (newRange !== oldRange) {
        await this.recalculateMonth(tx, year, month, newRange);
      }

      const priceEntry = await tx.price_level.findUnique({
        where: { level_range: { level: offer.level, range: newRange } },
      });
      if (!priceEntry) {
        throw new NotFoundException(
          `No hay precio configurado para level ${offer.level} / rango ${newRange}. Configure la matriz de precios primero.`,
        );
      }

      return tx.sale_record.create({
        data: {
          fecha,
          run: dto.run,
          full_name: dto.full_name,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          province: dto.province,
          country: dto.country,
          contract_number: dto.contract_number,
          modality: dto.modality,
          offers_code: dto.offers_code,
          offer_id: offer.id,
          level_price: offer.level,
          points: offer.points,
          offers_price: priceEntry.price,
        },
        include: { offer: true },
      });
    });
  }

  async bulkImportSales(dtos: CreateSaleDto[]): Promise<{
    total: number;
    inserted: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const errors: Array<{ index: number; error: string }> = [];
    let inserted = 0;

    for (let i = 0; i < dtos.length; i++) {
      try {
        await this.createSale(dtos[i]);
        inserted++;
      } catch (err) {
        errors.push({
          index: i,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { total: dtos.length, inserted, errors };
  }

  async updateSale(id: number, dto: UpdateSaleDto): Promise<SaleWithOffer> {
    const record = await this.prisma.sale_record.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Venta #${id} no encontrada`);
    return this.prisma.sale_record.update({
      where: { id },
      data: dto,
      include: { offer: true },
    });
  }

  async deleteSale(id: number): Promise<{ ok: boolean; id: number }> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.sale_record.findUnique({ where: { id } });
      if (!record) throw new NotFoundException(`Venta #${id} no encontrada`);

      await tx.sale_record.delete({ where: { id } });

      const fecha = new Date(record.fecha);
      const year = fecha.getFullYear();
      const month = fecha.getMonth() + 1;

      const monthly = await tx.points_level.findUnique({
        where: { year_month: { year, month } },
      });
      if (monthly) {
        const oldTotal = Number(monthly.total_points);
        const oldRange = computeRange(oldTotal);
        const newTotal = Math.max(0, oldTotal - Number(record.points));
        const newRange = computeRange(newTotal);

        await tx.points_level.update({
          where: { year_month: { year, month } },
          data: { total_points: newTotal },
        });

        if (newRange !== oldRange) {
          await this.recalculateMonth(tx, year, month, newRange);
        }
      }

      return { ok: true, id };
    });
  }

  private async recalculateMonth(
    tx: Prisma.TransactionClient,
    year: number,
    month: number,
    newRange: number,
  ): Promise<void> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const distinctLevels = await tx.sale_record.findMany({
      where: { fecha: { gte: startDate, lt: endDate } },
      select: { level_price: true },
      distinct: ['level_price'],
    });
    const levels = distinctLevels.map((d) => d.level_price);
    if (levels.length === 0) return;

    // Una sola consulta para todos los precios del nuevo rango (evita el N+1:
    // antes era un findUnique por cada nivel distinto).
    const priceEntries = await tx.price_level.findMany({
      where: { range: newRange, level: { in: levels } },
    });
    const priceByLevel = new Map(priceEntries.map((p) => [p.level, p.price]));

    for (const level of levels) {
      const price = priceByLevel.get(level);
      if (price === undefined) continue;
      await tx.sale_record.updateMany({
        where: { level_price: level, fecha: { gte: startDate, lt: endDate } },
        data: { offers_price: price },
      });
    }
  }
}
