import { Module, Scope } from '@nestjs/common';
import { BaileysSenderService } from './baileys-sender.service';

@Module({
  providers: [
    {
      provide: BaileysSenderService,
      useClass: BaileysSenderService,
      scope: Scope.REQUEST, // ✅ Necesario para poder inyectar REQUEST
    },
  ],
  exports: [BaileysSenderService],
})
export class BaileysModule {}
