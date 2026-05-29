import { NotFoundException } from '@nestjs/common';
import { ShortcutService } from './shortcut.service';

const mockPrisma = () => ({
  respuestas_rapidas: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

const shortcut = (overrides = {}) => ({
  uuid: 'uuid-1',
  atajo: 'Test',
  texto: 'Hola',
  ...overrides,
});

describe('ShortcutService', () => {
  it('create delega a Prisma', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.create.mockResolvedValue(shortcut());
    const svc = new ShortcutService(prisma as any);
    const result = await svc.create({ atajo: 'Test', texto: 'Hola' } as any);
    expect(result.uuid).toBe('uuid-1');
  });

  it('findAll devuelve lista', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findMany.mockResolvedValue([shortcut()]);
    const svc = new ShortcutService(prisma as any);
    const result = await svc.findAll();
    expect(result).toHaveLength(1);
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findUnique.mockResolvedValue(null);
    const svc = new ShortcutService(prisma as any);
    await expect(svc.findOne('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('findOne devuelve el shortcut', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findUnique.mockResolvedValue(shortcut());
    const svc = new ShortcutService(prisma as any);
    const result = await svc.findOne('uuid-1');
    expect(result.atajo).toBe('Test');
  });

  it('update lanza NotFoundException si no existe', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findUnique.mockResolvedValue(null);
    const svc = new ShortcutService(prisma as any);
    await expect(svc.update('no-existe', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update devuelve el shortcut actualizado', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findUnique.mockResolvedValue(shortcut());
    prisma.respuestas_rapidas.update.mockResolvedValue(
      shortcut({ atajo: 'Nuevo' }),
    );
    const svc = new ShortcutService(prisma as any);
    const result = await svc.update('uuid-1', { atajo: 'Nuevo' } as any);
    expect(result.atajo).toBe('Nuevo');
  });

  it('remove lanza NotFoundException si no existe', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findUnique.mockResolvedValue(null);
    const svc = new ShortcutService(prisma as any);
    await expect(svc.remove('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('remove elimina y devuelve mensaje', async () => {
    const prisma = mockPrisma();
    prisma.respuestas_rapidas.findUnique.mockResolvedValue(shortcut());
    prisma.respuestas_rapidas.delete.mockResolvedValue(shortcut());
    const svc = new ShortcutService(prisma as any);
    const result = await svc.remove('uuid-1');
    expect(result.message).toContain('eliminada');
  });
});
