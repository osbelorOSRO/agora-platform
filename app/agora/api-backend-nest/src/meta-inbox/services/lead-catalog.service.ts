import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

export type CatalogOption = {
  id: string;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

const SELECT = `
  id,
  category,
  value,
  label,
  sort_order  AS "sortOrder",
  active,
  created_at  AS "createdAt",
  updated_at  AS "updatedAt"
`;

@Injectable()
export class LeadCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listByCategory(category: string): Promise<CatalogOption[]> {
    return this.prisma.$queryRawUnsafe<CatalogOption[]>(
      `SELECT ${SELECT}
       FROM lead_catalog_options
       WHERE category = $1 AND active = true
       ORDER BY sort_order ASC, label ASC`,
      category,
    );
  }

  async listAll(): Promise<Record<string, CatalogOption[]>> {
    const rows = await this.prisma.$queryRawUnsafe<CatalogOption[]>(
      `SELECT ${SELECT}
       FROM lead_catalog_options
       ORDER BY category ASC, sort_order ASC, label ASC`,
    );
    return rows.reduce<Record<string, CatalogOption[]>>((acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row);
      return acc;
    }, {});
  }

  async listAllRaw(): Promise<CatalogOption[]> {
    return this.prisma.$queryRawUnsafe<CatalogOption[]>(
      `SELECT ${SELECT}
       FROM lead_catalog_options
       ORDER BY category ASC, sort_order ASC, label ASC`,
    );
  }

  async create(input: {
    category: string;
    value: string;
    label: string;
    sortOrder?: number;
  }): Promise<CatalogOption> {
    const existing = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM lead_catalog_options WHERE category = $1 AND value = $2 LIMIT 1`,
      input.category,
      input.value,
    );
    if (existing[0]) throw new ConflictException('catalog_option_value_exists');

    const rows = await this.prisma.$queryRawUnsafe<CatalogOption[]>(
      `INSERT INTO lead_catalog_options (category, value, label, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       RETURNING ${SELECT}`,
      input.category,
      input.value,
      input.label,
      input.sortOrder ?? 0,
    );
    return rows[0];
  }

  async update(
    id: string,
    patch: { label?: string; sortOrder?: number; active?: boolean },
  ): Promise<CatalogOption> {
    const sets: string[] = [];
    const params: unknown[] = [id];

    if (patch.label !== undefined) {
      params.push(patch.label);
      sets.push(`label = $${params.length}`);
    }
    if (patch.sortOrder !== undefined) {
      params.push(patch.sortOrder);
      sets.push(`sort_order = $${params.length}`);
    }
    if (patch.active !== undefined) {
      params.push(patch.active);
      sets.push(`active = $${params.length}`);
    }

    if (sets.length === 0) {
      const rows = await this.prisma.$queryRawUnsafe<CatalogOption[]>(
        `SELECT ${SELECT} FROM lead_catalog_options WHERE id = $1`,
        id,
      );
      if (!rows[0]) throw new NotFoundException('catalog_option_not_found');
      return rows[0];
    }

    sets.push(`updated_at = now()`);

    const rows = await this.prisma.$queryRawUnsafe<CatalogOption[]>(
      `UPDATE lead_catalog_options
       SET ${sets.join(', ')}
       WHERE id = $1
       RETURNING ${SELECT}`,
      ...params,
    );
    if (!rows[0]) throw new NotFoundException('catalog_option_not_found');
    return rows[0];
  }
}
