import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app.factory';

describe('Sales Record CRUD (e2e)', () => {
  let ctx: TestAppContext;
  let token: string;
  let ofertaId: number;
  let precioId: number;
  let ventaId: number;

  beforeAll(async () => {
    ctx = await createTestApp();
    token = ctx.signToken({
      id: 1,
      rol: 'superadmin',
      permisos: ['gestion_ventas'],
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  // ─── Catálogo ──────────────────────────────────────────────────────────────

  describe('POST /sales-record/catalog', () => {
    it('crea una oferta válida → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/sales-record/catalog')
        .set(auth())
        .send({ code: 'E2E1', modality: 'ALTA', level: 5, points: 0.5 })
        .expect(201);

      expect(res.body).toMatchObject({
        code: 'E2E1',
        modality: 'ALTA',
        level: 5,
      });
      ofertaId = res.body.id;
    });

    it('duplicado code+modality → 409', async () => {
      await request(ctx.app.getHttpServer())
        .post('/sales-record/catalog')
        .set(auth())
        .send({ code: 'E2E1', modality: 'ALTA', level: 5, points: 0.5 })
        .expect(409);
    });
  });

  describe('GET /sales-record/catalog', () => {
    it('devuelve array con la oferta creada → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/sales-record/catalog')
        .set(auth())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((o: { id: number }) => o.id === ofertaId)).toBe(
        true,
      );
    });
  });

  // ─── Matriz de precios ─────────────────────────────────────────────────────

  describe('POST /sales-record/price-matrix', () => {
    it('crea precio para level/range → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/sales-record/price-matrix')
        .set(auth())
        .send({ level: 1, range: 1, price: 9999 })
        .expect(201);

      expect(res.body).toMatchObject({ level: 1, range: 1, price: 9999 });
      precioId = res.body.id;
    });

    it('duplicado level+range → 409', async () => {
      await request(ctx.app.getHttpServer())
        .post('/sales-record/price-matrix')
        .set(auth())
        .send({ level: 1, range: 1, price: 9999 })
        .expect(409);
    });
  });

  // ─── Ventas ────────────────────────────────────────────────────────────────

  describe('POST /sales-record', () => {
    it('registra venta válida con precio calculado → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/sales-record')
        .set(auth())
        .send({
          fecha: '2026-05-01',
          run: '12345678-9',
          full_name: 'Test E2E User',
          phone: '912345678',
          address: 'Calle Test 123',
          city: 'Santiago',
          province: 'Santiago',
          country: 'Chile',
          contract_number: 'E2E-001',
          modality: 'ALTA',
          offers_code: 'E2E1',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        run: '12345678-9',
        modality: 'ALTA',
        offers_code: 'E2E1',
        offers_price: 1900,
      });
      ventaId = res.body.id;
    });

    it('oferta inexistente → 404', async () => {
      await request(ctx.app.getHttpServer())
        .post('/sales-record')
        .set(auth())
        .send({
          fecha: '2026-05-01',
          run: '12345678-9',
          full_name: 'Test User',
          phone: '912345678',
          address: 'Calle Test 123',
          city: 'Santiago',
          province: 'Santiago',
          country: 'Chile',
          contract_number: 'E2E-002',
          modality: 'SALTA',
          offers_code: 'NOEXISTE',
        })
        .expect(404);
    });
  });

  describe('GET /sales-record', () => {
    it('devuelve la venta del mes → 200 con al menos 1 registro', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/sales-record?year=2026&month=5')
        .set(auth())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((v: { id: number }) => v.id === ventaId)).toBe(true);
    });
  });

  describe('DELETE /sales-record/:id', () => {
    it('elimina la venta creada → 200 { ok: true }', async () => {
      const res = await request(ctx.app.getHttpServer())
        .delete(`/sales-record/${ventaId}`)
        .set(auth())
        .expect(200);

      expect(res.body).toEqual({ ok: true, id: ventaId });
    });

    it('id inexistente → 404', async () => {
      await request(ctx.app.getHttpServer())
        .delete('/sales-record/999999')
        .set(auth())
        .expect(404);
    });
  });

  // ─── Limpieza ──────────────────────────────────────────────────────────────

  describe('Limpieza de datos de test', () => {
    it('elimina el precio creado → 200', async () => {
      if (!precioId) return;
      await request(ctx.app.getHttpServer())
        .delete(`/sales-record/price-matrix/${precioId}`)
        .set(auth())
        .expect(200);
    });

    it('elimina la oferta creada → 200', async () => {
      if (!ofertaId) return;
      await request(ctx.app.getHttpServer())
        .delete(`/sales-record/catalog/${ofertaId}`)
        .set(auth())
        .expect(200);
    });
  });
});
