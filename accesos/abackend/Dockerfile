# Etapa 1: Build y generación
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

# Genera cliente Prisma
RUN DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma generate
RUN npm run build

# Etapa 2: Producción
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copia código generado y schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Regenera el cliente para runtime
RUN DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma generate

EXPOSE 4002

CMD ["node", "dist/index.js"]
