import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { MetaInboxService } from './meta-inbox.service';
import { SendTextDto } from './dto/send-text.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../config/multer.config';

@Controller('meta-inbox')
export class MetaInboxController {
  constructor(private readonly metaInbox: MetaInboxService) {}

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
}
