import { randomUUID } from 'crypto';
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import * as Joi from 'joi';
import { PrismaService } from './database/prisma/prisma.service';
import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { BaileysModule } from './baileys/baileys.module';
import { CacheConfigModule } from './cache/cache.module';
import { WebsocketNotifierModule } from './websocket-notifier/websocket-notifier.module';
import { ShortcutModule } from './shortcut/shortcut.module';
import { MetaModule } from './webhooks/meta/meta.module';
import { LegalModule } from './legal/legal.module';
import { ActorEventsModule } from './actor-events/actor-events.module';
import { ActorModule } from './actor/actor.module';
import { QueuesModule } from './queues/queues.module';
import { MetaInboxModule } from './meta-inbox/meta-inbox.module';
import { MinioModule } from './minio/minio.module';
import { StageTemplatesModule } from './stage-templates/stage-templates.module';
import { OffersModule } from './offers/offers.module';
import { MetaConfigModule } from './meta-config/meta-config.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { AccessModule } from './accesos/accesos.module';
import { SettingsModule } from './settings/settings.module';
import { SalesRecordModule } from './sales-record/sales-record.module';
import { FcaModule } from './fca/fca.module';
import { FcaConfigModule } from './fca-config/fca-config.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        VAULT_ROLE_ID: Joi.string().required(),
        VAULT_SECRET_ID: Joi.string().required(),
        VAULT_ADDR: Joi.string().uri().default('http://vault:8200'),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().integer().default(6379),
        DATABASE_URL: Joi.string().required(),
        PORT: Joi.number().integer().default(4001),
        CORS_ALLOWED_ORIGINS: Joi.string().optional(),
        NODE_ENV: Joi.string().default('production'),
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('NODE_ENV') === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
            genReqId: (req, res) => {
              const id = randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            redact: [
              'req.headers.authorization',
              'req.headers["x-internal-token"]',
            ],
            serializers: {
              req(req: { id: string; method: string; url: string }) {
                return { id: req.id, method: req.method, url: req.url };
              },
            },
          },
        };
      },
    }),
    CoreModule,
    HealthModule,
    AccessModule,
    SettingsModule,
    SalesRecordModule,
    AuthModule,
    MediaModule,
    BaileysModule,
    CacheConfigModule,
    WebsocketNotifierModule,
    ShortcutModule,
    MetaModule,
    LegalModule,
    ActorEventsModule,
    ActorModule,
    QueuesModule,
    MetaInboxModule,
    MinioModule,
    StageTemplatesModule,
    OffersModule,
    MetaConfigModule,
    UserProfileModule,
    FcaConfigModule,
    FcaModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
