import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { secureMediaMulterOptions } from './media-security';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { BaileysInternalTokenGuard } from '../shared/guards/baileys-internal-token.guard';

const TIPOS_MEDIA_VALIDOS = new Set(['imagen', 'audio', 'video', 'documento']);

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('guardar')
  @UseGuards(BaileysInternalTokenGuard)
  @UseInterceptors(FileInterceptor('archivo', secureMediaMulterOptions))
  async guardarArchivo(
    @UploadedFile() archivo: Express.Multer.File,
    @Body('actorId') actorId: string,
    @Body('tipo') tipo: string,
  ) {
    if (!archivo) throw new BadRequestException('Archivo no recibido');
    if (!actorId || actorId.length > 255)
      throw new BadRequestException('actorId requerido');
    if (!tipo || !TIPOS_MEDIA_VALIDOS.has(tipo))
      throw new BadRequestException('tipo invalido');

    return this.mediaService.procesarArchivo(archivo, actorId, tipo);
  }

  @Post('upload-tts')
  @UseGuards(N8nAuthGuard)
  @UseInterceptors(FileInterceptor('file', secureMediaMulterOptions))
  async uploadTts(@UploadedFile() archivo: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Archivo no recibido');

    return this.mediaService.procesarTts(archivo);
  }
}
