# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install OS-level build tools + canvas native dependencies (face-api.js)
RUN apk add --no-cache \
  python3 make g++ pkgconfig \
  cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev \
  musl-dev freetype-dev

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

# ca-certificates + DocumentDB/RDS TLS bundle + canvas runtime libs
RUN apk add --no-cache ca-certificates wget \
  cairo pango jpeg giflib pixman freetype

RUN addgroup -g 1001 -S nestjs && adduser -S nestjs -u 1001 -G nestjs

RUN mkdir -p uploads /app/certs && \
    wget -qO /app/certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && \
    chown -R nestjs:nestjs uploads /app/certs

# Only copy production node_modules, face-api models, and built dist
COPY --chown=nestjs:nestjs --from=deps /app/node_modules_prod ./node_modules
COPY --chown=nestjs:nestjs --from=builder /app/models ./models
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
