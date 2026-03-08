import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcesosMongoService } from '../../services/procesos.mongodb.service';
import { ScrapingMongoService } from '../../services/scraping.mongodb.service';
import { ProcesosController } from '../../controllers/procesos.controller';
import { ScrapingController } from '../../controllers/scraping.controller';
import { ProcesoModel } from '../../schemas/proceso.schema';
import { N8nController } from '../../controllers/n8n.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Proceso', schema: ProcesoModel.schema }])
  ],
  controllers: [
    ProcesosController,
    ScrapingController,
    N8nController,
  ],
  providers: [
    ProcesosMongoService,
    ScrapingMongoService,
  ],
  exports: [
    ProcesosMongoService,
    ScrapingMongoService,
    MongooseModule,
  ],
})
export class ProcesosModule {}

