import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { MetaConfigService } from '../meta-config/meta-config.service';
import { CreatePosteoDto } from './dto/create-posteo.dto';
import { UpdatePosteoDto } from './dto/update-posteo.dto';
import { N8nResultadoDto } from './dto/n8n-resultado.dto';

@Injectable()
export class SocialPostingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metaConfig: MetaConfigService,
  ) {}

  // ── Panel ─────────────────────────────────────────────────────────────────

  async getCalendario(mes: string) {
    // mes = "YYYY-MM"
    const [year, month] = mes.split('-').map(Number);
    const desde = new Date(year, month - 1, 1);
    const hasta = new Date(year, month, 1);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, fecha, caption, url_imagen, imagen_id, estado,
              red_social, id_red_social, id_post, created_at, updated_at
       FROM posteos_programados
       WHERE fecha >= $1 AND fecha < $2
         AND deleted_at IS NULL
       ORDER BY fecha ASC, id ASC`,
      desde,
      hasta,
    );
    return rows;
  }

  async create(dto: CreatePosteoDto) {
    const now = new Date().toISOString();
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO posteos_programados
         (fecha, caption, url_imagen, imagen_id, estado, red_social, id_red_social, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING id, fecha, caption, url_imagen, imagen_id, estado, red_social, id_red_social, created_at`,
      dto.fecha,
      dto.caption ?? null,
      dto.url_imagen ?? null,
      dto.imagen_id ?? null,
      dto.estado ?? 'pendiente',
      dto.red_social ?? 'FANPAGE',
      dto.id_red_social ?? null,
      now,
    );
    return rows[0];
  }

  async update(id: number, dto: UpdatePosteoDto) {
    await this.assertExists(id);
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.caption !== undefined) {
      fields.push(`caption = $${idx++}`);
      values.push(dto.caption);
    }
    if (dto.url_imagen !== undefined) {
      fields.push(`url_imagen = $${idx++}`);
      values.push(dto.url_imagen);
    }
    if (dto.imagen_id !== undefined) {
      fields.push(`imagen_id = $${idx++}`);
      values.push(dto.imagen_id);
    }
    if (dto.estado !== undefined) {
      fields.push(`estado = $${idx++}`);
      values.push(dto.estado);
    }

    if (!fields.length) return this.findOne(id);

    fields.push(`updated_at = $${idx++}`);
    values.push(now);
    values.push(id);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE posteos_programados SET ${fields.join(', ')}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, fecha, caption, url_imagen, imagen_id, estado, red_social, id_red_social, id_post, created_at, updated_at`,
      ...values,
    );
    return rows[0];
  }

  async remove(id: number) {
    await this.assertExists(id);
    await this.prisma.$queryRawUnsafe(
      `UPDATE posteos_programados SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      id,
    );
    return { id, deleted: true };
  }

  // ── N8N ──────────────────────────────────────────────────────────────────

  async getPendientesHoy() {
    // token desencriptado via MetaConfigService
    const token = await this.metaConfig.getSecret('meta_page_access_token');

    // fanpage_id no está encriptado — leer directo
    const configRow = await this.prisma.$queryRawUnsafe<
      Record<string, unknown>[]
    >(`SELECT fanpage_id FROM meta_app_config WHERE id = 1 LIMIT 1`);
    const fanpage_id = (configRow[0]?.fanpage_id as string) ?? null;

    const tareas = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, fecha, caption, url_imagen, imagen_id, estado, red_social, id_red_social
       FROM posteos_programados
       WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date
         AND estado = 'pendiente'
         AND deleted_at IS NULL
       ORDER BY id ASC`,
    );

    return { token, fanpage_id, tareas };
  }

  async registrarResultado(id: number, dto: N8nResultadoDto) {
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE posteos_programados
       SET estado = $1,
           id_post = $2,
           raw = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, estado, id_post, updated_at`,
      dto.estado,
      dto.id_post ?? null,
      dto.raw ? JSON.stringify(dto.raw) : null,
      id,
    );
    if (!rows[0]) throw new NotFoundException(`Posteo ${id} no encontrado`);
    return rows[0];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findOne(id: number) {
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, fecha, caption, url_imagen, imagen_id, estado, red_social, id_red_social, id_post, created_at, updated_at
       FROM posteos_programados WHERE id = $1 AND deleted_at IS NULL`,
      id,
    );
    if (!rows[0]) throw new NotFoundException(`Posteo ${id} no encontrado`);
    return rows[0];
  }

  private async assertExists(id: number) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM posteos_programados WHERE id = $1 AND deleted_at IS NULL`,
      id,
    );
    if (!rows[0]) throw new NotFoundException(`Posteo ${id} no encontrado`);
  }
}
