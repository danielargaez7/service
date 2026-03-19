# ── Stage 1: Build everything ────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=apps/backend-api/prisma/schema.prisma

# Build backend API
RUN npx nx build backend-api --configuration=production --skip-nx-cache

# Build manager dashboard (ignore budget warnings)
RUN npx nx build manager-dashboard --configuration=production --skip-nx-cache 2>&1 || true

# Build driver app (ignore budget warnings)
RUN npx nx build driver-app --configuration=production --skip-nx-cache 2>&1 || true

# ── Stage 2: Production image ───────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema + generated client
COPY --from=builder /app/apps/backend-api/prisma ./apps/backend-api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built API
COPY --from=builder /app/dist/apps/backend-api ./dist/apps/backend-api

# Copy built frontends
COPY --from=builder /app/dist/apps/manager-dashboard/browser ./public/dashboard
COPY --from=builder /app/dist/apps/driver-app/browser ./public/driver

# Create uploads directory
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "dist/apps/backend-api/main.js"]
