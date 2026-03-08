import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MsgDelegationCompleteDto } from './dto/msg-delegation-complete.dto';
import { MsgDelegationFailedDto } from './dto/msg-delegation-failed.dto';
import { MsgDelegationCompletionService } from './msg-delegation-completion.service';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

@Controller('actor/msg-delegation')
export class MsgDelegationCallbackController {
  private readonly logger = new Logger(MsgDelegationCallbackController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly completion: MsgDelegationCompletionService,
  ) {}

  @Post('complete')
  async complete(
    @Headers('authorization') auth: string,
    @Body() body: MsgDelegationCompleteDto,
  ) {
    await this.validateAuth(auth);
    this.logger.log(
      `FLOW[CALLBACK] complete received externalEventId=${body.externalEventId}, actorExternalId=${body.actorExternalId}, hasSignal=${body.hasSignal !== false}`,
    );
    const result = await this.completion.complete(body);
    this.logger.log(
      `FLOW[CALLBACK] complete processed externalEventId=${body.externalEventId}, result=${JSON.stringify(result)}`,
    );

    return {
      ok: true,
      ...result,
      externalEventId: body.externalEventId,
    };
  }

  @Post('failed')
  async failed(
    @Headers('authorization') auth: string,
    @Body() body: MsgDelegationFailedDto,
  ) {
    await this.validateAuth(auth);
    this.logger.warn(
      `FLOW[CALLBACK] failed received externalEventId=${body.externalEventId}, actorExternalId=${body.actorExternalId}, reason=${body.reason || 'unknown'}`,
    );
    const result = await this.completion.fail(body);
    this.logger.warn(
      `FLOW[CALLBACK] failed processed externalEventId=${body.externalEventId}, result=${JSON.stringify(result)}`,
    );

    return {
      ok: true,
      ...result,
      externalEventId: body.externalEventId,
    };
  }

  private async validateAuth(authHeader: string) {
    const token =
      this.config.get<string>('N8N_CALLBACK_SECRET_TOKEN') ||
      this.config.get<string>('N8N_SECRET_TOKEN') ||
      (await getRuntimeSecret('N8N_CALLBACK_SECRET_TOKEN').catch(async () =>
        getRuntimeSecret('N8N_SECRET_TOKEN'),
      ));
    const provided = authHeader?.replace('Bearer ', '');

    if (!token || !provided || provided !== token) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
