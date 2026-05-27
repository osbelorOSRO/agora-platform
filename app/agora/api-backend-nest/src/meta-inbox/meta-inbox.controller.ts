import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MetaInboxService } from './meta-inbox.service';
import { SendTextDto } from './dto/send-text.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateThreadControlDto } from './dto/update-thread-control.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../config/multer.config';
import { N8nThreadControlDto } from './dto/n8n-thread-control.dto';
import { N8nContactUpsertDto } from './dto/n8n-contact-upsert.dto';
import { ResolveThreadDto } from './dto/resolve-thread.dto';
import { N8nOfferEventCreateDto } from './dto/n8n-offer-event-create.dto';
import { N8nOfferContextDto } from './dto/n8n-offer-context.dto';
import { N8nOfferEventQueryDto } from './dto/n8n-offer-event-query.dto';
import { N8nOfferEventUpdateDto } from './dto/n8n-offer-event-update.dto';
import { CreateWhatsappContactDto } from './dto/create-whatsapp-contact.dto';
import { EnsureWhatsappThreadDto } from './dto/ensure-whatsapp-thread.dto';
import { SendThreadMessageDto } from './dto/send-thread-message.dto';
import { WhatsappIdentityResolveDto } from './dto/whatsapp-identity-resolve.dto';
import { WhatsappBlockStatusDto } from './dto/whatsapp-block-status.dto';
import { SendMediaDto } from './dto/send-media.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { ListAdLeadStatsQueryDto } from './dto/list-ad-lead-stats-query.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';

@Controller('meta-inbox')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class MetaInboxController {
  constructor(private readonly metaInbox: MetaInboxService) {}

  @Get('threads')
  @UseGuards(PanelJwtAuthGuard)
  async listThreads(@Query() query: ListThreadsQueryDto) {
    return this.metaInbox.listThreads(query);
  }

  @Get('contacts')
  @UseGuards(PanelJwtAuthGuard)
  async listContacts(@Query() query: ListContactsQueryDto) {
    return this.metaInbox.listContacts(query);
  }

  @Post('contacts/whatsapp')
  @UseGuards(PanelJwtAuthGuard)
  async createWhatsappContact(@Body() body: CreateWhatsappContactDto) {
    return this.metaInbox.createWhatsappContact(body);
  }

  @Post('contacts/whatsapp/thread')
  @UseGuards(PanelJwtAuthGuard)
  async ensureWhatsappThread(@Body() body: EnsureWhatsappThreadDto) {
    return this.metaInbox.ensureWhatsappThreadForContact(body.actorExternalId);
  }

  @Post('whatsapp/identity/resolve')
  @UseGuards(PanelJwtAuthGuard)
  async resolveWhatsappIdentity(@Body() body: WhatsappIdentityResolveDto) {
    return this.metaInbox.resolveWhatsappIdentity(body);
  }

  @Post('whatsapp/block-status')
  @UseGuards(PanelJwtAuthGuard)
  async updateWhatsappBlockStatus(@Body() body: WhatsappBlockStatusDto) {
    return this.metaInbox.updateWhatsappBlockStatus(body);
  }

  @Get('whatsapp/ad-leads/stats')
  @UseGuards(PanelJwtAuthGuard)
  async listWhatsappAdLeadStats(@Query() query: ListAdLeadStatsQueryDto) {
    return this.metaInbox.listWhatsappAdLeadStats(query);
  }

  @Get('fca/marketplace-leads/stats')
  @UseGuards(PanelJwtAuthGuard)
  async listFcaMarketplaceLeadStats(@Query() query: ListAdLeadStatsQueryDto) {
    return this.metaInbox.listFcaMarketplaceLeadStats(query);
  }

  @Get('threads/:sessionId/messages')
  @UseGuards(PanelJwtAuthGuard)
  async listMessages(
    @Param('sessionId') sessionId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.metaInbox.listMessages(sessionId, query.includeSystem);
  }

  @Get('stage-templates/:stageActual')
  @UseGuards(PanelJwtAuthGuard)
  async getStageTemplatePaths(@Param('stageActual') stageActual: string) {
    return this.metaInbox.getStageTemplatePaths(stageActual);
  }

  @Get('n8n/stage-templates/:stageActual')
  @UseGuards(N8nAuthGuard)
  async getStageTemplatePathsForN8n(@Param('stageActual') stageActual: string) {
    return this.metaInbox.getStageTemplatePaths(stageActual);
  }

  @Post('threads/:sessionId/send-text')
  @UseGuards(PanelJwtAuthGuard)
  async sendText(
    @Param('sessionId') sessionId: string,
    @Body() body: SendTextDto,
  ) {
    return this.metaInbox.sendText(sessionId, body.text.trim());
  }

  @Post('threads/:sessionId/send-message')
  @UseGuards(PanelJwtAuthGuard)
  async sendThreadMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: SendThreadMessageDto,
  ) {
    return this.metaInbox.sendThreadMessage({
      ...body,
      sessionId,
      senderType: 'HUMAN',
      text: body.text?.trim(),
      caption: body.caption?.trim(),
      mediaUrl: body.mediaUrl?.trim(),
    });
  }

  @Post('threads/:sessionId/send-media')
  @UseGuards(PanelJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async sendMedia(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SendMediaDto,
  ) {
    if (!file) throw new BadRequestException('Archivo no recibido');
    return this.metaInbox.sendMedia(sessionId, file, body.caption?.trim());
  }

  @Patch('threads/:sessionId/contact')
  @UseGuards(PanelJwtAuthGuard)
  async updateContact(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.metaInbox.updateContact(sessionId, body);
  }

  @Patch('threads/:sessionId/control')
  @UseGuards(PanelJwtAuthGuard)
  async updateThreadControl(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateThreadControlDto,
  ) {
    return this.metaInbox.updateThreadControl(sessionId, body);
  }

  @Post('threads/:sessionId/reopen')
  @UseGuards(PanelJwtAuthGuard)
  async reopenThread(@Param('sessionId') sessionId: string) {
    return this.metaInbox.reopenThread(sessionId);
  }

  @Post('n8n/resolve-thread')
  @UseGuards(N8nAuthGuard)
  async resolveThreadForN8n(@Body() body: ResolveThreadDto) {
    return this.metaInbox.resolveThreadByActor(
      body.actorExternalId,
      body.objectType,
      body.includeClosed === true,
    );
  }

  @Patch('n8n/thread-control')
  @UseGuards(N8nAuthGuard)
  async updateThreadControlForN8n(@Body() body: N8nThreadControlDto) {
    return this.metaInbox.updateThreadControlForAutomation(body);
  }

  @Patch('n8n/contact')
  @UseGuards(N8nAuthGuard)
  async updateContactForN8n(@Body() body: N8nContactUpsertDto) {
    return this.metaInbox.updateContactForAutomation(body);
  }

  @Post('n8n/send-thread-message')
  @UseGuards(N8nAuthGuard)
  async sendThreadMessageForN8n(@Body() body: SendThreadMessageDto) {
    return this.metaInbox.sendThreadMessage({
      ...body,
      senderType: body.senderType || 'N8N',
      text: body.text?.trim(),
      caption: body.caption?.trim(),
      mediaUrl: body.mediaUrl?.trim(),
    });
  }

  @Post('n8n/offer-events')
  @UseGuards(N8nAuthGuard)
  async createOfferEventForN8n(@Body() body: N8nOfferEventCreateDto) {
    return this.metaInbox.createOfferEventForAutomation(body);
  }

  @Patch('n8n/offer-events/:id')
  @UseGuards(N8nAuthGuard)
  async updateOfferEventForN8n(
    @Param('id') id: string,
    @Body() body: N8nOfferEventUpdateDto,
  ) {
    return this.metaInbox.updateOfferEventForAutomation(id, body);
  }

  @Post('n8n/offer-events/context')
  @UseGuards(N8nAuthGuard)
  async getOfferContextForN8n(@Body() body: N8nOfferContextDto) {
    return this.metaInbox.getOfferContextForAutomation(body);
  }

  @Get('n8n/offer-events/:id')
  @UseGuards(N8nAuthGuard)
  async getOfferEventForN8n(@Param('id') id: string) {
    return this.metaInbox.getOfferEventById(id);
  }

  @Get('n8n/offer-events')
  @UseGuards(N8nAuthGuard)
  async listOfferEventsForN8n(@Query() query: N8nOfferEventQueryDto) {
    return this.metaInbox.listOfferEvents(query);
  }
}
