# Environment Variables Documentation

This file explains every variable in `.env.example`. Copy it to `.env` and fill in your values before running the project.

---

## Application Settings

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_NAME` | No | `NestJS App` | Display name used in email templates and logs |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test`. Controls DB sync, logging verbosity |
| `PORT` | No | `3000` | TCP port the HTTP server listens on |
| `IP_ADDRESS` | No | `0.0.0.0` | Network interface to bind to (`0.0.0.0` = all interfaces) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin(s). Use your frontend URL in production (e.g. `https://app.example.com`) |

**Example:**
```env
APP_NAME=My Awesome API
NODE_ENV=development
PORT=3000
IP_ADDRESS=0.0.0.0
CORS_ORIGIN=http://localhost:5173
```

---

## Database (MySQL)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | ✅ | — | MySQL server hostname or IP (e.g. `localhost` or `db.internal`) |
| `DB_PORT` | No | `3306` | MySQL server port |
| `DB_USER` | ✅ | — | MySQL username |
| `DB_PASS` | ✅ | — | MySQL password |
| `DB_NAME` | ✅ | — | MySQL database name (must be created beforehand) |

> ⚠️ `synchronize` (auto-create/alter tables) is enabled **only** in non-production environments. Always run proper migrations before going to production.

**Example:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=supersecret
DB_NAME=nestjs_db
```

---

## JWT Authentication

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Secret key used to sign JWTs. **Must be long and random** in production. |
| `JWT_EXPIRE_IN` | No | `7d` | Token expiry (e.g. `1h`, `7d`, `30d`). Uses [ms](https://github.com/vercel/ms) format |

> 🔐 Generate a secure secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

**Example:**
```env
JWT_SECRET=a8f3c2e1b9d4f7a0e5c8b1d6f3a9e2c5b8d1f4a7e0c3b6d9f2a5e8c1b4d7f0a3
JWT_EXPIRE_IN=7d
```

---

## Email (SMTP)

| Variable | Required | Default | Description |
|---|---|---|---|
| `EMAIL_HOST` | ✅ | — | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | No | `587` | SMTP port. `587` = STARTTLS, `465` = SSL |
| `EMAIL_USER` | ✅ | — | SMTP authentication username (usually your email) |
| `EMAIL_PASS` | ✅ | — | SMTP password or App Password |
| `EMAIL_FROM` | ✅ | — | The `From` address shown to recipients |

> 📧 **Gmail users:** Enable 2FA and create an [App Password](https://myaccount.google.com/apppasswords). Do not use your regular Gmail password.

**Example (Gmail):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=noreply@yourdomain.com
```

**Example (Mailgun):**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@mg.yourdomain.com
EMAIL_PASS=your_mailgun_smtp_password
EMAIL_FROM=hello@yourdomain.com
```

**Example (local dev with Mailhog):**
```env
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@localhost
```

---

## Super Admin (Seed)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPER_ADMIN_EMAIL` | No | — | Email for the pre-seeded super admin account |
| `SUPER_ADMIN_PASSWORD` | No | — | Password for the pre-seeded super admin account |

> Used by a seeder script (if implemented). Not consumed automatically by the app — add your seeding logic in a NestJS command or migration.

---

## Redis Cache *(optional)*

Redis is used by `RedisCacheModule` for in-memory caching with TTL and pattern-based invalidation.

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_HOST` | No | `localhost` | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |

> The `RedisCacheModule` is **not imported** in `AppModule` by default. Uncomment the import in `app.module.ts` to enable it.

**Example:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Kafka *(optional)*

Kafka is used for async event-driven messaging via `@nestjs/microservices`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `KAFKA_URL` | No | — | Kafka broker URL (e.g. `localhost:9092`) |
| `KAFKA_GROUP_ID` | No | `nestjs-consumer-group` | Kafka consumer group ID |

> The `KafkaModule` is **not imported** in `AppModule` by default. Uncomment the import in `app.module.ts` and call `connectKafkaMicroService(app)` in `main.ts` to enable it.

**Example:**
```env
KAFKA_URL=localhost:9092
KAFKA_GROUP_ID=my-app-consumers
```

---

## Full .env.example

```env
# Application
APP_NAME=NestJS App
NODE_ENV=development
PORT=3000
IP_ADDRESS=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password_here
DB_NAME=nestjs_db

# JWT
JWT_SECRET=change_this_to_a_long_random_secret_key
JWT_EXPIRE_IN=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=SuperSecureAdminPass123!

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka (optional)
KAFKA_URL=localhost:9092
KAFKA_GROUP_ID=nestjs-consumer-group
```
