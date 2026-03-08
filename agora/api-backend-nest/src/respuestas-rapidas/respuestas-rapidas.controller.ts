import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateRespuestaRapidaDto } from './dto/create-respuesta-rapida.dto';
import { UpdateRespuestaRapidaDto } from './dto/update-respuesta-rapida.dto';
import { RespuestasRapidasService } from './respuestas-rapidas.service';

@Controller('respuestas-rapidas')
export class RespuestasRapidasController {
  constructor(private readonly service: RespuestasRapidasService) {}

  @Post()
  create(@Body() dto: CreateRespuestaRapidaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.service.findOne(uuid);
  }

  @Put(':uuid')
  update(@Param('uuid') uuid: string, @Body() dto: UpdateRespuestaRapidaDto) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    return this.service.remove(uuid);
  }
}
