import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app.factory';

describe('Auth Guard (e2e)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('GET /sales-record', () => {
    it('sin Authorization header → 401', async () => {
      await request(ctx.app.getHttpServer())
        .get('/sales-record')
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
        });
    });

    it('con header malformado (sin Bearer) → 401', async () => {
      await request(ctx.app.getHttpServer())
        .get('/sales-record')
        .set('Authorization', 'Token abc123')
        .expect(401);
    });

    it('con token firmado con otra clave → 401', async () => {
      const jwt = await import('jsonwebtoken');
      const fakeToken = jwt.default.sign(
        { id: 1, rol: 'superadmin' },
        'clave-equivocada',
        { algorithm: 'HS256' },
      );
      await request(ctx.app.getHttpServer())
        .get('/sales-record')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });

    it('con JWT válido de test → 200', async () => {
      const token = ctx.signToken({
        id: 1,
        rol: 'superadmin',
        permisos: [
          'gestion_ventas',
          'ver_reportes',
          'editar_configuracion',
          'gestion_integraciones',
          'gestion_conexiones',
        ],
      });
      await request(ctx.app.getHttpServer())
        .get('/sales-record')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('con JWT válido y filtro de mes → 200', async () => {
      const token = ctx.signToken({
        id: 1,
        rol: 'superadmin',
        permisos: [
          'gestion_ventas',
          'ver_reportes',
          'editar_configuracion',
          'gestion_integraciones',
          'gestion_conexiones',
        ],
      });
      await request(ctx.app.getHttpServer())
        .get('/sales-record?year=2026&month=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
