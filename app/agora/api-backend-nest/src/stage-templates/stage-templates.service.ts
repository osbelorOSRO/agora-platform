import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto';

type StageTemplateRow = {
  id: string;
  stage_actual: string;
  posicion: number | null;
  posibles_match: string;
  es_fallback: boolean;
  procesa_datos: boolean;
  dato_esperado: string | null;
  nuevo_stage: string;
  tipo_respuesta: string;
  activo: boolean;
  stage_route: string | null;
  modo_default: string | null;
  factible: boolean | null;
  decision: string | null;
  accion: string | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class StageTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(stageActual?: string): Promise<StageTemplateRow[]> {
    if (stageActual) {
      return this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
        `SELECT id::text, stage_actual, posicion, posibles_match, es_fallback, procesa_datos,
                dato_esperado, nuevo_stage, tipo_respuesta, activo, stage_route,
                modo_default, factible, decision, accion, created_at, updated_at
         FROM stage_templates
         WHERE stage_actual = $1
         ORDER BY id::bigint ASC`,
        stageActual,
      );
    }

    return this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
      `SELECT id::text, stage_actual, posicion, posibles_match, es_fallback, procesa_datos,
              dato_esperado, nuevo_stage, tipo_respuesta, activo, stage_route,
              modo_default, factible, decision, accion, created_at, updated_at
       FROM stage_templates
       ORDER BY id::bigint ASC`,
    );
  }

  async findOne(id: number): Promise<StageTemplateRow> {
    const rows = await this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
      `SELECT id::text, stage_actual, posicion, posibles_match, es_fallback, procesa_datos,
              dato_esperado, nuevo_stage, tipo_respuesta, activo, stage_route,
              modo_default, factible, decision, accion, created_at, updated_at
       FROM stage_templates WHERE id = $1 LIMIT 1`,
      id,
    );
    if (!rows[0])
      throw new NotFoundException(`stage_template ${id} no encontrado`);
    return rows[0];
  }

  async create(dto: CreateStageTemplateDto): Promise<StageTemplateRow> {
    const rows = await this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
      `INSERT INTO stage_templates
         (stage_actual, posicion, posibles_match, es_fallback, procesa_datos,
          dato_esperado, nuevo_stage, tipo_respuesta, activo, stage_route,
          modo_default, factible, decision, accion, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
       RETURNING id::text, stage_actual, posicion, posibles_match, es_fallback, procesa_datos,
                 dato_esperado, nuevo_stage, tipo_respuesta, activo, stage_route,
                 modo_default, factible, decision, accion, created_at, updated_at`,
      dto.stage_actual,
      dto.posicion ?? null,
      dto.posibles_match,
      dto.es_fallback ?? false,
      dto.procesa_datos ?? false,
      dto.dato_esperado ?? null,
      dto.nuevo_stage,
      dto.tipo_respuesta,
      dto.activo ?? true,
      dto.stage_route ?? null,
      dto.modo_default ?? null,
      dto.factible ?? null,
      dto.decision ?? null,
      dto.accion ?? null,
    );
    return rows[0];
  }

  async update(
    id: number,
    dto: UpdateStageTemplateDto,
  ): Promise<StageTemplateRow> {
    await this.findOne(id);

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fields: Array<keyof UpdateStageTemplateDto> = [
      'stage_actual',
      'posicion',
      'posibles_match',
      'es_fallback',
      'procesa_datos',
      'dato_esperado',
      'nuevo_stage',
      'tipo_respuesta',
      'activo',
      'stage_route',
      'modo_default',
      'factible',
      'decision',
      'accion',
    ];

    for (const field of fields) {
      if (field in dto) {
        sets.push(`${field} = $${idx}`);
        params.push((dto as any)[field] ?? null);
        idx++;
      }
    }

    if (sets.length === 0) return this.findOne(id);

    sets.push(`updated_at = now()`);
    params.push(id);

    const rows = await this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
      `UPDATE stage_templates SET ${sets.join(', ')}
       WHERE id = $${idx}
       RETURNING id::text, stage_actual, posicion, posibles_match, es_fallback, procesa_datos,
                 dato_esperado, nuevo_stage, tipo_respuesta, activo, stage_route,
                 modo_default, factible, decision, accion, created_at, updated_at`,
      ...params,
    );
    return rows[0];
  }

  async remove(id: number): Promise<{ ok: boolean; id: number }> {
    await this.findOne(id);
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM stage_templates WHERE id = $1`,
      id,
    );
    return { ok: true, id };
  }
}
