<div align="center">

# 🚀 NestJS Backend Template

A **production-ready** NestJS backend template with authentication, user management, file uploads, email, WebSockets, Redis caching, and Kafka support — all wired up and ready to go.

![NestJS](https://img.shields.io/badge/NestJS-v11-red?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue?logo=typescript)
![TypeORM](https://img.shields.io/badge/TypeORM-v0.3-orange)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [API Overview](#-api-overview)
- [Developer Guide](#-developer-guide)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

This template provides a solid, scalable foundation for building RESTful APIs with NestJS. It follows **clean architecture** principles and NestJS best practices — so you can focus on your business logic from day one.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 **JWT Authentication** | Login, register, OTP email verification, forgot/reset/change password |
| 👤 **User Management** | Profile CRUD, role-based access (USER / ADMIN / SUPER_ADMIN) |
| 📁 **File Uploads** | Multer-based, auto-folder creation, MIME validation, size limits |
| 📧 **Email Service** | Nodemailer SMTP with HTML templates (OTP, welcome, password reset) |
| 🌐 **WebSockets** | Socket.IO gateway — broadcast, room, user-targeted events |
| 🗄️ **Redis Cache** | Cache-manager + ioredis with pattern-based invalidation |
| 📨 **Kafka** | Producer + consumer scaffolding via `@nestjs/microservices` |
| 📖 **Swagger Docs** | Auto-generated at `/docs` with Bearer auth support |
| 🛡️ **Global Exception Filter** | Consistent JSON error responses across all endpoints |
| ✅ **Validation Pipes** | `class-validator` with structured error messages |
| 📊 **Query Builder** | Pagination, search, filter, sort, field selection out of the box |
| 🪵 **Structured Logging** | NestJS `Logger` across all services and interceptors |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [NestJS v11](https://nestjs.com) |
| **Language** | TypeScript v5 |
| **Database** | MySQL 8 via [TypeORM](https://typeorm.io) |
| **Auth** | JSON Web Tokens (`@nestjs/jwt`) |
| **Validation** | `class-validator` + `class-transformer` |
| **File Upload** | Multer (`@nestjs/platform-express`) |
| **Email** | Nodemailer |
| **Cache** | Redis + `@nestjs/cache-manager` |
| **WebSocket** | Socket.IO (`@nestjs/websockets`) |
| **Messaging** | Kafka (`kafkajs` + `@nestjs/microservices`) |
| **Docs** | Swagger / OpenAPI (`@nestjs/swagger`) |
| **Static Files** | `@nestjs/serve-static` |

---

## 📁 Project Structure

```
src/
├── auth/                        # Authentication module
│   ├── auth.controller.ts       # Login, OTP, forgot/reset/change password
│   ├── auth.service.ts
│   ├── auth.dto.ts
│   └── auth.module.ts
│
├── user/                        # User module
│   ├── user.controller.ts       # Register, profile, update, list users
│   ├── user.service.ts
│   ├── user.dto.ts
│   ├── user.entity.ts           # User + ResetToken TypeORM entities
│   └── user.module.ts
│
├── email/                       # Email module (global)
│   ├── email.service.ts         # Nodemailer SMTP wrapper
│   ├── email.interface.ts
│   └── email.module.ts
│
├── utils/                       # Shared utilities
│   ├── config/
│   │   └── config.ts            # Typed env config object
│   ├── decorators/
│   │   ├── user.decorator.ts    # @CurrentUser()
│   │   ├── get-file.decorator.ts # @GetFile('field')
│   │   └── file-uploader.decorator.ts # @FileUpload(options)
│   ├── enums/
│   │   └── user.ts              # USER_ROLES enum
│   ├── errors/
│   │   ├── api-error.ts         # Custom HttpException with auto-logging
│   │   └── validator-error.ts   # ValidationPipe exceptionFactory
│   ├── filters/
│   │   └── global-exception.filter.ts # Catches all unhandled errors
│   ├── guards/
│   │   ├── auth.guard.ts        # JWT guard + @Auth() decorator
│   │   └── roles.guard.ts       # @Roles() metadata setter
│   ├── helper/
│   │   ├── bycrptHelper.ts      # hashPassword / comparePassword
│   │   ├── cleanObject.ts       # Remove empty/null values from object
│   │   ├── connectKafkaRoot.ts  # Kafka microservice bootstrap helper
│   │   ├── cryptoToken.ts       # Secure random hex token
│   │   ├── generateOtp.ts       # Secure 4-digit OTP
│   │   ├── nomaliseFiles.ts     # Convert multer paths to public URLs
│   │   └── sendResponse.ts      # Typed response builder
│   ├── helper-modules/
│   │   ├── cache/               # Redis cache module + service
│   │   ├── kafka/               # Kafka producer + consumer
│   │   └── socket/              # Socket.IO gateway + service
│   ├── inspectors/
│   │   ├── logger.inspector.ts  # HTTP request/response logging interceptor
│   │   └── response.interceptor.ts # Normalise all responses
│   ├── queryBuilder/
│   │   └── queryBuilder.ts      # Fluent TypeORM query builder
│   ├── shared/
│   │   └── emailTemplate.ts     # HTML email templates
│   └── types/
│       └── emailTemplate.ts     # Email template interfaces
│
├── app.controller.ts            # Root + health check
├── app.module.ts                # Root module
├── app.service.ts
└── main.ts                      # Bootstrap (CORS, pipes, Swagger)

uploads/                         # Served at /uploads/* (auto-created)
test/                            # E2E tests
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js >= 18
- MySQL 8+
- (Optional) Redis, Kafka

### 1. Clone and install

```bash
git clone <your-repo-url>
cd nest-js-backend-template
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start the server

```bash
npm run start:dev
```

Visit:
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/health`

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your values. See [`ENV_DOCUMENTATION.md`](./ENV_DOCUMENTATION.md) for a full explanation of every variable.

**Minimum required variables:**

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_db_password
DB_NAME=nestjs_db

JWT_SECRET=your_long_random_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com
```

---

## ▶️ Running the Project

| Command | Description |
|---|---|
| `npm run start:dev` | Development mode with hot-reload |
| `npm run start:debug` | Debug mode (attach a debugger) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Production mode (runs compiled `dist/main.js`) |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:cov` | Unit tests with coverage report |
| `npm run test:e2e` | End-to-end tests |

---

## 📡 API Overview

All endpoints are prefixed with `/api/v1`. Full interactive docs at `/docs`.

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | ❌ | Login and receive JWT |
| POST | `/api/v1/auth/verify-otp` | ❌ | Verify email with OTP |
| POST | `/api/v1/auth/forgot-password` | ❌ | Request password reset OTP |
| POST | `/api/v1/auth/reset-password` | Token† | Reset password using reset token |
| POST | `/api/v1/auth/change-password` | ✅ JWT | Change password (logged-in users) |

> † Reset token is the value returned by `verify-otp` when `isResetPassword=true`. Pass it in the `Authorization` header (without "Bearer").

### User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/user/register` | ❌ | Register a new user |
| GET | `/api/v1/user/profile` | ✅ JWT | Get current user profile |
| PATCH | `/api/v1/user/profile` | ✅ JWT | Update profile + image upload |
| GET | `/api/v1/user/all` | ✅ Admin | List all users (paginated) |

### Query Parameters (for list endpoints)

| Param | Example | Description |
|---|---|---|
| `page` | `?page=2` | Page number (default: 1) |
| `limit` | `?limit=20` | Items per page (default: 10, max: 100) |
| `searchTerm` | `?searchTerm=john` | Search name or email |
| `sort` | `?sort=-createdAt` | Sort field; prefix `-` for DESC |

### Other Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Welcome message |
| GET | `/health` | Server health + uptime |
| GET | `/docs` | Swagger UI |

---

## 👨‍💻 Developer Guide

See [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) for:
- Step-by-step local setup
- How to add a new module/feature
- How to test with Postman or Swagger
- Request lifecycle explanation
- Common troubleshooting tips
