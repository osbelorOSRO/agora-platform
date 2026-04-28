import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('guardar')
  @UseInterceptors(FileInterceptor('archivo', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    }),
  }))
  async guardarArchivo(
    @UploadedFile() archivo: Express.Multer.File,
    @Body('actorId') actorId: string,
    @Body('tipo') tipo: string,
  ) {
    if (!archivo) throw new BadRequestException('Archivo no recibido');
    if (!actorId) throw new BadRequestException('actorId requerido');
    if (!tipo) throw new BadRequestException('tipo requerido');

    return this.mediaService.procesarArchivo(archivo, actorId, tipo);
  }

  // 🔹 NUEVO ENDPOINT PARA TTS (n8n)
  @Post('upload-tts')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const ext = extname(file.originalname) || '.mpga';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
  }))
  async uploadTts(
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) throw new BadRequestException('Archivo no recibido');

    return this.mediaService.procesarTts(archivo);
  }
}
