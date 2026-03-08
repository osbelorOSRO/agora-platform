import { Module } from '@nestjs/common';
import { ProcesosPgService } from './procesos_pg.service';
import { ProcesosPgController } from './procesos_pg.controller';
import { PrismaService } from '../database/prisma/prisma.service';
import { ProcesosModule } from '../mongodb/modules/procesos/procesos.module';
import { BaileysModule } from '../baileys/baileys.module';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module'; // Importar módulo notifier

@Module({
  imports: [
    ProcesosModule,
    BaileysModule,
    WebsocketNotifierModule, // Agregar aquí para inyectar servicio
  ],
  controllers: [ProcesosPgController],
  providers: [ProcesosPgService, PrismaService],
  exports: [ProcesosPgService],
})
export class ProcesosPgModule {}

