import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
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
import { N8nSendTextDto } from './dto/n8n-send-text.dto';
import { N8nSendMessageDto } from './dto/n8n-send-message.dto';
import { N8nOfferEventCreateDto } from './dto/n8n-offer-event-create.dto';
import { N8nOfferEventQueryDto } from './dto/n8n-offer-event-query.dto';

@Controller('meta-inbox')
export class MetaInboxController {
  constructor(
    private readonly metaInbox: MetaInboxService,
    private readonly config: ConfigService,
  ) {}

  @Get('threads')
  async listThreads(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.metaInbox.listThreads({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('threads/:sessionId/messages')
  async listMessages(
    @Param('sessionId') sessionId: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return this.metaInbox.listMessages(sessionId, includeSystem === 'true');
  }

  @Get('stage-templates/:stageActual')
  async getStageTemplatePaths(
    @Param('stageActual') stageActual: string,
  ) {
    return this.metaInbox.getStageTemplatePaths(stageActual);
  }

  @Post('threads/:sessionId/send-text')
  async sendText(
    @Param('sessionId') sessionId: string,
    @Body() body: SendTextDto,
  ) {
    return this.metaInbox.sendText(sessionId, body.text.trim());
  }

  @Post('threads/:sessionId/send-media')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async sendMedia(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo no recibido');
    return this.metaInbox.sendMedia(sessionId, file);
  }

  @Patch('threads/:sessionId/contact')
  async updateContact(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.metaInbox.updateContact(sessionId, body);
  }

  @Patch('threads/:sessionId/control')
  async updateThreadControl(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateThreadControlDto,
  ) {
    return this.metaInbox.updateThreadControl(sessionId, body);
  }

  @Post('threads/:sessionId/reopen')
  async reopenThread(
    @Param('sessionId') sessionId: string,
  ) {
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

  @Post('n8n/send-text')
  async sendTextForN8n(
    @Headers('authorization') auth: string,
    @Body() body: N8nSendTextDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.sendTextForAutomation({
      sessionId: body.sessionId,
      actorExternalId: body.actorExternalId,
      objectType: body.objectType,
      text: body.text.trim(),
    });
  }

  @Post('n8n/send-message')
  async sendMessageForN8n(
    @Headers('authorization') auth: string,
    @Body() body: N8nSendMessageDto,
  ) {
    await this.assertN8nToken(auth);
    return this.metaInbox.sendMessageForAutomation({
      sessionId: body.sessionId,
      actorExternalId: body.actorExternalId,
      objectType: body.objectType,
      text: body.text?.trim(),
      mediaUrl: body.mediaUrl?.trim(),
      mediaType: body.mediaType,
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
      (await getRuntimeSecret('N8N_SECRET_TOKEN'));
    const provided = auth?.replace('Bearer ', '');

    if (!provided || provided !== token) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
