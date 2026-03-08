# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias (incluye devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar SOLO dependencias de producción
RUN npm ci --omit=dev

# Copiar el código compilado desde el builder
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 5050

# Usuario no-root por seguridad
USER node

# Comando de producción
CMD ["node", "dist/index.js"]
