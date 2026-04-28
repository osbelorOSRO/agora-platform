import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './database/prisma/prisma.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SesionModule } from './sesion/sesion.module';
import { MediaModule } from './media/media.module';
import { BaileysModule } from './baileys/baileys.module';
import { CacheConfigModule } from './cache/cache.module';
import { WebsocketNotifierModule } from './websocket-notifier/websocket-notifier.module';
import { RespuestasRapidasModule } from './respuestas-rapidas/respuestas-rapidas.module';
import { MetaModule } from './webhooks/meta/meta.module';
import { LegalModule } from './legal/legal.module';
import { ActorEventsModule } from './actor-events/actor-events.module';
import { ActorModule } from './actor/actor.module';
import { QueuesModule } from './queues/queues.module';
import { MetaInboxModule } from './meta-inbox/meta-inbox.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    AuthModule,
    SesionModule,
    MediaModule,
    BaileysModule,
    CacheConfigModule,
    WebsocketNotifierModule,
    RespuestasRapidasModule,
    MetaModule,
    LegalModule,
    ActorEventsModule,
    ActorModule,
    QueuesModule,
    MetaInboxModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
