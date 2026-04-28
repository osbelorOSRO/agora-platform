import { Module } from '@nestjs/common';
import { ActorBootstrapService } from './bootstrap/actor-bootstrap.service';
import { ConversationBootstrapService } from './bootstrap/conversation-bootstrap.service';
import { ActorScoringService } from './scoring/actor-scoring.service';
import { ActorTransitionsProcessor } from './transitions/actor-transitions.processor';
import { ChangesProcessor } from './pipelines/changes.processor';
import { MessagesProcessor } from './pipelines/messages.processor';
import { MsgDelegationFinalizer } from './pipelines/msg-delegation.finalizer';
import { MsgDelegationProcessor } from './pipelines/msg-delegation.processor';
import { MsgDelegationStateService } from './pipelines/msg-delegation-state.service';
import { MsgDelegationCompletionService } from './pipelines/msg-delegation-completion.service';
import { MsgDelegationCallbackController } from './pipelines/msg-delegation-callback.controller';
import { ThreadMsgDelegationProcessor } from './pipelines/thread-msg-delegation.processor';
import { QueuesModule } from '../queues/queues.module';
import { ActorEventsModule } from '../actor-events/actor-events.module';
import { CacheConfigModule } from '../cache/cache.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { WebsocketNotifierModule } from '../websocket-notifier/websocket-notifier.module';
import { MetaInboxModule } from '../meta-inbox/meta-inbox.module';

@Module({
  imports: [
    QueuesModule,
    ActorEventsModule,
    CacheConfigModule,
    WebsocketNotifierModule,
    MetaInboxModule,
  ],
  controllers: [MsgDelegationCallbackController],
  providers: [
    PrismaService,
    ActorBootstrapService,
    ConversationBootstrapService,
    ActorScoringService,
    MsgDelegationStateService,
    MsgDelegationCompletionService,
    ChangesProcessor,
    MessagesProcessor,
    MsgDelegationProcessor,
    ThreadMsgDelegationProcessor,
    ActorTransitionsProcessor,
    MsgDelegationFinalizer,
  ],
  exports: [
    ActorBootstrapService,
    ConversationBootstrapService,
    ActorScoringService,
    MsgDelegationCompletionService,
  ],
})
export class ActorModule {}
