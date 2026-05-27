import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
