import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

export type OfferPlanRow = {
  codigo: string;
  nombre: string;
  precioBase: string | number;
  descripcion: string | null;
  precioNormal: string | number | null;
  urlArchivo: string | null;
  duracionPrecio: string | null;
  gigas: number | null;
  minutos: string | null;
  tieneRedesLibres: boolean | null;
  roaming: string | null;
};

export type OfferPlanCatalogRow = OfferPlanRow & {
  tipo: string | null;
  lineas: number | null;
  excluyeAlta: boolean | null;
  excluyePortabilidadPostpago: boolean | null;
};

export type OfferCatalogLevelRow = {
  nivel: number;
  precioNormal: number;
  nombre: string | null;
  codigo1Linea: string | null;
  codigo2Lineas: string | null;
  codigo3Lineas: string | null;
  codigo4Lineas: string | null;
  codigo5Lineas: string | null;
  codigos: string[];
};

export type OfferCandidateRow = {
  nivel: number;
  codigo: string;
  nombre: string | null;
  precioBase: string | number;
  precioNormal: number;
  lineas: number | null;
  descripcion: string | null;
  urlArchivo: string | null;
  duracionPrecio: string | null;
  gigas: number | null;
  minutos: string | null;
  tieneRedesLibres: boolean | null;
  roaming: string | null;
};

export type OfferEventRow = {
  id: string;
  sessionId: string;
  stageActual: string;
  tipo: string;
  codigo: string;
  nombrePlan: string;
  precioBase: string;
  descripcion: string | null;
  precioNormal: string | null;
  urlArchivo: string | null;
  duracionPrecio: string | null;
  gigas: number | null;
  minutos: string | null;
  tieneRedesLibres: boolean | null;
  roaming: string | null;
  decision: string;
  createdAt: Date;
  updatedAt: Date | null;
};

@Injectable()
export class OfferContextService {
  constructor(private readonly prisma: PrismaService) {}

  async createOfferEventForAutomation(input: {
    sessionId: string;
    stageActual: string;
    tipo: string;
    codigo: string;
    decision?: string;
  }) {
    const normalizedDecision = (input.decision || 'indefinido')
      .trim()
      .toLowerCase();
    const plan = await this.getOfferPlanByCode(input.codigo);

    const rows = await this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      INSERT INTO thread_offer_events (
        session_id, stage_actual, tipo, codigo, nombre_plan,
        precio_base, descripcion, precio_normal, url_archivo, decision
      )
      VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, $8::numeric, $9, $10)
      RETURNING
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
      input.sessionId,
      input.stageActual,
      input.tipo,
      plan.codigo,
      plan.nombre,
      plan.precioBase,
      plan.descripcion,
      plan.precioNormal,
      plan.urlArchivo,
      normalizedDecision,
    );

    return rows[0];
  }

  async getOfferEventById(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      SELECT
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM thread_offer_events
      WHERE id = $1
      LIMIT 1
    `,
      id,
    );

    if (!rows[0]) throw new BadRequestException(`offer_event_not_found:${id}`);
    return rows[0];
  }

  async updateOfferEventForAutomation(
    id: string,
    input: {
      sessionId?: string;
      stageActual?: string;
      tipo?: string;
      codigo?: string;
      decision?: string;
    },
  ) {
    const current = await this.getOfferEventById(id);
    const hasChanges = Object.values(input).some(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== '',
    );

    if (!hasChanges) throw new BadRequestException('offer_event_update_empty');

    const nextCodigo = input.codigo?.trim() || current.codigo;
    const plan = input.codigo
      ? await this.getOfferPlanByCode(nextCodigo)
      : {
          codigo: current.codigo,
          nombre: current.nombrePlan,
          precioBase: current.precioBase,
          descripcion: current.descripcion,
          precioNormal: current.precioNormal,
          urlArchivo: current.urlArchivo,
        };

    const normalizedDecision = (
      input.decision ||
      current.decision ||
      'indefinido'
    )
      .trim()
      .toLowerCase();

    const rows = await this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      UPDATE thread_offer_events
      SET
        session_id = $2, stage_actual = $3, tipo = $4, codigo = $5,
        nombre_plan = $6, precio_base = $7::numeric, descripcion = $8,
        precio_normal = $9::numeric, url_archivo = $10, decision = $11,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
      id,
      input.sessionId?.trim() || current.sessionId,
      input.stageActual?.trim() || current.stageActual,
      input.tipo?.trim() || current.tipo,
      plan.codigo,
      plan.nombre,
      plan.precioBase,
      plan.descripcion,
      plan.precioNormal,
      plan.urlArchivo,
      normalizedDecision,
    );

    return rows[0];
  }

  async listOfferEvents(input: {
    sessionId?: string;
    codigo?: string;
    decision?: string;
    stageActual?: string;
    tipo?: string;
  }) {
    return this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      SELECT
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM thread_offer_events
      WHERE ($1::text IS NULL OR session_id = $1)
        AND ($2::text IS NULL OR codigo = $2)
        AND ($3::text IS NULL OR decision = $3)
        AND ($4::text IS NULL OR stage_actual = $4)
        AND ($5::text IS NULL OR tipo = $5)
      ORDER BY created_at DESC, id DESC
      LIMIT 500
    `,
      input.sessionId ?? null,
      input.codigo ?? null,
      input.decision ?? null,
      input.stageActual ?? null,
      input.tipo ?? null,
    );
  }

  async getOfferContextForAutomation(input: {
    sessionId: string;
    stageActual?: string;
    modo?: string;
    decision?: string;
    currentOfferId?: string;
    currentCodigo?: string;
    lineas?: number;
  }) {
    const sessionId = input.sessionId?.trim();
    if (!sessionId) throw new BadRequestException('Debes enviar sessionId');

    const modo = this.normalizeOfferMode(input.modo);
    const eventTipo = modo === 'portabilidad_postpago' ? 'portabilidad' : modo;
    const recentEvents = await this.listOfferEvents({
      sessionId,
      stageActual: input.stageActual?.trim() || undefined,
      tipo: eventTipo,
    });

    let currentOffer: OfferEventRow | null = null;
    if (input.currentOfferId?.trim()) {
      currentOffer = await this.getOfferEventById(input.currentOfferId.trim());
    } else if (input.currentCodigo?.trim()) {
      currentOffer = this.offerPlanToEventSnapshot(
        await this.getOfferPlanByCode(input.currentCodigo.trim()),
        sessionId,
        input.stageActual?.trim() || recentEvents[0]?.stageActual || '',
        eventTipo,
      );
    } else {
      const decision = input.decision?.trim().toLowerCase();
      currentOffer =
        (decision
          ? recentEvents.find((event) => event.decision === decision)
          : null) ||
        recentEvents[0] ||
        null;
    }

    const rawCatalog = await this.listOfferCatalogPlans();
    const filteredCatalog = rawCatalog.filter((plan) => {
      const lineas = Number(plan.lineas ?? 0);
      if ((plan.tipo || '').toLowerCase() === 'adicional') return false;
      if (!Number.isFinite(lineas) || lineas <= 0) return false;
      if (modo === 'alta' && plan.excluyeAlta === true) return false;
      if (
        (modo === 'portabilidad' || modo === 'portabilidad_postpago') &&
        plan.excluyePortabilidadPostpago === true
      )
        return false;
      return this.toFiniteNumber(plan.precioNormal) !== null;
    });

    const catalog = this.buildOfferCatalogLevels(filteredCatalog);
    const codeLevel = new Map<string, number>();
    for (const level of catalog) {
      for (const codigo of level.codigos) {
        codeLevel.set(codigo, level.nivel);
      }
    }

    const currentPrecioNormal = this.toFiniteNumber(currentOffer?.precioNormal);
    const currentLevel =
      (currentOffer?.codigo ? codeLevel.get(currentOffer.codigo) : undefined) ||
      catalog.find((level) => level.precioNormal === currentPrecioNormal)
        ?.nivel ||
      null;
    const currentCodigo = currentOffer?.codigo || null;
    const candidates = this.buildOfferCandidates(
      filteredCatalog,
      codeLevel,
      currentCodigo,
    );

    return {
      sessionId,
      modo,
      eventTipo,
      requestedLineas: input.lineas ?? null,
      currentOffer,
      currentLevel,
      catalog,
      validCandidates: {
        cheaper: currentLevel
          ? candidates.filter((candidate) => candidate.nivel < currentLevel)
          : [],
        sameLevelDifferentLines: currentLevel
          ? candidates.filter((candidate) => candidate.nivel === currentLevel)
          : [],
        higherLevel: currentLevel
          ? candidates.filter((candidate) => candidate.nivel > currentLevel)
          : [],
        matchingRequestedLines: input.lineas
          ? candidates.filter((candidate) => candidate.lineas === input.lineas)
          : [],
        all: candidates,
      },
      recentEvents: recentEvents.slice(0, 10),
      constraints: [
        'Usar solo codigos presentes en validCandidates o catalog.',
        'No ofrecer codigos excluidos por modo.',
        'No usar el mismo codigo actual como contraoferta.',
        'No inventar precios, codigos, descuentos ni condiciones comerciales.',
        'Si el usuario pide equipo/subsidio y no hay dato disponible, derivar a soporte humano.',
      ],
    };
  }

  async getOfferPlanByCode(codigo: string): Promise<OfferPlanRow> {
    const normalizedCode = (codigo || '').trim();
    if (!normalizedCode)
      throw new BadRequestException('Debes enviar un codigo valido');

    const rows = await this.prisma.$queryRawUnsafe<OfferPlanRow[]>(
      `
      SELECT
        codigo,
        nombre,
        precio_base AS "precioBase",
        descripcion,
        precio_normal AS "precioNormal",
        url_archivo AS "urlArchivo",
        duracion_precio AS "duracionPrecio",
        gigas,
        minutos,
        tiene_redes_libres AS "tieneRedesLibres",
        roaming
      FROM precios_planes
      WHERE codigo = $1
      LIMIT 1
    `,
      normalizedCode,
    );

    if (!rows[0])
      throw new BadRequestException(`codigo_no_encontrado:${normalizedCode}`);
    return rows[0];
  }

  private normalizeOfferMode(
    modo?: string,
  ): 'alta' | 'portabilidad' | 'portabilidad_postpago' {
    const normalized = (modo || 'portabilidad').trim().toLowerCase();
    if (
      normalized === 'alta' ||
      normalized === 'portabilidad' ||
      normalized === 'portabilidad_postpago'
    ) {
      return normalized;
    }
    return 'portabilidad';
  }

  private async listOfferCatalogPlans(): Promise<OfferPlanCatalogRow[]> {
    return this.prisma.$queryRawUnsafe<OfferPlanCatalogRow[]>(
      `
      SELECT
        codigo,
        nombre,
        precio_base AS "precioBase",
        tipo,
        descripcion,
        lineas,
        COALESCE(excluye_alta, false) AS "excluyeAlta",
        COALESCE(excluye_portabilidad_postpago, false) AS "excluyePortabilidadPostpago",
        url_archivo AS "urlArchivo",
        precio_normal AS "precioNormal",
        duracion_precio AS "duracionPrecio",
        gigas,
        minutos,
        tiene_redes_libres AS "tieneRedesLibres",
        roaming
      FROM precios_planes
      ORDER BY precio_normal ASC NULLS LAST, lineas ASC NULLS LAST, codigo ASC
    `,
    );
  }

  private buildOfferCatalogLevels(
    plans: OfferPlanCatalogRow[],
  ): OfferCatalogLevelRow[] {
    const groups = new Map<number, OfferPlanCatalogRow[]>();
    for (const plan of plans) {
      const precioNormal = this.toFiniteNumber(plan.precioNormal);
      if (precioNormal === null) continue;
      groups.set(precioNormal, [...(groups.get(precioNormal) || []), plan]);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left - right)
      .map(([precioNormal, group], index) => {
        const sorted = group.sort(
          (left, right) =>
            Number(left.lineas ?? 0) - Number(right.lineas ?? 0) ||
            left.codigo.localeCompare(right.codigo),
        );
        const codeForLines = (lineas: number) =>
          sorted.find((plan) => Number(plan.lineas ?? 0) === lineas)?.codigo ||
          null;

        return {
          nivel: index + 1,
          precioNormal,
          nombre: sorted[0]?.nombre || null,
          codigo1Linea: codeForLines(1),
          codigo2Lineas: codeForLines(2),
          codigo3Lineas: codeForLines(3),
          codigo4Lineas: codeForLines(4),
          codigo5Lineas: codeForLines(5),
          codigos: sorted.map((plan) => plan.codigo),
        };
      });
  }

  private buildOfferCandidates(
    plans: OfferPlanCatalogRow[],
    codeLevel: Map<string, number>,
    currentCodigo?: string | null,
  ): OfferCandidateRow[] {
    return plans
      .filter((plan) => plan.codigo !== currentCodigo)
      .map((plan) => ({
        nivel: codeLevel.get(plan.codigo) || 0,
        codigo: plan.codigo,
        nombre: plan.nombre || null,
        precioBase: plan.precioBase,
        precioNormal: this.toFiniteNumber(plan.precioNormal) || 0,
        lineas: plan.lineas ?? null,
        descripcion: plan.descripcion,
        urlArchivo: plan.urlArchivo,
        duracionPrecio: plan.duracionPrecio ?? null,
        gigas: plan.gigas ?? null,
        minutos: plan.minutos ?? null,
        tieneRedesLibres: plan.tieneRedesLibres ?? null,
        roaming: plan.roaming ?? null,
      }))
      .filter((candidate) => candidate.nivel > 0)
      .sort(
        (left, right) =>
          left.nivel - right.nivel ||
          Number(left.lineas ?? 0) - Number(right.lineas ?? 0) ||
          left.codigo.localeCompare(right.codigo),
      );
  }

  private offerPlanToEventSnapshot(
    plan: OfferPlanRow,
    sessionId: string,
    stageActual: string,
    tipo: string,
  ): OfferEventRow {
    return {
      id: '',
      sessionId,
      stageActual,
      tipo,
      codigo: plan.codigo,
      nombrePlan: plan.nombre,
      precioBase: String(plan.precioBase),
      descripcion: plan.descripcion,
      precioNormal:
        plan.precioNormal === null || plan.precioNormal === undefined
          ? null
          : String(plan.precioNormal),
      urlArchivo: plan.urlArchivo,
      duracionPrecio: plan.duracionPrecio ?? null,
      gigas: plan.gigas ?? null,
      minutos: plan.minutos ?? null,
      tieneRedesLibres: plan.tieneRedesLibres ?? null,
      roaming: plan.roaming ?? null,
      decision: 'indefinido',
      createdAt: new Date(),
      updatedAt: null,
    };
  }

  private toFiniteNumber(
    value: string | number | null | undefined,
  ): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
}
