import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ServiceTokenService } from './service-token.service';

class IssueServiceTokenDto {
  @IsString() serviceId: string;
  @IsString() secretKey: string;
}

@Controller('api/service-auth')
export class ServiceTokenController {
  constructor(private readonly service: ServiceTokenService) {}

  @Post('service-token')
  @HttpCode(200)
  issueServiceToken(@Body() body: IssueServiceTokenDto) {
    return this.service.issueServiceToken(body.serviceId, body.secretKey);
  }
}
