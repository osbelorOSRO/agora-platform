import { Module } from '@nestjs/common';
import { MetaInboxThreadModule } from './meta-inbox-thread.module';
import { BaileysModule } from '../baileys/baileys.module';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { ContactService } from './services/contact.service';
import { WhatsappIdentityService } from './services/whatsapp-identity.service';
import { LeadSalesAnalysisService } from './services/lead-sales-analysis.service';
import { LeadCatalogService } from './services/lead-catalog.service';

@Module({
  imports: [MetaInboxThreadModule, BaileysModule, WebsocketNotifierModule],
  providers: [
    WhatsappIdentityService,
    ContactService,
    LeadSalesAnalysisService,
    LeadCatalogService,
  ],
  exports: [
    ContactService,
    WhatsappIdentityService,
    LeadSalesAnalysisService,
    LeadCatalogService,
  ],
})
export class MetaInboxContactModule {}
