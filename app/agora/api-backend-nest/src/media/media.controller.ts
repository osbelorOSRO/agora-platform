import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { RequirePermission } from '../accesos/decorators/permission.decorator';
import { MediaService } from './media.service';
import {
  secureMediaMulterOptions,
  galeriaOfertasMulterOptions,
} from './media-security';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';
import { BaileysInternalTokenGuard } from '../shared/guards/baileys-internal-token.guard';

const TIPOS_MEDIA_VALIDOS = new Set(['imagen', 'audio', 'video', 'documento']);

@ApiTags('Media')
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

  // ── Galería de imágenes de ofertas ────────────────────────────────────────

  @Get('galeria-ofertas')
  @ApiBearerAuth('panel-jwt')
  @UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
  @RequirePermission('gestion_integraciones')
  @UseInterceptors(TransformInterceptor)
  async listarGaleria() {
    return this.mediaService.listarGaleria();
  }

  @Post('galeria-ofertas')
  @ApiBearerAuth('panel-jwt')
  @UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
  @RequirePermission('gestion_integraciones')
  @UseInterceptors(TransformInterceptor)
  @UseInterceptors(FilesInterceptor('files', 10, galeriaOfertasMulterOptions))
  async subirGaleria(@UploadedFiles() archivos: Express.Multer.File[]) {
    if (!archivos?.length)
      throw new BadRequestException('Sin archivos recibidos');
    return this.mediaService.subirGaleria(archivos);
  }

  @Delete('galeria-ofertas/:id')
  @ApiBearerAuth('panel-jwt')
  @UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
  @RequirePermission('gestion_integraciones')
  @UseInterceptors(TransformInterceptor)
  async eliminarGaleria(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.eliminarGaleria(id);
  }
}
