import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClientesMongoService } from './services/clientes.mongodb.service';
import { ClienteSchema } from './schemas/cliente.schema';

import { ClientesMongoController } from './controllers/clientes.controller'; // controller clientes existente
import { ContratosController } from './controllers/contratos.controller'; // nuevo controller

import { ContratosMongoService } from './services/contratos.mongodb.service'; // nuevo service

import { ProcesosModule } from './modules/procesos/procesos.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([{ name: 'Cliente', schema: ClienteSchema }]),
    ProcesosModule,
  ],
  controllers: [
    ClientesMongoController, // existente
    ContratosController, // nuevo
  ],
  providers: [
    ClientesMongoService, // existente
    ContratosMongoService, // nuevo
  ],
  exports: [
    ClientesMongoService,
    ContratosMongoService,
    MongooseModule,
    ProcesosModule,
  ],
})
export class MongodbModule {}
