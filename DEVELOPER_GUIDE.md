# Developer Guide

A practical, beginner-friendly guide to setting up, running, extending, and troubleshooting this NestJS backend.

---

## Table of Contents

1. [Local Setup — Step by Step](#1-local-setup--step-by-step)
2. [Running the Server](#2-running-the-server)
3. [Testing APIs](#3-testing-apis)
4. [How to Add a New Module / Feature](#4-how-to-add-a-new-module--feature)
5. [Request Lifecycle](#5-request-lifecycle)
6. [Common Troubleshooting](#6-common-troubleshooting)

---

## 1. Local Setup — Step by Step

### Step 1 — Install prerequisites

Make sure you have the following installed:

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 18 | `node -v` |
| npm | >= 9 | `npm -v` |
| MySQL | >= 8 | `mysql --version` |
| Git | any | `git --version` |

### Step 2 — Get the code

```bash
git clone <your-repo-url>
cd nest-js-backend-template
```

### Step 3 — Install dependencies

```bash
npm install
```

### Step 4 — Create your database

Open MySQL and create the database:

```sql
CREATE DATABASE nestjs_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 5 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=nestjs_db

JWT_SECRET=any_long_random_string_here

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=noreply@yourdomain.com
```

> See [ENV_DOCUMENTATION.md](./ENV_DOCUMENTATION.md) for full variable explanations.

### Step 6 — Start the server

```bash
npm run start:dev
```

You should see:
```
[Bootstrap] Server running at http://0.0.0.0:3000
[Bootstrap] Swagger docs at http://0.0.0.0:3000/docs
[Bootstrap] Environment: development
```

Tables are created automatically on first run (TypeORM `synchronize: true` in dev mode).

---

## 2. Running the Server

| Command | When to use |
|---|---|
| `npm run start:dev` | Day-to-day development. Hot-reloads on file save. |
| `npm run start:debug` | When you need to attach VS Code debugger. |
| `npm run build && npm run start:prod` | Simulating a production build locally. |

### VS Code Debug Setup

Add this to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to NestJS",
      "port": 9229,
      "restart": true,
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

Then run `npm run start:debug` and press F5 in VS Code.

---

## 3. Testing APIs

### Option A — Swagger UI (recommended for exploring)

1. Start the server: `npm run start:dev`
2. Open [http://localhost:3000/docs](http://localhost:3000/docs)
3. Click **Authorize** → enter your JWT token as `Bearer <token>`
4. Expand any endpoint and click **Try it out**

### Option B — Postman

#### Register a new user
```
POST http://localhost:3000/api/v1/user/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

#### Verify email with OTP
*(Check your email or server logs for the OTP)*
```
POST http://localhost:3000/api/v1/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "oneTimeCode": 1234
}
```

#### Login
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123!"
}
```
Response gives you `accessToken`. Use it as `Authorization: Bearer <accessToken>` on protected routes.

#### Get your profile
```
GET http://localhost:3000/api/v1/user/profile
Authorization: Bearer <your_access_token>
```

#### Update profile with image
```
PATCH http://localhost:3000/api/v1/user/profile
Authorization: Bearer <your_access_token>
Content-Type: multipart/form-data

name: "New Name"
image: [select a file]
```

#### Forgot password flow
```
# 1. Request OTP
POST /api/v1/auth/forgot-password
{ "email": "john@example.com" }

# 2. Verify OTP (returns reset token)
POST /api/v1/auth/verify-otp
{ "email": "john@example.com", "oneTimeCode": 5678 }
# Response: { "data": { "token": "abc123..." } }

# 3. Reset password (use token from step 2 in Authorization header — no "Bearer" prefix)
POST /api/v1/auth/reset-password
Authorization: abc123...
{ "newPassword": "NewPass123!", "confirmPassword": "NewPass123!" }
```

### Option C — curl

```bash
# Register
curl -X POST http://localhost:3000/api/v1/user/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Pass1234!"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass1234!"}'
```

### Running automated tests

```bash
npm run test          # unit tests
npm run test:cov      # with coverage
npm run test:e2e      # end-to-end tests
```

---

## 4. How to Add a New Module / Feature

Let's walk through adding a **Products** module as an example.

### Step 1 — Generate files with the CLI

```bash
npx nest g module product
npx nest g controller product --no-spec
npx nest g service product --no-spec
```

This creates:
```
src/product/
  product.controller.ts
  product.module.ts
  product.service.ts
```

### Step 2 — Create the entity

```typescript
// src/product/product.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Step 3 — Create DTOs

```typescript
// src/product/product.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop' })
  @IsString()
  name: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'A great laptop' })
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Step 4 — Implement the service

```typescript
// src/product/product.service.ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './product.dto';
import { ApiError } from 'src/utils/errors/api-error';
import sendResponse from 'src/utils/helper/sendResponse';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto) {
    const product = await this.productRepo.save(this.productRepo.create(dto));
    return sendResponse({ statusCode: HttpStatus.CREATED, data: product, success: true, message: 'Product created' });
  }

  async findAll() {
    const products = await this.productRepo.find();
    return sendResponse({ statusCode: HttpStatus.OK, data: products, success: true, message: 'Products fetched' });
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new ApiError(HttpStatus.NOT_FOUND, 'Product not found');
    return sendResponse({ statusCode: HttpStatus.OK, data: product, success: true, message: 'Product fetched' });
  }
}
```

### Step 5 — Implement the controller

```typescript
// src/product/product.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './product.dto';
import { Auth } from 'src/utils/guards/auth.guard';
import { USER_ROLES } from 'src/utils/enums/user';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a product (Admin only)' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all products' })
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }
}
```

### Step 6 — Wire up the module

```typescript
// src/product/product.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
```

### Step 7 — Register in AppModule

```typescript
// src/app.module.ts
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    // ... existing imports
    ProductModule,  // ← add this
  ],
})
export class AppModule {}
```

### Step 8 — Test it

Restart the dev server — the `products` table is created automatically. Your new endpoints appear in Swagger at `/docs`.

---

## 5. Request Lifecycle

Here is what happens when a request hits your API:

```
Client Request
      │
      ▼
┌─────────────────────┐
│   NestJS Router     │  Matches method + path to a controller handler
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Guards            │  AuthGuard checks JWT, RolesGuard checks USER_ROLES
│   (auth.guard.ts)   │  ← throws 401/403 if invalid
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Interceptors      │  LoggingInterceptor logs the request
│   (pre-handler)     │  ResponseInterceptor wraps the final response
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Validation Pipe   │  Validates + transforms @Body() / @Query() against DTOs
│                     │  ← throws 400 with field errors if invalid
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Controller        │  Receives validated data, calls service method
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Service           │  Business logic, DB queries, email sending, etc.
│                     │  Throws ApiError on failure
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Interceptors      │  ResponseInterceptor normalises the return value
│   (post-handler)    │  into { success, statusCode, message, data }
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Exception Filter  │  GlobalExceptionFilter catches ANY unhandled error
│   (on error path)   │  and returns a consistent { success: false, ... } JSON
└────────┬────────────┘
         │
         ▼
     Client Response
```

**Standard success response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile fetched successfully",
  "data": { ... }
}
```

**Standard error response:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "path": "/api/v1/user/profile"
}
```

**Paginated response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPage": 5
  },
  "data": [ ... ]
}
```

---

## 6. Common Troubleshooting

### ❌ `ECONNREFUSED` on startup

**Cause:** MySQL is not running or credentials are wrong.

**Fix:**
1. Make sure MySQL is running: `sudo systemctl start mysql`
2. Double-check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` in `.env`
3. Test the connection: `mysql -u root -p -h localhost`

---

### ❌ `Table 'users' doesn't exist`

**Cause:** `synchronize` is disabled (production mode) and tables haven't been created.

**Fix:** In `.env`, set `NODE_ENV=development` temporarily to let TypeORM auto-create tables on startup.

---

### ❌ `401 Unauthorized` on a protected endpoint

**Cause:** Missing or malformed JWT.

**Fix:**
1. Make sure you're sending `Authorization: Bearer <token>` (note the space after "Bearer")
2. Check that `JWT_SECRET` in `.env` matches what was used to sign the token
3. The token may have expired — log in again to get a new one

---

### ❌ Email not sending

**Cause:** SMTP credentials wrong or Gmail blocking the connection.

**Fix for Gmail:**
1. Enable 2-Step Verification on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords) and generate one
3. Use that 16-character app password as `EMAIL_PASS` (not your Gmail password)
4. Make sure `EMAIL_PORT=587`

**Test email locally:** Use [Mailhog](https://github.com/mailhog/MailHog):
```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```
Then set `EMAIL_HOST=localhost`, `EMAIL_PORT=1025`. View emails at `http://localhost:8025`.

---

### ❌ `Cannot GET /api/v1/user/all` returns 403

**Cause:** This endpoint requires `ADMIN` or `SUPER_ADMIN` role.

**Fix:** Log in with an admin account. If you have no admin, temporarily update your user's role directly in the database:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

---

### ❌ File upload returns 400 "Unsupported file type"

**Cause:** The uploaded file's MIME type doesn't match the allowed list.

**Fix:** By default only `jpg`, `jpeg`, `png`, `gif`, `webp`, `pdf` are allowed. Pass a custom `allowedMimeTypes` regex to `@FileUpload()` if you need others.

---

### ❌ `nest: command not found`

**Fix:** Use `npx`:
```bash
npx nest generate module my-module
```

Or install the CLI globally:
```bash
npm install -g @nestjs/cli
```

---

### ❌ TypeScript errors after pulling new changes

**Fix:**
```bash
rm -rf dist node_modules
npm install
npm run build
```

---

### Enabling optional features

**Redis cache:**
1. Start Redis: `docker run -p 6379:6379 redis:alpine` or `brew services start redis`
2. Uncomment `RedisCacheModule` import in `app.module.ts`

**Kafka:**
1. Start Kafka (easiest with Docker Compose — see the [Kafka quickstart](https://kafka.apache.org/quickstart))
2. Set `KAFKA_URL=localhost:9092` in `.env`
3. Uncomment `KafkaModule` in `app.module.ts`
4. Uncomment `connectKafkaMicroService(app)` and `app.startAllMicroservices()` in `main.ts`

---

*Still stuck? Check the [NestJS docs](https://docs.nestjs.com) or open an issue in the repository.*
