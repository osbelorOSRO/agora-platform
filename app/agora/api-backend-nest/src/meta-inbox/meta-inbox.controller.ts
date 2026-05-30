import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { MetaInboxService } from './meta-inbox.service';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { multerConfig } from '../config/multer.config';
import { SendTextDto } from './dto/send-text.dto';
import { SendThreadMessageDto } from './dto/send-thread-message.dto';
import { SendMediaDto } from './dto/send-media.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateThreadControlDto } from './dto/update-thread-control.dto';
import { CreateWhatsappContactDto } from './dto/create-whatsapp-contact.dto';
import { EnsureWhatsappThreadDto } from './dto/ensure-whatsapp-thread.dto';
import { WhatsappIdentityResolveDto } from './dto/whatsapp-identity-resolve.dto';
import { WhatsappBlockStatusDto } from './dto/whatsapp-block-status.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { ListAdLeadStatsQueryDto } from './dto/list-ad-lead-stats-query.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { UpsertSalesAnalysisDto } from './dto/upsert-sales-analysis.dto';
import {
  CreateCatalogOptionDto,
  UpdateCatalogOptionDto,
} from './dto/catalog-option.dto';

@ApiTags('Bandeja Meta')
@ApiBearerAuth('panel-jwt')
@Controller('meta-inbox')
@UseGuards(PanelJwtAuthGuard)
@UseInterceptors(TransformInterceptor)
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
  listThreads(@Query() query: ListThreadsQueryDto) {
    return this.metaInbox.listThreads(query);
  }

  @Get('contacts')
  listContacts(@Query() query: ListContactsQueryDto) {
    return this.metaInbox.listContacts(query);
  }

  @Post('contacts/whatsapp')
  createWhatsappContact(@Body() body: CreateWhatsappContactDto) {
    return this.metaInbox.createWhatsappContact(body);
  }

  @Post('contacts/whatsapp/thread')
  ensureWhatsappThread(@Body() body: EnsureWhatsappThreadDto) {
    return this.metaInbox.ensureWhatsappThreadForContact(body.actorExternalId);
  }

  @Post('whatsapp/identity/resolve')
  resolveWhatsappIdentity(@Body() body: WhatsappIdentityResolveDto) {
    return this.metaInbox.resolveWhatsappIdentity(body);
  }

  @Post('whatsapp/block-status')
  updateWhatsappBlockStatus(@Body() body: WhatsappBlockStatusDto) {
    return this.metaInbox.updateWhatsappBlockStatus(body);
  }

  @Get('whatsapp/ad-leads/stats')
  listWhatsappAdLeadStats(@Query() query: ListAdLeadStatsQueryDto) {
    return this.metaInbox.listWhatsappAdLeadStats(query);
  }

  @Get('fca/marketplace-leads/stats')
  listFcaMarketplaceLeadStats(@Query() query: ListAdLeadStatsQueryDto) {
    return this.metaInbox.listFcaMarketplaceLeadStats(query);
  }

  @Get('threads/:sessionId/messages')
  listMessages(
    @Param('sessionId') sessionId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.metaInbox.listMessages(sessionId, query.includeSystem);
  }

  @Get('stage-templates/:stageActual')
  getStageTemplatePaths(@Param('stageActual') stageActual: string) {
    return this.metaInbox.getStageTemplatePaths(stageActual);
  }

  @Post('threads/:sessionId/send-text')
  sendText(@Param('sessionId') sessionId: string, @Body() body: SendTextDto) {
    return this.metaInbox.sendText(sessionId, body.text.trim());
  }

  @Post('threads/:sessionId/send-message')
  sendThreadMessage(
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
  @UseInterceptors(FileInterceptor('file', multerConfig))
  sendMedia(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SendMediaDto,
  ) {
    if (!file) throw new BadRequestException('Archivo no recibido');
    return this.metaInbox.sendMedia(sessionId, file, body.caption?.trim());
  }

  @Patch('threads/:sessionId/contact')
  updateContact(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.metaInbox.updateContact(sessionId, body);
  }

  @Patch('threads/:sessionId/control')
  updateThreadControl(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateThreadControlDto,
  ) {
    return this.metaInbox.updateThreadControl(sessionId, body);
  }

  @Post('threads/:sessionId/reopen')
  reopenThread(@Param('sessionId') sessionId: string) {
    return this.metaInbox.reopenThread(sessionId);
  }

  @Put('threads/:sessionId/sales-analysis')
  upsertSalesAnalysis(
    @Param('sessionId') sessionId: string,
    @Body() body: UpsertSalesAnalysisDto,
  ) {
    return this.metaInbox.upsertSalesAnalysis(sessionId, body);
  }

  @Get('threads/:sessionId/sales-analysis')
  getSalesAnalysis(@Param('sessionId') sessionId: string) {
    return this.metaInbox.getSalesAnalysis(sessionId);
  }

  @Get('lead-catalog')
  listLeadCatalog() {
    return this.metaInbox.listLeadCatalog();
  }

  @Post('lead-catalog')
  createLeadCatalogOption(@Body() body: CreateCatalogOptionDto) {
    return this.metaInbox.createLeadCatalogOption(body);
  }

  @Patch('lead-catalog/:id')
  updateLeadCatalogOption(
    @Param('id') id: string,
    @Body() body: UpdateCatalogOptionDto,
  ) {
    return this.metaInbox.updateLeadCatalogOption(id, body);
  }
}
