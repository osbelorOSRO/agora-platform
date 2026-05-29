import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MetaInboxService } from './meta-inbox.service';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { ResolveThreadDto } from './dto/resolve-thread.dto';
import { N8nThreadControlDto } from './dto/n8n-thread-control.dto';
import { N8nContactUpsertDto } from './dto/n8n-contact-upsert.dto';
import { SendThreadMessageDto } from './dto/send-thread-message.dto';
import { N8nOfferEventCreateDto } from './dto/n8n-offer-event-create.dto';
import { N8nOfferEventUpdateDto } from './dto/n8n-offer-event-update.dto';
import { N8nOfferContextDto } from './dto/n8n-offer-context.dto';
import { N8nOfferEventQueryDto } from './dto/n8n-offer-event-query.dto';

@ApiTags('Automatización N8N')
@Controller('meta-inbox/n8n')
@UseGuards(N8nAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class MetaInboxN8nController {
  constructor(private readonly metaInbox: MetaInboxService) {}

  @Get('stage-templates/:stageActual')
  getStageTemplatePaths(@Param('stageActual') stageActual: string) {
    return this.metaInbox.getStageTemplatePaths(stageActual);
  }

  @Post('resolve-thread')
  resolveThread(@Body() body: ResolveThreadDto) {
    return this.metaInbox.resolveThreadByActor(
      body.actorExternalId,
      body.objectType,
      body.includeClosed === true,
    );
  }

  @Patch('thread-control')
  updateThreadControl(@Body() body: N8nThreadControlDto) {
    return this.metaInbox.updateThreadControlForAutomation(body);
  }

  @Patch('contact')
  updateContact(@Body() body: N8nContactUpsertDto) {
    return this.metaInbox.updateContactForAutomation(body);
  }

  @Post('send-thread-message')
  sendThreadMessage(@Body() body: SendThreadMessageDto) {
    return this.metaInbox.sendThreadMessage({
      ...body,
      senderType: body.senderType || 'N8N',
      text: body.text?.trim(),
      caption: body.caption?.trim(),
      mediaUrl: body.mediaUrl?.trim(),
    });
  }

  @Post('offer-events')
  createOfferEvent(@Body() body: N8nOfferEventCreateDto) {
    return this.metaInbox.createOfferEventForAutomation(body);
  }

  @Patch('offer-events/:id')
  updateOfferEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: N8nOfferEventUpdateDto,
  ) {
    return this.metaInbox.updateOfferEventForAutomation(id, body);
  }

  @Post('offer-events/context')
  getOfferContext(@Body() body: N8nOfferContextDto) {
    return this.metaInbox.getOfferContextForAutomation(body);
  }

  @Get('offer-events/:id')
  getOfferEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.metaInbox.getOfferEventById(id);
  }

  @Get('offer-events')
  listOfferEvents(@Query() query: N8nOfferEventQueryDto) {
    return this.metaInbox.listOfferEvents(query);
  }
}
