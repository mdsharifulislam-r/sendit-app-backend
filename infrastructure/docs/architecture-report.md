# Sendit Backend — Architecture Report

## Project Overview
Sendit is a parcel-delivery marketplace backend. It is built as a **NestJS monorepo** using Webpack bundling. Seven independent Node.js processes are run simultaneously — each exposes its own HTTP server and Swagger UI. A custom **API Gateway** (port 3010) performs HTTP reverse-proxy and WebSocket upgrade proxying to route every incoming request to the correct downstream service based on URL path prefix.

---

## Microservices Inventory

| Service | Port Env Var | Default Port | Role |
|---------|-------------|--------------|------|
| **gateway** | `GATEWAY_PORT` | 3010 | HTTP/WS reverse proxy — the only public-facing service |
| **root** | `PORT` | 3000 | Auth, User, Address, Device, Transport Agreement |
| **trip** | `TRIP_SERVER_PORT` | 3001 | Trip CRUD, search (geospatial), reviews |
| **booking** | `BOOKING_PORT` | 3003 | Booking lifecycle, parcel pickup/delivery, QR codes |
| **communication** | `COMMUNICATION_PORT` | 3002 | Notifications, Chat, Messages, Reports, Disclaimers |
| **payment** | `PAYMENT_PORT` | 3004 | Stripe, Wallets, Transactions, Coupons, Pricing Rules |
| **admin** | `ADMIN_PORT` | 3005 | Admin dashboard, Audit Logs, Risk Settings, Tickets |

---

## Technology Stack Detected

### Database
- **MongoDB** via Mongoose (`@nestjs/mongoose` + `mongoose ^8.24.0`)
- Every microservice connects independently to the same MongoDB cluster via `DB_URI`
- Geospatial indexes used (2dsphere) on `departure_location` and `return_location`

### Cache
- **Redis** via `cache-manager-redis-yet` + direct `ioredis`/`redis` client
- Used for: trip search results, session caching, recent searches, device block flags, booking sessions
- Config: `REDIS_HOST`, `REDIS_PORT`

### Messaging
- **AWS SNS** — publish events (notifications, audit logs, risk items, booking events, emails)
- **AWS SQS** — long-poll consumer per service. Custom `SqsConsumerService` handles fan-out
- Pattern: SNS Topic → SQS Queue subscription. Services publish to SNS; services consume from SQS
- Queue URL: `SQS_QUEUE_URL` (+ optional per-service `BOOKING_SQS_QUEUE_URL`, etc.)
- Topic ARN: `SNS_TOPIC_ARN`

### File Storage
- **AWS S3** — file uploads (proof images, damage images, user avatars, KYC docs)
- Local disk (`/uploads`) used as staging area; file is uploaded to S3, local copy deleted
- Bucket: `AWS_BUCKET_NAME` (currently `sendit-test-s3-backet`), Region: `AWS_REGION` (`eu-north-1`)

### Authentication
- **JWT** via `@nestjs/jwt` + custom `AuthGuard`
- Custom `@Auth()` decorator with role-based access (`USER_ROLES`: ADMIN, TRAVELER, TRANSPORTER)
- Device management: blocked device detection stored in MongoDB + Redis cache

### WebSockets
- **Socket.io** via `@nestjs/websockets` and `@nestjs/platform-socket.io`
- Used in: communication service (chat/notifications), booking service (real-time status)
- Gateway proxies WebSocket upgrades to target service via `?service=<name>` query param

### Payment
- **Stripe** (`stripe ^22.1.1`) — direct payment, webhooks, wallet top-up
- Webhook secret: `STRIPE_WEBHOOK_SECRET`
- Payment service uses `rawBody: true` for Stripe webhook signature verification

### Email
- **Nodemailer** via SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`)
- Gmail SMTP configured

### Search (Optional)
- Elasticsearch client present (`@elastic/elasticsearch ^9.3.4`) but commented out
- URL: `ELASTICSEARCH_URL`

### AI (Optional)
- OpenAI SDK present (`openai ^6.34.0`) — `OPENAI_API_KEY`

### QR Codes
- `qrcode` library — used in booking for parcel QR generation

### Kafka (Disabled)
- `kafkajs` present but all Kafka modules are commented out

---

## Shared Utilities (`/utils`)

All services import from the shared `utils/` directory at build time (Webpack resolves path aliases):
- `utils/guards/` — `AuthGuard`, `RolesGuard`
- `utils/decorators/` — `@CurrentUser()`, `@FileUpload()`, `@GetFile()`
- `utils/helper-modules/cache/` — `RedisCacheModule`, `CacheService`
- `utils/helper-modules/sns/` — `SqsModule`, `SnsService`, `SqsConsumerService`
- `utils/helper-modules/upload/` — `UploadModule`, `S3Service`
- `utils/helper-modules/socket/` — `SocketModule`, `SocketGateway`, `SocketService`
- `utils/helper-modules/stripe/` — `StripeModule`, `StripeService`
- `utils/helper-modules/email/` — `EmailModule`, `EmailService`
- `utils/helper-modules/qr/` — `QrModule`
- `utils/errors/`, `utils/filters/`, `utils/inspectors/` — Global exception handling, interceptors
- `utils/queryBuilder/` — Reusable Mongoose query builder

---

## Service-to-Service Communication

All inter-service communication is **asynchronous via SNS/SQS**. There are no direct HTTP calls between services. Published event types include:
- `notification.send` — trip, booking events → communication service
- `audit.create` — actions → admin/audit service
- `risk.item.create` — trip weight checks → admin/risk service
- `email.*` — email jobs → communication/email consumer

---

## Port Assignments (Production)

| Service | Container Port |
|---------|----------------|
| gateway | 3010 |
| root | 3000 |
| trip | 3001 |
| communication | 3002 |
| booking | 3003 |
| payment | 3004 |
| admin | 3005 |

---

## Build System

- NestJS monorepo with Webpack (`"webpack": true` in nest-cli.json)
- Build command: `nest build <service-name>`
- Output: `dist/apps/<service-name>/main.js`
- Start command: `node dist/apps/<service-name>/main.js`
- TypeScript `baseUrl: "./"` allows `import from 'utils/...'` and `import from 'apps/...'`
- `tsconfig-paths` used for runtime path resolution

---

## AWS Region
- **eu-north-1** (Stockholm)

---

## Security Observations
- Secrets currently in `.env` plaintext → must be migrated to AWS Secrets Manager for production
- JWT secret must be rotated
- S3 bucket name has a typo (`backet` → `bucket`) — fix in production
- CORS set to `*` in development → restrict to frontend domain in production
