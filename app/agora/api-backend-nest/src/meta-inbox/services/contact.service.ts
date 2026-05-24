import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WebsocketNotifierService } from '../../websocket-notifier/websocket-notifier.service';
import { WhatsappIdentityService } from './whatsapp-identity.service';
import { ThreadService, ThreadSelectorInput } from './thread.service';

type ContactDirectoryRow = {
  actorExternalId: string;
  objectType: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  region: string | null;
  metadata: unknown;
  actorScore: string | null;
  actorLifecycleState: string | null;
  actorLifecycleUpdatedAt: Date | null;
  lastThreadSessionId: string | null;
  lastThreadStatus: string | null;
  lastThreadStage: string | null;
  lastAttentionMode: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  totalCount: string;
};

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketNotifier: WebsocketNotifierService,
    private readonly whatsappIdentity: WhatsappIdentityService,
    private readonly thread: ThreadService,
  ) {}

  async listContacts(input: {
    search?: string;
    objectType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Omit<ContactDirectoryRow, 'totalCount'>[]; total: number; limit: number; offset: number; hasNext: boolean }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const search = (input.search || '').trim();
    const objectType = (input.objectType || '').trim().toUpperCase();
    const hasSearch = search.length > 0;
    const hasObjectType = ['PAGE', 'INSTAGRAM', 'WHATSAPP'].includes(objectType);

    const rows = await this.prisma.$queryRawUnsafe<ContactDirectoryRow[]>(
      `SELECT
        c.actor_external_id AS "actorExternalId",
        c.object_type AS "objectType",
        c.display_name AS "displayName",
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.phone AS "phone",
        c.rut AS "rut",
        c.address AS "address",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        c.region AS "region",
        c.metadata AS "metadata",
        sc.score::text AS "actorScore",
        lc.state::text AS "actorLifecycleState",
        lc.occurred_at AS "actorLifecycleUpdatedAt",
        lt.session_id AS "lastThreadSessionId",
        lt.thread_status AS "lastThreadStatus",
        lt.thread_stage AS "lastThreadStage",
        lt.attention_mode AS "lastAttentionMode",
        lt.last_message_text AS "lastMessageText",
        lt.last_message_at AS "lastMessageAt",
        COUNT(*) OVER()::text AS "totalCount"
       FROM meta_inbox_contacts c
       LEFT JOIN actor_score sc ON sc.actor_external_id = c.actor_external_id
       LEFT JOIN LATERAL (
         SELECT al.state, al.occurred_at
         FROM actor_lifecycle al
         WHERE al.actor_external_id = c.actor_external_id
         ORDER BY al.occurred_at DESC
         LIMIT 1
       ) lc ON true
       LEFT JOIN LATERAL (
         SELECT t.session_id, t.thread_status, t.thread_stage, t.attention_mode, t.last_message_text, t.last_message_at
         FROM threads t
         WHERE t.actor_external_id = c.actor_external_id AND t.object_type = c.object_type
         ORDER BY t.last_message_at DESC NULLS LAST, t.updated_at DESC
         LIMIT 1
       ) lt ON true
       WHERE ($1::boolean = false OR c.object_type = $2)
         AND (
           $3::boolean = false
           OR c.display_name ILIKE '%' || $4 || '%'
           OR c.first_name ILIKE '%' || $4 || '%'
           OR c.last_name ILIKE '%' || $4 || '%'
           OR c.phone ILIKE '%' || $4 || '%'
           OR c.rut ILIKE '%' || $4 || '%'
           OR c.email ILIKE '%' || $4 || '%'
           OR c.city ILIKE '%' || $4 || '%'
           OR c.region ILIKE '%' || $4 || '%'
           OR c.actor_external_id ILIKE '%' || $4 || '%'
         )
       ORDER BY lt.last_message_at DESC NULLS LAST, c.updated_at DESC, c.display_name ASC
       LIMIT ${limit}
       OFFSET ${offset}`,
      hasObjectType,
      objectType,
      hasSearch,
      search,
    );

    return {
      items: rows.map(({ totalCount, ...row }) => row),
      total: rows[0]?.totalCount ? Number(rows[0].totalCount) : 0,
      limit,
      offset,
      hasNext: offset + rows.length < (rows[0]?.totalCount ? Number(rows[0].totalCount) : 0),
    };
  }

  async createWhatsappContact(input: {
    phone: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }): Promise<Omit<ContactDirectoryRow, 'totalCount'> | { actorExternalId: string; objectType: string; displayName: string; phone: string }> {
    const phone = this.whatsappIdentity.normalizeWhatsappPhone(input.phone);
    const actorExternalId = `${phone}@s.whatsapp.net`;
    const displayName =
      input.displayName?.trim() ||
      [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(' ') ||
      phone;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO meta_inbox_contacts(
        actor_external_id, object_type, display_name, first_name, last_name, phone,
        rut, address, email, notes, city, region, metadata, updated_at
      )
      VALUES (
        $1, 'WHATSAPP', COALESCE(NULLIF($2,''), $3), NULLIF($4,''), NULLIF($5,''),
        $3, NULLIF($6,''), NULLIF($7,''), NULLIF($8,''), NULLIF($9,''),
        NULLIF($10,''), NULLIF($11,''), $12::jsonb, now()
      )
      ON CONFLICT (actor_external_id, object_type)
      DO UPDATE SET
        display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), meta_inbox_contacts.display_name),
        first_name = COALESCE(EXCLUDED.first_name, meta_inbox_contacts.first_name),
        last_name = COALESCE(EXCLUDED.last_name, meta_inbox_contacts.last_name),
        phone = COALESCE(EXCLUDED.phone, meta_inbox_contacts.phone),
        rut = COALESCE(EXCLUDED.rut, meta_inbox_contacts.rut),
        address = COALESCE(EXCLUDED.address, meta_inbox_contacts.address),
        email = COALESCE(EXCLUDED.email, meta_inbox_contacts.email),
        notes = COALESCE(EXCLUDED.notes, meta_inbox_contacts.notes),
        city = COALESCE(EXCLUDED.city, meta_inbox_contacts.city),
        region = COALESCE(EXCLUDED.region, meta_inbox_contacts.region),
        metadata = meta_inbox_contacts.metadata || EXCLUDED.metadata,
        updated_at = now()`,
      actorExternalId,
      displayName,
      phone,
      input.firstName ?? null,
      input.lastName ?? null,
      input.rut ?? null,
      input.address ?? null,
      input.email ?? null,
      input.notes ?? null,
      input.city ?? null,
      input.region ?? null,
      JSON.stringify({ created_from: 'agenda', transport: 'baileys', jid: actorExternalId }),
    );

    const result = await this.listContacts({ search: actorExternalId, objectType: 'WHATSAPP', limit: 1, offset: 0 });
    return result.items[0] || { actorExternalId, objectType: 'WHATSAPP', displayName, phone };
  }

  async updateContact(
    sessionId: string,
    input: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      rut?: string;
      address?: string;
      email?: string;
      notes?: string;
      city?: string;
      region?: string;
    },
  ): Promise<{ ok: boolean; sessionId: string; actorExternalId: string; objectType: string; contact: Record<string, string | null> }> {
    const threadIdentity = await this.thread.getThreadIdentity(sessionId);
    if (!threadIdentity) throw new NotFoundException(`session_not_found:${sessionId}`);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO meta_inbox_contacts(
        actor_external_id, object_type, display_name, first_name, last_name, phone,
        rut, address, email, notes, city, region, updated_at
      )
      VALUES (
        $1, $2, COALESCE(NULLIF($3,''), 'Nuevo'), NULLIF($4,''), NULLIF($5,''),
        NULLIF($6,''), NULLIF($7,''), NULLIF($8,''), NULLIF($9,''), NULLIF($10,''),
        NULLIF($11,''), NULLIF($12,''), now()
      )
      ON CONFLICT (actor_external_id, object_type)
      DO UPDATE SET
        display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), meta_inbox_contacts.display_name),
        first_name = COALESCE(EXCLUDED.first_name, meta_inbox_contacts.first_name),
        last_name = COALESCE(EXCLUDED.last_name, meta_inbox_contacts.last_name),
        phone = COALESCE(EXCLUDED.phone, meta_inbox_contacts.phone),
        rut = COALESCE(EXCLUDED.rut, meta_inbox_contacts.rut),
        address = COALESCE(EXCLUDED.address, meta_inbox_contacts.address),
        email = COALESCE(EXCLUDED.email, meta_inbox_contacts.email),
        notes = COALESCE(EXCLUDED.notes, meta_inbox_contacts.notes),
        city = COALESCE(EXCLUDED.city, meta_inbox_contacts.city),
        region = COALESCE(EXCLUDED.region, meta_inbox_contacts.region),
        updated_at = now()`,
      threadIdentity.actorExternalId,
      threadIdentity.objectType,
      input.displayName ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      input.phone ?? null,
      input.rut ?? null,
      input.address ?? null,
      input.email ?? null,
      input.notes ?? null,
      input.city ?? null,
      input.region ?? null,
    );

    const updated = await this.thread.getThreadRow(sessionId);
    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      threadId: updated?.threadId,
      sessionId,
      actorExternalId: threadIdentity.actorExternalId,
      objectType: threadIdentity.objectType,
      displayName: input.displayName ?? updated?.displayName ?? undefined,
      phone: input.phone ?? updated?.phone ?? undefined,
      email: input.email ?? updated?.email ?? undefined,
      notes: input.notes ?? updated?.notes ?? undefined,
      city: input.city ?? updated?.city ?? undefined,
      threadStatus: updated?.threadStatus,
      attentionMode: updated?.attentionMode,
      threadStage: updated?.threadStage,
      lastMessageText: updated?.lastMessageText ?? undefined,
      lastDirection: updated?.lastDirection ?? undefined,
      lastMessageAt: updated?.lastMessageAt?.toISOString(),
    });

    return {
      ok: true,
      sessionId,
      actorExternalId: threadIdentity.actorExternalId,
      objectType: threadIdentity.objectType,
      contact: {
        displayName: input.displayName ?? updated?.displayName ?? 'Nuevo',
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? updated?.phone ?? null,
        rut: input.rut ?? null,
        address: input.address ?? null,
        email: input.email ?? updated?.email ?? null,
        notes: input.notes ?? updated?.notes ?? null,
        city: input.city ?? updated?.city ?? null,
        region: input.region ?? null,
      },
    };
  }

  async updateContactForAutomation(input: ThreadSelectorInput & {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }): Promise<{ ok: boolean; sessionId: string; actorExternalId: string; objectType: string; contact: Record<string, string | null>; thread: import('./thread.service').ThreadRow | null }> {
    const sessionId = await this.thread.resolveSessionIdForAutomation(input);
    const result = await this.updateContact(sessionId, {
      displayName: input.displayName,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      rut: input.rut,
      address: input.address,
      email: input.email,
      notes: input.notes,
      city: input.city,
      region: input.region,
    });
    const thread = await this.thread.getThreadRow(sessionId);
    return { ...result, thread };
  }
}
