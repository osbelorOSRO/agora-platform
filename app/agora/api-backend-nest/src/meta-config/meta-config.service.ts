import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { PrismaService } from '../database/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { UpdateMetaConfigDto } from './dto/update-meta-config.dto';

const ENCRYPTED_FIELDS = new Set([
  'app_secret',
  'meta_page_access_token',
  'meta_ig_access_token',
  'admin_access_token',
]);

const CACHE_KEY = 'meta_app_config:singleton';
const CACHE_TTL = 300; // 5 min

@Injectable()
export class MetaConfigService {
  private readonly logger = new Logger(MetaConfigService.name);
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    const raw = process.env.META_CONFIG_ENCRYPTION_KEY;
    if (!raw) throw new Error('META_CONFIG_ENCRYPTION_KEY no está definido');
    this.encKey = scryptSync(raw, 'meta_config_salt', 32);
  }

  private encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      'utf8',
    );
  }

  private encryptRow(dto: UpdateMetaConfigDto): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      result[key] =
        ENCRYPTED_FIELDS.has(key) && value ? this.encrypt(value) : value;
    }
    return result;
  }

  private decryptRow(
    row: Record<string, unknown>,
  ): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'id' || key === 'updated_at') continue;
      if (typeof value === 'string' && ENCRYPTED_FIELDS.has(key)) {
        try {
          result[key] = this.decrypt(value);
        } catch {
          result[key] = null;
        }
      } else {
        result[key] = typeof value === 'string' ? value : null;
      }
    }
    return result;
  }

  private maskRow(
    row: Record<string, string | null>,
  ): Record<string, string | null> {
    const masked = { ...row };
    for (const field of ENCRYPTED_FIELDS) {
      if (masked[field]) masked[field] = '••••••••';
    }
    return masked;
  }

  async get(): Promise<Record<string, string | null>> {
    const cached =
      await this.cache.get<Record<string, string | null>>(CACHE_KEY);
    if (cached) return this.maskRow(cached);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM meta_app_config WHERE id = 1 LIMIT 1`,
    );

    if (!rows[0]) return {};

    const decrypted = this.decryptRow(rows[0]);
    await this.cache.set(CACHE_KEY, decrypted, CACHE_TTL);
    return this.maskRow(decrypted);
  }

  async getSecret(field: string): Promise<string | null> {
    const cached =
      await this.cache.get<Record<string, string | null>>(CACHE_KEY);
    if (cached) return cached[field] ?? null;

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM meta_app_config WHERE id = 1 LIMIT 1`,
    );
    if (!rows[0]) return null;

    const decrypted = this.decryptRow(rows[0]);
    await this.cache.set(CACHE_KEY, decrypted, CACHE_TTL);
    return decrypted[field] ?? null;
  }

  async reveal(field: string): Promise<string | null> {
    const ALLOWED = new Set([...ENCRYPTED_FIELDS]);
    if (!ALLOWED.has(field)) return null;
    return this.getSecret(field);
  }

  async upsert(
    dto: UpdateMetaConfigDto,
  ): Promise<Record<string, string | null>> {
    const encrypted = this.encryptRow(dto);
    const fields = Object.keys(encrypted);
    if (!fields.length) return this.get();

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => encrypted[f]);

    await this.prisma.$queryRawUnsafe(
      `INSERT INTO meta_app_config (id, ${fields.join(', ')}, updated_at)
       VALUES (1, ${fields.map((_, i) => `$${i + 1}`).join(', ')}, NOW())
       ON CONFLICT (id) DO UPDATE SET ${setClauses}, updated_at = NOW()`,
      ...values,
    );

    await this.cache.del(CACHE_KEY);
    this.logger.log(`meta_app_config actualizado: ${fields.join(', ')}`);
    return this.get();
  }
}
