import { CacheService } from './cache.service';

const makeCacheManager = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
});

describe('CacheService', () => {
  it('get devuelve el valor del cache manager', async () => {
    const mgr = makeCacheManager();
    mgr.get.mockResolvedValue('valor');
    const svc = new CacheService(mgr as any);
    expect(await svc.get('clave')).toBe('valor');
    expect(mgr.get).toHaveBeenCalledWith('clave');
  });

  it('get devuelve undefined si no hay valor', async () => {
    const mgr = makeCacheManager();
    mgr.get.mockResolvedValue(undefined);
    const svc = new CacheService(mgr as any);
    expect(await svc.get('clave')).toBeUndefined();
  });

  it('set llama al cache manager con ttl', async () => {
    const mgr = makeCacheManager();
    const svc = new CacheService(mgr as any);
    await svc.set('k', 'v', 300);
    expect(mgr.set).toHaveBeenCalledWith('k', 'v', 300);
  });

  it('set llama al cache manager sin ttl', async () => {
    const mgr = makeCacheManager();
    const svc = new CacheService(mgr as any);
    await svc.set('k', 'v');
    expect(mgr.set).toHaveBeenCalledWith('k', 'v');
  });

  it('del delega al cache manager', async () => {
    const mgr = makeCacheManager();
    const svc = new CacheService(mgr as any);
    await svc.del('clave');
    expect(mgr.del).toHaveBeenCalledWith('clave');
  });
});
