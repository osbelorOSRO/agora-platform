import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  ForbiddenException,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { secureMediaMulterOptions } from './media-security';
import { ConfigService } from '@nestjs/config';
import { getRuntimeSecret } from '../shared/runtime-secrets';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly config: ConfigService,
  ) {}

  @Post('guardar')
  @UseInterceptors(FileInterceptor('archivo', secureMediaMulterOptions))
  async guardarArchivo(
    @UploadedFile() archivo: Express.Multer.File,
    @Body('actorId') actorId: string,
    @Body('tipo') tipo: string,
    @Headers('x-internal-token') internalToken?: string,
  ) {
    this.assertInternalToken(internalToken);
    if (!archivo) throw new BadRequestException('Archivo no recibido');
    if (!actorId) throw new BadRequestException('actorId requerido');
    if (!tipo) throw new BadRequestException('tipo requerido');

    return this.mediaService.procesarArchivo(archivo, actorId, tipo);
  }

  // 🔹 NUEVO ENDPOINT PARA TTS (n8n)
  @Post('upload-tts')
  @UseInterceptors(FileInterceptor('file', secureMediaMulterOptions))
  async uploadTts(
    @UploadedFile() archivo: Express.Multer.File,
    @Headers('authorization') auth: string,
  ) {
    await this.assertN8nToken(auth);
    if (!archivo) throw new BadRequestException('Archivo no recibido');

    return this.mediaService.procesarTts(archivo);
  }

  private assertInternalToken(internalToken?: string) {
    const expected = this.config.get<string>('BAILEYS_INTERNAL_TOKEN');
    if (!expected?.trim()) {
      throw new ForbiddenException('Token interno no configurado');
    }

    if (!internalToken || internalToken !== expected) {
      throw new ForbiddenException('Token interno invalido');
    }
  }

  private async assertN8nToken(auth: string) {
    const token =
      this.config.get<string>('N8N_SECRET_TOKEN') ||
      (await getRuntimeSecret('N8N_SECRET_TOKEN'));
    const provided = auth?.replace('Bearer ', '');

    if (!provided || provided !== token) {
      throw new UnauthorizedException('Token invalido');
    }
  }
}
