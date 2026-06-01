import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

export class BulkImportSaleDto {
  @ApiProperty({
    description: 'Lote de ventas a importar (mínimo 1).',
    type: [CreateSaleDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDto)
  records: CreateSaleDto[];
}
