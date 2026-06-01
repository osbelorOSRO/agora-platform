import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class N8nResultadoDto {
  @ApiProperty({
    description: 'Resultado de la publicación reportado por N8N.',
    enum: ['publicado', 'error'],
    example: 'publicado',
  })
  @IsString()
  @IsIn(['publicado', 'error'])
  estado: string;

  @ApiPropertyOptional({
    description: 'ID del post en la red social (presente si estado=publicado).',
    example: '123456789_987654321',
  })
  @IsOptional()
  @IsString()
  id_post?: string;

  @ApiPropertyOptional({
    description:
      'Payload crudo de la respuesta de la red social, para auditoría.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}
