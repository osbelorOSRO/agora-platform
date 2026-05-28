import { createTestApp } from './helpers/test-app.factory';

describe('Bootstrap (e2e)', () => {
  it('la app arranca sin errores', async () => {
    const { app } = await createTestApp();
    expect(app).toBeDefined();
  });
});
