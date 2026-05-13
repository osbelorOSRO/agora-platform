import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
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
import { ConfigService } from '@nestjs/config';
import { getRuntimeSecret } from '../shared/runtime-secrets';
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
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';

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
  constructor(
    private readonly metaInbox: MetaInboxService,
    private readonly config: ConfigService,
  ) {}

  @Get('threads')
  @UseGuards(PanelJwtAuthGuard)
  async listThreads(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeClosed') includeClosed?: string,
  ) {
    return this.metaInbox.listThreads({
      limit: this.parseLimit(limit, 100, 200),
      offset: this.parseOffset(offset),
      includeClosed: includeClosed === 'true',
    });
  }

  @Get('contacts')
  @UseGuards(PanelJwtAuthGuard)
  async listContacts(
    @Query('search') search?: string,
    @Query('objectType') objectType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.metaInbox.listContacts({
      search,
      objectType,
      limit: this.parseLimit(limit, 50, 200),
      offset: this.parseOffset(offset),
    });
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
  async listWhatsappAdLeadStats(
    @Query('sourceId') sourceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.metaInbox.listWhatsappAdLeadStats({
      sourceId,
      limit: this.parseLimit(limit, 100, 1000),
    });
  }

  @Get('threads/:sessionId/messages')
  @UseGuards(PanelJwtAuthGuard)
  async listMessages(
    @Param('sessionId') sessionId: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return this.metaInbox.listMessages(sessionId, includeSystem === 'true');
  }

  @Get('stage-templates/:stageActual')
  @UseGuards(PanelJwtAuthGuard)
  async getStageTemplatePaths(@Param('stageActual') stageActual: string) {
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
  async resolveThreadForN8n(
    @Headers('authorization') auth: string,
    @Body() body: ResolveThreadDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.resolveThreadByActor(
      body.actorExternalId,
      body.objectType,
      body.includeClosed === true,
    );
  }

  @Patch('n8n/thread-control')
  async updateThreadControlForN8n(
    @Headers('authorization') auth: string,
    @Body() body: N8nThreadControlDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.updateThreadControlForAutomation(body);
  }

  @Patch('n8n/contact')
  async updateContactForN8n(
    @Headers('authorization') auth: string,
    @Body() body: N8nContactUpsertDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.updateContactForAutomation(body);
  }

  @Post('n8n/send-thread-message')
  async sendThreadMessageForN8n(
    @Headers('authorization') auth: string,
    @Body() body: SendThreadMessageDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.sendThreadMessage({
      ...body,
      senderType: body.senderType || 'N8N',
      text: body.text?.trim(),
      caption: body.caption?.trim(),
      mediaUrl: body.mediaUrl?.trim(),
    });
  }

  @Post('n8n/offer-events')
  async createOfferEventForN8n(
    @Headers('authorization') auth: string,
    @Body() body: N8nOfferEventCreateDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.createOfferEventForAutomation(body);
  }

  @Patch('n8n/offer-events/:id')
  async updateOfferEventForN8n(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: N8nOfferEventUpdateDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.updateOfferEventForAutomation(id, body);
  }

  @Post('n8n/offer-events/context')
  async getOfferContextForN8n(
    @Headers('authorization') auth: string,
    @Body() body: N8nOfferContextDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.getOfferContextForAutomation(body);
  }

  @Get('n8n/offer-events/:id')
  async getOfferEventForN8n(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.getOfferEventById(id);
  }

  @Get('n8n/offer-events')
  async listOfferEventsForN8n(
    @Headers('authorization') auth: string,
    @Query() query: N8nOfferEventQueryDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.listOfferEvents(query);
  }

  private async assertN8nToken(auth: string) {
    const token =
      this.config.get<string>('N8N_SECRET_TOKEN') ||
      (await getRuntimeSecret('N8N_SECRET_TOKEN').catch(() => undefined));
    const provided = auth?.replace('Bearer ', '');

    if (!provided || provided !== token) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  private parseLimit(raw: string | undefined, fallback: number, max: number): number {
    const parsed = raw ? Number(raw) : fallback;
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private parseOffset(raw: string | undefined): number {
    const parsed = raw ? Number(raw) : 0;
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }
}
