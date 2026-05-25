import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  thread_events: { findMany: jest.fn() },
  threads: { findMany: jest.fn() },
  meta_inbox_contacts: { findMany: jest.fn() },
  precios_planes: { findMany: jest.fn() },
  $queryRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
};

async function buildService(): Promise<ReportsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ReportsService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();
  return module.get(ReportsService);
}

describe('ReportsService', () => {
  let svc: ReportsService;

  beforeAll(async () => { svc = await buildService(); });
  beforeEach(() => jest.clearAllMocks());

  // ──────────────────────────────────────────────
  // catalogo()
  // ──────────────────────────────────────────────

  describe('catalogo()', () => {
    it('devuelve los 5 reportes disponibles', () => {
      const result = svc.catalogo();
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.id)).toEqual([
        'procesos', 'desempeno', 'procesos-semanales', 'precios-planes', 'clientes-info',
      ]);
    });

    it('cada reporte incluye id, nombre, formatos y filtros', () => {
      const result = svc.catalogo();
      result.forEach((r) => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('nombre');
        expect(r).toHaveProperty('formatos');
        expect(r).toHaveProperty('filtros');
      });
    });
  });

  // ──────────────────────────────────────────────
  // procesos()
  // ──────────────────────────────────────────────

  describe('procesos()', () => {
    const mockEvent = {
      id: 1,
      session_id: 'sess-001',
      actor_external_id: '56912345678',
      object_type: 'WHATSAPP',
      event_type: 'MESSAGE_INCOMING',
      event_source: 'META',
      direction: 'INBOUND',
      provider: 'META',
      source_channel: null,
      from_value: '56912345678',
      to_value: '56987654321',
      username: null,
      external_event_id: 'ext-001',
      message_external_id: 'msg-001',
      metadata: null,
      occurred_at: new Date('2024-01-15T10:00:00Z'),
    };

    beforeEach(() => {
      mockPrisma.thread_events.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.threads.findMany.mockResolvedValue([]);
      mockPrisma.meta_inbox_contacts.findMany.mockResolvedValue([]);
    });

    it('lanza BadRequestException cuando "desde" tiene formato inválido', async () => {
      await expect(svc.procesos({ desde: 'no-es-fecha' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException cuando "hasta" tiene formato inválido', async () => {
      await expect(svc.procesos({ hasta: 'invalida' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no lanza cuando "desde" y "hasta" están ausentes', async () => {
      await expect(svc.procesos({})).resolves.not.toThrow();
    });

    it('aplica filtro de session_id cuando se proporciona', async () => {
      await svc.procesos({ session_id: 'sess-001' });
      const whereArg = mockPrisma.thread_events.findMany.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('session_id', 'sess-001');
    });

    it('convierte object_type a mayúsculas en el filtro', async () => {
      await svc.procesos({ object_type: 'whatsapp' });
      const whereArg = mockPrisma.thread_events.findMany.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('object_type', 'WHATSAPP');
    });

    it('aplica rango de fechas cuando "desde" y "hasta" son válidas', async () => {
      await svc.procesos({ desde: '2024-01-01', hasta: '2024-01-31' });
      const whereArg = mockPrisma.thread_events.findMany.mock.calls[0][0].where;
      expect(whereArg.occurred_at).toHaveProperty('gte');
      expect(whereArg.occurred_at).toHaveProperty('lte');
    });

    it('devuelve formato json por defecto', async () => {
      const result = await svc.procesos({});
      expect(result.format).toBe('json');
    });

    it('devuelve formato csv cuando q.format=csv', async () => {
      const result = await svc.procesos({ format: 'csv' });
      expect(result.format).toBe('csv');
    });

    it('enriquece filas con datos de contacto cuando existe el contacto', async () => {
      mockPrisma.meta_inbox_contacts.findMany.mockResolvedValue([{
        actor_external_id: '56912345678',
        object_type: 'WHATSAPP',
        display_name: 'Juan Pérez',
        phone: '+56912345678',
      }]);

      const result = await svc.procesos({});
      expect(result.rows[0].actor_nombre).toBe('Juan Pérez');
      expect(result.rows[0].actor_fono).toBe('+56912345678');
    });

    it('usa "Nuevo" como actor_nombre cuando no hay contacto', async () => {
      const result = await svc.procesos({});
      expect(result.rows[0].actor_nombre).toBe('Nuevo');
    });

    it('enriquece filas con estado del thread cuando existe', async () => {
      mockPrisma.threads.findMany.mockResolvedValue([{
        session_id: 'sess-001',
        thread_status: 'open',
        attention_mode: 'bot',
        thread_stage: 'menu',
      }]);

      const result = await svc.procesos({});
      expect(result.rows[0].thread_status_actual).toBe('open');
      expect(result.rows[0].attention_mode_actual).toBe('bot');
    });

    it('devuelve occurred_at como ISO string', async () => {
      const result = await svc.procesos({});
      expect(result.rows[0].occurred_at).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  // ──────────────────────────────────────────────
  // desempeno()
  // ──────────────────────────────────────────────

  describe('desempeno()', () => {
    it('lanza BadRequestException cuando falta "desde"', async () => {
      await expect(svc.desempeno({ hasta: '2024-01-31' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException cuando falta "hasta"', async () => {
      await expect(svc.desempeno({ desde: '2024-01-01' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('llama a $queryRawUnsafe con fechas como primer y segundo parámetro', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.desempeno({ desde: '2024-01-01', hasta: '2024-01-31' });
      const params = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(params[1]).toBeInstanceOf(Date);
      expect(params[2]).toBeInstanceOf(Date);
    });

    it('agrega filtro de event_source cuando se proporciona', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.desempeno({ desde: '2024-01-01', hasta: '2024-01-31', event_source: 'n8n' });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('e.event_source =');
    });

    it('agrega filtro ILIKE de username cuando se proporciona', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.desempeno({ desde: '2024-01-01', hasta: '2024-01-31', username: 'jgarcia' });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('ILIKE');
    });

    it('devuelve formato csv cuando se solicita', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.desempeno({ desde: '2024-01-01', hasta: '2024-01-31', format: 'csv' });
      expect(result.format).toBe('csv');
    });
  });

  // ──────────────────────────────────────────────
  // procesosSemanales()
  // ──────────────────────────────────────────────

  describe('procesosSemanales()', () => {
    const rawRow = {
      semana_inicio: new Date('2024-01-15'),
      semana_fin: new Date('2024-01-21'),
      total_eventos: BigInt(42),
      threads_creados: BigInt(5),
      mensajes_entrantes: BigInt(20),
      mensajes_salientes: BigInt(17),
      threads_distintos: BigInt(8),
    };

    it('lanza BadRequestException cuando faltan "desde" y "hasta"', async () => {
      await expect(svc.procesosSemanales({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('convierte BigInt a número en las filas de resultado', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([rawRow]);
      const result = await svc.procesosSemanales({ desde: '2024-01-01', hasta: '2024-01-31' });
      expect(typeof result.rows[0].total_eventos).toBe('number');
      expect(result.rows[0].total_eventos).toBe(42);
      expect(result.rows[0].threads_distintos).toBe(8);
    });

    it('convierte fechas Date a string YYYY-MM-DD', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([rawRow]);
      const result = await svc.procesosSemanales({ desde: '2024-01-01', hasta: '2024-01-31' });
      expect(result.rows[0].semana_inicio).toBe('2024-01-15');
      expect(result.rows[0].semana_fin).toBe('2024-01-21');
    });

    it('preserva valores no-Date en semana_inicio/semana_fin', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ ...rawRow, semana_inicio: '2024-01-15', semana_fin: '2024-01-21' }]);
      const result = await svc.procesosSemanales({ desde: '2024-01-01', hasta: '2024-01-31' });
      expect(result.rows[0].semana_inicio).toBe('2024-01-15');
    });
  });

  // ──────────────────────────────────────────────
  // preciosPlanes()
  // ──────────────────────────────────────────────

  describe('preciosPlanes()', () => {
    const mockPlan = {
      codigo: 'PLN-50',
      nombre: 'Plan 50GB',
      tipo: 'individual',
      descripcion: 'Plan básico',
      lineas: 1,
      precio_base: '9990.00',
      precio_normal: null,
      excluye_alta: false,
      excluye_portabilidad_postpago: true,
      url_archivo: null,
    };

    it('devuelve filas con precio_base convertido a número', async () => {
      mockPrisma.precios_planes.findMany.mockResolvedValue([mockPlan]);
      const result = await svc.preciosPlanes({});
      expect(typeof result.rows[0].precio_base).toBe('number');
      expect(result.rows[0].precio_base).toBe(9990);
    });

    it('aplica filtro de codigo cuando se proporciona', async () => {
      mockPrisma.precios_planes.findMany.mockResolvedValue([]);
      await svc.preciosPlanes({ codigo: 'PLN-50' });
      const whereArg = mockPrisma.precios_planes.findMany.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('codigo', 'PLN-50');
    });

    it('aplica búsqueda insensible a mayúsculas para nombre', async () => {
      mockPrisma.precios_planes.findMany.mockResolvedValue([]);
      await svc.preciosPlanes({ nombre: 'básico' });
      const whereArg = mockPrisma.precios_planes.findMany.mock.calls[0][0].where;
      expect(whereArg.nombre).toHaveProperty('mode', 'insensitive');
    });

    it('devuelve precio_base null cuando el registro no tiene precio', async () => {
      mockPrisma.precios_planes.findMany.mockResolvedValue([{ ...mockPlan, precio_base: null }]);
      const result = await svc.preciosPlanes({});
      expect(result.rows[0].precio_base).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // clientesInfo()
  // ──────────────────────────────────────────────

  describe('clientesInfo()', () => {
    const mockContacto = {
      id: 1,
      actor_external_id: '56912345678',
      object_type: 'WHATSAPP',
      rut: '12345678-9',
      display_name: 'Ana Martínez',
      first_name: 'Ana',
      last_name: 'Martínez',
      email: 'ana@example.com',
      address: 'Calle 1',
      city: 'Santiago',
      region: 'RM',
      phone: '+56912345678',
      notes: null,
      metadata: null,
      created_at: new Date('2024-01-10T09:00:00Z'),
      updated_at: new Date('2024-01-15T12:00:00Z'),
    };

    it('lanza BadRequestException cuando "desde" tiene formato inválido', async () => {
      await expect(svc.clientesInfo({ desde: 'mala-fecha' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no lanza cuando los filtros de fecha están ausentes', async () => {
      mockPrisma.meta_inbox_contacts.findMany.mockResolvedValue([]);
      await expect(svc.clientesInfo({})).resolves.not.toThrow();
    });

    it('convierte object_type a mayúsculas en el filtro', async () => {
      mockPrisma.meta_inbox_contacts.findMany.mockResolvedValue([]);
      await svc.clientesInfo({ object_type: 'whatsapp' });
      const whereArg = mockPrisma.meta_inbox_contacts.findMany.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('object_type', 'WHATSAPP');
    });

    it('aplica filtro de rut cuando se proporciona', async () => {
      mockPrisma.meta_inbox_contacts.findMany.mockResolvedValue([]);
      await svc.clientesInfo({ rut: '12345678-9' });
      const whereArg = mockPrisma.meta_inbox_contacts.findMany.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('rut', '12345678-9');
    });

    it('mapea los campos del contacto al formato de reporte', async () => {
      mockPrisma.meta_inbox_contacts.findMany.mockResolvedValue([mockContacto]);
      const result = await svc.clientesInfo({});
      const row = result.rows[0];
      expect(row.nombre).toBe('Ana Martínez');
      expect(row.fono).toBe('+56912345678');
      expect(row.comuna).toBe('Santiago');
      expect(row.fecha_registro).toBe('2024-01-10T09:00:00.000Z');
    });
  });

  // ──────────────────────────────────────────────
  // formatResponse()
  // ──────────────────────────────────────────────

  describe('formatResponse()', () => {
    const jsonResult = { format: 'json' as const, filename: 'reporte_test', rows: [{ id: 1, nombre: 'X' }] };
    const csvResult = { format: 'csv' as const, filename: 'reporte_test', rows: [{ id: 1, nombre: 'X' }] };

    it('devuelve body JSON con report, total y rows para formato json', () => {
      const response = svc.formatResponse(jsonResult);
      expect(response.headers).toBeUndefined();
      expect(response.body).toEqual({ report: 'reporte_test', total: 1, rows: [{ id: 1, nombre: 'X' }] });
    });

    it('devuelve headers CSV y body string para formato csv', () => {
      const response = svc.formatResponse(csvResult);
      expect(response.headers?.['Content-Type']).toBe('text/csv; charset=utf-8');
      expect(response.headers?.['Content-Disposition']).toContain('reporte_test.csv');
      expect(typeof response.body).toBe('string');
      expect(response.body).toContain('id');
      expect(response.body).toContain('nombre');
    });

    it('genera CSV con cabeceras en la primera línea', () => {
      const response = svc.formatResponse(csvResult);
      const lines = (response.body as string).split('\n');
      expect(lines[0]).toBe('id,nombre');
    });

    it('genera CSV vacío cuando rows es array vacío', () => {
      const response = svc.formatResponse({ format: 'csv', filename: 'vacio', rows: [] });
      expect(response.body).toBe('');
    });

    it('escapa comillas dobles en valores de CSV', () => {
      const response = svc.formatResponse({
        format: 'csv',
        filename: 'test',
        rows: [{ texto: 'valor con "comillas"' }],
      });
      expect(response.body).toContain('""comillas""');
    });

    it('convierte Date a ISO string en CSV', () => {
      const fecha = new Date('2024-01-15T10:00:00Z');
      const response = svc.formatResponse({
        format: 'csv',
        filename: 'test',
        rows: [{ fecha }],
      });
      expect(response.body).toContain('2024-01-15T10:00:00.000Z');
    });

    it('serializa objetos anidados como JSON con comillas CSV-escapadas', () => {
      const response = svc.formatResponse({
        format: 'csv',
        filename: 'test',
        rows: [{ meta: { key: 'val' } }],
      });
      // csvEscape serializa a JSON y escapa " con "" (estilo CSV)
      expect(response.body).toContain('"{""key"":""val""}"');
    });

    it('genera columnas con unión de claves cuando las filas tienen campos distintos', () => {
      const response = svc.formatResponse({
        format: 'csv',
        filename: 'test',
        rows: [{ a: 1 }, { b: 2 }],
      });
      const header = (response.body as string).split('\n')[0];
      expect(header).toContain('a');
      expect(header).toContain('b');
    });
  });
});
