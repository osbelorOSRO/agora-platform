import { Module } from '@nestjs/common';
import { MetaInboxThreadModule } from './meta-inbox-thread.module';
import { BaileysModule } from '../baileys/baileys.module';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { ContactService } from './services/contact.service';
import { WhatsappIdentityService } from './services/whatsapp-identity.service';

@Module({
  imports: [MetaInboxThreadModule, BaileysModule, WebsocketNotifierModule],
  providers: [WhatsappIdentityService, ContactService],
  exports: [ContactService, WhatsappIdentityService],
})
export class MetaInboxContactModule {}
