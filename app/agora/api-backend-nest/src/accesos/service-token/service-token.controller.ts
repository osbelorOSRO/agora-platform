import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ServiceTokenService } from './service-token.service';

@Controller('api/service-auth')
export class ServiceTokenController {
  constructor(private readonly service: ServiceTokenService) {}

  @Post('service-token')
  @HttpCode(200)
  issueServiceToken(@Body() body: any) {
    return this.service.issueServiceToken(body.serviceId, body.secretKey);
  }
}
