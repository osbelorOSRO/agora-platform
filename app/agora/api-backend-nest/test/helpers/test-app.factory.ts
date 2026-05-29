import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { VAULT_GATEWAY } from '../../src/auth/interfaces/vault-gateway.interface';
import { AuthModule } from '../../src/auth/auth.module';
import { CacheService } from '../../src/cache/cache.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { HttpExceptionFilter } from '../../src/core/filters/http-exception.filter';
import { SalesRecordModule } from '../../src/sales-record/sales-record.module';
import { APP_FILTER } from '@nestjs/core';

// Env vars requeridos por constructores de servicios
const E2E_ENV: Record<string, string> = {
  VAULT_ROLE_ID: 'test-role-id',
  VAULT_SECRET_ID: 'test-secret-id',
};
for (const [k, v] of Object.entries(E2E_ENV)) {
  process.env[k] = process.env[k] || v;
}

// CacheService en memoria — sin conexión Redis
class InMemoryCacheService {
  private store = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    SalesRecordModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
class TestAppModule {}

export interface TestAppContext {
  app: INestApplication;
  signToken: (payload: object, expiresIn?: string) => string;
  close: () => Promise<void>;
}

let cached: TestAppContext | null = null;

export async function createTestApp(): Promise<TestAppContext> {
  if (cached) return cached;

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const vaultMock = {
    getSecretKey: async (path: string) => {
      if (path.includes('private')) return privateKey;
      return publicKey;
    },
    getSecretField: async () => '',
  };

  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule],
  })
    .overrideProvider(VAULT_GATEWAY)
    .useValue(vaultMock)
    .overrideProvider(CacheService)
    .useValue(new InMemoryCacheService())
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  const ALL_PERMISOS = [
    'gestion_ventas',
    'ver_reportes',
    'editar_configuracion',
    'gestion_integraciones',
    'gestion_conexiones',
    'gestionar_usuarios',
    'vista_bot',
    'control_bot',
    'control_agenda',
  ];

  const signToken = (payload: Record<string, unknown>, expiresIn = '1h') => {
    const merged = { permisos: ALL_PERMISOS, ...payload };
    return jwt.sign(merged, privateKey, {
      algorithm: 'RS256',
      expiresIn,
    } as jwt.SignOptions);
  };

  cached = {
    app,
    signToken,
    close: async () => {
      await app.close();
      cached = null;
    },
  };

  return cached;
}
