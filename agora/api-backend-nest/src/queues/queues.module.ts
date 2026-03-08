import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  Q_META_MESSAGES,
  Q_META_CHANGES,
  Q_MSG_DELEGATION,
  Q_ACTOR_TRANSITIONS,
} from './queues.constants';

@Module({
  imports: [
    /**
     * =====================================
     * BullMQ Redis Connection
     * =====================================
     * Conexión independiente del cache-manager.
     */
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },

      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 5000,
        removeOnFail: 5000,
      },
    }),

    /**
     * =====================================
     * Queue registration
     * =====================================
     */
    BullModule.registerQueue(
      { name: Q_META_MESSAGES },
      { name: Q_META_CHANGES },
      { name: Q_MSG_DELEGATION },
      { name: Q_ACTOR_TRANSITIONS },
    ),
  ],

  exports: [BullModule],
})
export class QueuesModule {}
