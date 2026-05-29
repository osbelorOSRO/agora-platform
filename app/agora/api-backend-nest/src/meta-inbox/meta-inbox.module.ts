import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { MetaInboxThreadModule } from './meta-inbox-thread.module';
import { MetaInboxContactModule } from './meta-inbox-contact.module';
import { MetaInboxMessagingModule } from './meta-inbox-messaging.module';
import { MetaInboxOffersModule } from './meta-inbox-offers.module';
import { MetaInboxController } from './meta-inbox.controller';
import { MetaInboxN8nController } from './meta-inbox-n8n.controller';
import { MetaInboxService } from './meta-inbox.service';
import { META_INBOX_GATEWAY } from './interfaces/meta-inbox-gateway.interface';

@Module({
  imports: [
    AuthModule,
    MetaInboxThreadModule,
    MetaInboxContactModule,
    MetaInboxMessagingModule,
    MetaInboxOffersModule,
  ],
  controllers: [MetaInboxController, MetaInboxN8nController],
  providers: [
    N8nAuthGuard,
    MetaInboxService,
    { provide: META_INBOX_GATEWAY, useExisting: MetaInboxService },
  ],
  exports: [MetaInboxService, META_INBOX_GATEWAY, MetaInboxThreadModule],
})
export class MetaInboxModule {}
