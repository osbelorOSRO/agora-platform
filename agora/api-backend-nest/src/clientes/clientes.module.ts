import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesLiteController } from './clientes.lite.controller';
import { ClientesService } from './clientes.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { MongodbModule } from '../mongodb/mongodb.module';
import { ClientesMongoService } from '../mongodb/services/clientes.mongodb.service';
import { ProcesosPgModule } from '../procesos_pg/procesos_pg.module';
import { EstadoClienteService } from './estado-cliente.service';
import { CacheService } from '../cache/cache.service';
import { CacheConfigModule } from '../cache/cache.module';

import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module'; // Importa módulo notifier

@Module({
  imports: [
    MongodbModule,
    ProcesosPgModule,
    CacheConfigModule,
    WebsocketNotifierModule, // Agrega el módulo aquí
  ],
  controllers: [ClientesController, ClientesLiteController],
  providers: [
    ClientesService,
    PrismaService,
    EstadoClienteService,
    ClientesMongoService,
    CacheService,
  ],
})
export class ClientesModule {}

