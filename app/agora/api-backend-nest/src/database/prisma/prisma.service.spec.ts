import { PrismaService } from './prisma.service';

const makeSvc = () => {
  const svc = new PrismaService() as any;
  svc.$connect = jest.fn().mockResolvedValue(undefined);
  svc.$disconnect = jest.fn().mockResolvedValue(undefined);
  svc.$queryRawUnsafe = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  return svc as PrismaService;
};

describe('PrismaService', () => {
  it('está definido', () => {
    expect(makeSvc()).toBeDefined();
  });

  it('onModuleInit conecta y ejecuta smoke check', async () => {
    const svc = makeSvc();
    await svc.onModuleInit();
    expect((svc as any).$connect).toHaveBeenCalled();
    expect((svc as any).$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('onModuleInit no lanza si el smoke check falla', async () => {
    const svc = makeSvc();
    (svc as any).$queryRawUnsafe.mockRejectedValue(new Error('DB down'));
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
  });

  it('onModuleDestroy desconecta', async () => {
    const svc = makeSvc();
    await svc.onModuleDestroy();
    expect((svc as any).$disconnect).toHaveBeenCalled();
  });
});
