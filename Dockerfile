# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install OS-level build tools needed for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --only=production --legacy-peer-deps && cp -R node_modules node_modules_prod && \
  npm ci --legacy-peer-deps

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

RUN npx nest build ${SERVICE_NAME}

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nestjs && adduser -S nestjs -u 1001 -G nestjs

# Create uploads directory with correct ownership
RUN mkdir -p uploads && chown nestjs:nestjs uploads

# Only copy production node_modules and built dist
COPY --chown=nestjs:nestjs --from=deps /app/node_modules_prod ./node_modules
COPY --chown=nestjs:nestjs --from=builder /app/dist ./dist

USER nestjs

ARG SERVICE_NAME
ARG SERVICE_PORT=3000
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE_NAME}

EXPOSE ${SERVICE_PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${SERVICE_PORT}/health || exit 1

CMD ["sh", "-c", "node dist/apps/${SERVICE_NAME:-root}/main.js"]
