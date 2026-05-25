import {
  Body,
  Controller,
  Logger,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MsgDelegationCompleteDto } from './dto/msg-delegation-complete.dto';
import { MsgDelegationFailedDto } from './dto/msg-delegation-failed.dto';
import { MsgDelegationCompletionService } from './msg-delegation-completion.service';
import { N8nCallbackAuthGuard } from '../../shared/guards/n8n-callback-auth.guard';

@Controller('actor/msg-delegation')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class MsgDelegationCallbackController {
  private readonly logger = new Logger(MsgDelegationCallbackController.name);

  constructor(private readonly completion: MsgDelegationCompletionService) {}

  @Post('complete')
  @UseGuards(N8nCallbackAuthGuard)
  async complete(@Body() body: MsgDelegationCompleteDto) {
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
  @UseGuards(N8nCallbackAuthGuard)
  async failed(@Body() body: MsgDelegationFailedDto) {
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
}
