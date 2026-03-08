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
import { v4 as uuidv4 } from 'uuid';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // 🔹 ENDPOINT EXISTENTE (NO SE TOCA)
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
    @Body('cliente_id') cliente_id: string,
    @Body('tipo') tipo: string,
  ) {
    if (!archivo) throw new BadRequestException('Archivo no recibido');
    if (!cliente_id) throw new BadRequestException('cliente_id requerido');
    if (!tipo) throw new BadRequestException('tipo requerido');

    return this.mediaService.procesarArchivo(archivo, cliente_id, tipo);
  }

  // 🔹 NUEVO ENDPOINT PARA TTS (n8n)
  @Post('upload-tts')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const ext = extname(file.originalname) || '.mpga';
        cb(null, `${uuidv4()}${ext}`);
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
