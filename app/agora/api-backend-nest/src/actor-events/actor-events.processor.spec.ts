import { Job } from 'bullmq';
import { ActorEventsService } from './actor-events.service';
import {
  ActorEventsProcessor,
  ActorChangesProcessor,
} from './actor-events.processor';

const mockQueue = {
  add: jest.fn(),
} as any;

const mockService = {
  registerEvent: jest.fn(),
} as unknown as ActorEventsService;

function makeJob(name: string, data?: Record<string, unknown>): Job<any> {
  return { name, data: data ?? {} } as Job<any>;
}

describe('ActorEventsProcessor', () => {
  let processor: ActorEventsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new ActorEventsProcessor(mockService, mockQueue);
  });

  describe('process', () => {
    it('procesa job meta.message → registra evento + delega', async () => {
      const data = { externalEventId: 'ext-001', text: 'hola' };
      await processor.process(makeJob('meta.message', data));

      expect(mockService.registerEvent).toHaveBeenCalledWith(data);
      expect(mockQueue.add).toHaveBeenCalledWith('message.bootstrap', data, {
        jobId: 'bootstrap:ext-001',
      });
    });

    it('ignora jobs de otros tipos', async () => {
      await processor.process(makeJob('meta.change', { foo: 1 }));

      expect(mockService.registerEvent).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});

describe('ActorChangesProcessor', () => {
  let processor: ActorChangesProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new ActorChangesProcessor(mockService);
  });

  describe('process', () => {
    it('procesa job meta.change → registra evento', async () => {
      const data = { externalEventId: 'ext-002' };
      await processor.process(makeJob('meta.change', data));

      expect(mockService.registerEvent).toHaveBeenCalledWith(data);
    });

    it('ignora jobs de otros tipos', async () => {
      await processor.process(makeJob('meta.message', { foo: 1 }));

      expect(mockService.registerEvent).not.toHaveBeenCalled();
    });
  });
});
