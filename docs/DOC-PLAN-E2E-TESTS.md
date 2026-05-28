# Plan E2E Tests — api-backend-nest

**Estado:** Pendiente de implementación  
**Prioridad:** Media (calidad — identificado en homologación 2026-05-28)  
**Problema actual:** El único E2E en `test/app.e2e-spec.ts` es un placeholder que espera `Hello World!` en `/` y no cubre ningún flujo real.

---

## Contexto técnico

### Por qué los E2E son distintos a los unit tests actuales

Los 92 tests unitarios están todos mockeados — no ejercitan la pila real (ValidationPipe, guards JWT, PrismaService con DB real). Un E2E usa `supertest` contra la app arrancada con módulos reales, por lo que atrapa regresiones que los mocks no detectan:
- Un guard JWT que dejó de funcionar
- Un DTO con un campo sin `@IsString()` que pasa igual
- Una query Prisma que rompe con el schema actual

### Restricción principal: Vault

`PanelJwtAuthGuard` → `AuthService.verificarToken()` → `VaultService.getSecretKey()` → conexión a Vault.  
En CI no hay Vault. La solución es **sobrescribir el token `VAULT_GATEWAY`** en el módulo de test con un mock que devuelve un par de claves RSA generado en memoria.

### DB de CI

Ya configurada en el workflow: `postgresql://ci:ci@localhost:5432/ci`.  
La variable `DATABASE_URL` se pasa como env al job `ci` en `.github/workflows/ci-cd-agora.yml:18`.

---

## Etapas

### Etapa 1 — Infraestructura (esfuerzo: bajo)

**Archivos a crear:**

#### `test/helpers/test-app.factory.ts`
Helper que arranca la app NestJS con un mock del `VAULT_GATEWAY`. Genera un par RSA en memoria al arrancar y lo expone para que los tests puedan firmar tokens.

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { VAULT_GATEWAY } from '../src/auth/interfaces/vault-gateway.interface';
import * as crypto from 'crypto';

export interface TestAppContext {
  app: INestApplication;
  signToken: (payload: object, expiresIn?: string) => string;
}

export async function createTestApp(): Promise<TestAppContext> {
  // Generar par RSA de test en memoria
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const vaultMock = {
    getSecretKey: async (path: string) => {
      // devolver private key para paths de firma, public key para verificación
      if (path.includes('private')) return privateKey;
      return publicKey;
    },
    getSecretField: async () => '',
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(VAULT_GATEWAY)
    .useValue(vaultMock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  await app.init();

  const jwt = await import('jsonwebtoken');
  const signToken = (payload: object, expiresIn = '1h') =>
    jwt.default.sign(payload, privateKey, { algorithm: 'RS256', expiresIn } as any);

  return { app, signToken };
}
```

#### `package.json` — agregar script

```json
"test:e2e": "jest --config test/jest-e2e.json",
```

#### `test/jest-e2e.json` — agregar paths alias y timeout

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testTimeout": 30000,
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

**Definición de hecho:** `npm run test:e2e` corre sin errores (aunque los specs estén vacíos).

---

### Etapa 2 — Tests de autenticación (esfuerzo: bajo)

**Archivo:** `test/auth-guard.e2e-spec.ts`

Escenarios a cubrir:

```
GET /sales-record
  sin Authorization header       → 401 { error: 'UnauthorizedException' }
  con token malformado           → 401
  con token firmado con otra key → 401
  con JWT válido de test         → 200 (array)

GET /sales-record?year=2026&month=5
  con JWT válido                 → 200 (array, puede estar vacío)
```

**Payload mínimo del JWT de panel:**
```typescript
const payload = { id: 1, rol: 'superadmin', permisos: [] };
const token = signToken(payload);
```

**Definición de hecho:** 5 tests pasando, CI verde con `npm run test:e2e`.

---

### Etapa 3 — Flujo CRUD sales-record (esfuerzo: medio)

**Archivo:** `test/sales-record.e2e-spec.ts`

Prerrequisito: que `offers` y `price_level` tengan datos en la DB de CI.  
Solución: insertar seed data en `beforeAll` y limpiarlo en `afterAll`.

Escenarios a cubrir:

```
POST /sales-record/catalog
  crea oferta válida             → 201 { id, code, modality, level, points }
  duplicado code+modality        → 409 ConflictException

GET /sales-record/catalog
  devuelve array con la oferta   → 200

POST /sales-record/price-matrix
  crea precio para level/range   → 201

POST /sales-record
  registra venta válida          → 201 { id, offers_price calculado }
  oferta inexistente             → 404

GET /sales-record?year=2026&month=5
  devuelve la venta creada       → 200 array.length >= 1

DELETE /sales-record/:id
  elimina la venta               → 200 { ok: true }
  id inexistente                 → 404
```

**Definición de hecho:** 10 tests pasando, DB limpia después de cada run.

---

### Etapa 4 — Coverage threshold (esfuerzo: bajo)

**Archivo:** `package.json` en bloque `"jest"`

```json
"coverageThreshold": {
  "global": {
    "lines": 70,
    "functions": 70
  }
}
```

**Definición de hecho:** `npm run test:cov` falla si cobertura baja de 70%.

---

### Etapa 5 — Integrar E2E en CI (esfuerzo: bajo)

Agregar paso en `.github/workflows/ci-cd-agora.yml` después del step `Tests`:

```yaml
- name: Tests E2E
  run: npm run test:e2e
  env:
    DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"
```

**Prerequisito:** La DB CI debe tener el schema aplicado. Agregar antes:
```yaml
- name: Aplicar schema en CI DB
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"
```

**Definición de hecho:** CI corre unit tests + E2E + coverage check en cada push.

---

## Orden recomendado de implementación

```
Etapa 1 → Etapa 2 → Etapa 4 → Etapa 3 → Etapa 5
```

La Etapa 4 (threshold) va antes de la 3 porque fuerza a revisar la cobertura antes de agregar más código de test. La Etapa 5 (CI) va al final para no bloquear el pipeline mientras los specs se construyen.

---

## Cómo retomar este trabajo en una nueva sesión

1. Leer este archivo para contexto
2. Verificar estado actual: `npx jest --testPathPattern="e2e" 2>&1 | tail -10`
3. Ver qué etapa está pendiente (los archivos de cada etapa están detallados arriba)
4. Implementar la siguiente etapa y correr `npm run test:e2e` para validar

**Archivos clave a leer antes de implementar:**
- `src/auth/interfaces/vault-gateway.interface.ts` — interface a mockear
- `src/auth/panel-jwt-auth.guard.ts` — guard que se está testeando
- `src/sales-record/sales-record.controller.ts` — endpoints del flujo CRUD
- `.github/workflows/ci-cd-agora.yml` — donde agregar el step de E2E
