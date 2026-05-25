import { PartialType } from '@nestjs/mapped-types';
import { CreateStageTemplateDto } from './create-stage-template.dto';

export class UpdateStageTemplateDto extends PartialType(
  CreateStageTemplateDto,
) {}
