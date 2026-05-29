import { Module } from '@nestjs/common';
import { OfferContextService } from './services/offer-context.service';

@Module({
  providers: [OfferContextService],
  exports: [OfferContextService],
})
export class MetaInboxOffersModule {}
