import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpsertSalesAnalysisDto } from '../dto/upsert-sales-analysis.dto';

export type SalesAnalysisRow = {
  id: string;
  sessionId: string;
  leadType: string;
  ageRange: string;
  sex: string;
  customerType: string;
  purchaseIntent: string;
  result: string;
  planContracted: string | null;
  saleType: string | null;
  lossReason: string | null;
  verbalizationTags: string[];
  verbalizationText: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

@Injectable()
export class LeadSalesAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    sessionId: string,
    dto: UpsertSalesAnalysisDto,
  ): Promise<SalesAnalysisRow> {
    const rows = await this.prisma.$queryRawUnsafe<SalesAnalysisRow[]>(
      `INSERT INTO lead_sales_analysis (
        session_id,
        lead_type,
        age_range,
        sex,
        customer_type,
        purchase_intent,
        result,
        plan_contracted,
        sale_type,
        loss_reason,
        verbalization_tags,
        verbalization_text,
        created_at,
        updated_at
      ) VALUES (
        $1,
        $2::lead_type,
        $3::lead_age_range,
        $4::lead_sex,
        $5,
        $6,
        $7::lead_result,
        $8,
        $9,
        $10,
        $11::text[],
        $12,
        now(),
        now()
      )
      ON CONFLICT (session_id) DO UPDATE SET
        lead_type          = EXCLUDED.lead_type,
        age_range          = EXCLUDED.age_range,
        sex                = EXCLUDED.sex,
        customer_type      = EXCLUDED.customer_type,
        purchase_intent    = EXCLUDED.purchase_intent,
        result             = EXCLUDED.result,
        plan_contracted    = EXCLUDED.plan_contracted,
        sale_type          = EXCLUDED.sale_type,
        loss_reason        = EXCLUDED.loss_reason,
        verbalization_tags = EXCLUDED.verbalization_tags,
        verbalization_text = EXCLUDED.verbalization_text,
        updated_at         = now()
      RETURNING
        id,
        session_id        AS "sessionId",
        lead_type         AS "leadType",
        age_range         AS "ageRange",
        sex,
        customer_type     AS "customerType",
        purchase_intent   AS "purchaseIntent",
        result,
        plan_contracted   AS "planContracted",
        sale_type         AS "saleType",
        loss_reason       AS "lossReason",
        verbalization_tags AS "verbalizationTags",
        verbalization_text AS "verbalizationText",
        created_at        AS "createdAt",
        updated_at        AS "updatedAt"`,
      sessionId,
      dto.leadType ?? 'DESCONOCIDO',
      dto.ageRange ?? 'NO_DEFINIDO',
      dto.sex ?? 'NO_IDENTIFICADO',
      dto.customerType ?? 'NO_DEFINIDO',
      dto.purchaseIntent ?? 'NO_DEFINIDO',
      dto.result ?? 'EN_PROCESO',
      dto.planContracted ?? null,
      dto.saleType ?? null,
      dto.lossReason ?? null,
      dto.verbalizationTags
        ? `{${dto.verbalizationTags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`
        : '{}',
      dto.verbalizationText ?? null,
    );
    return rows[0];
  }

  async findBySession(sessionId: string): Promise<SalesAnalysisRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<SalesAnalysisRow[]>(
      `SELECT
        id,
        session_id        AS "sessionId",
        lead_type         AS "leadType",
        age_range         AS "ageRange",
        sex,
        customer_type     AS "customerType",
        purchase_intent   AS "purchaseIntent",
        result,
        plan_contracted   AS "planContracted",
        sale_type         AS "saleType",
        loss_reason       AS "lossReason",
        verbalization_tags AS "verbalizationTags",
        verbalization_text AS "verbalizationText",
        created_at        AS "createdAt",
        updated_at        AS "updatedAt"
      FROM lead_sales_analysis
      WHERE session_id = $1`,
      sessionId,
    );
    return rows[0] ?? null;
  }

  async assertSessionExists(sessionId: string): Promise<void> {
    const row = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM threads WHERE session_id = $1 LIMIT 1`,
      sessionId,
    );
    if (!row[0]) throw new NotFoundException('thread_not_found');
  }
}
