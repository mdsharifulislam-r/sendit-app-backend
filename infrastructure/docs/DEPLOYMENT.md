# Sendit Backend — Production Infrastructure Documentation

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Infrastructure Diagram](#2-infrastructure-diagram)
3. [Microservice Inventory](#3-microservice-inventory)
4. [Docker Strategy](#4-docker-strategy)
5. [CI/CD Flow](#5-cicd-flow)
6. [Terraform Modules](#6-terraform-modules)
7. [Security & IAM](#7-security--iam)
8. [Secrets Management](#8-secrets-management)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [Scaling](#10-scaling)
11. [Deployment: Manual](#11-deployment-manual)
12. [Deployment: Automated (CI/CD)](#12-deployment-automated-cicd)
13. [Rollback Strategy](#13-rollback-strategy)
14. [Disaster Recovery](#14-disaster-recovery)
15. [Estimated AWS Monthly Cost](#15-estimated-aws-monthly-cost)
16. [GitHub Secrets Required](#16-github-secrets-required)
17. [Required Information from You](#17-required-information-from-you)

---

## 1. Architecture Overview

Sendit is a NestJS monorepo composed of **6 independent Node.js microservices** (plus a local gateway that is ignored in production). Each service is bundled by Webpack into a single `main.js` and deployed as a separate Docker container on AWS ECS Fargate.

**Traffic Flow (Direct via ALB):**

```
Internet → ALB (HTTPS:443)
                 │
                 ├─► /trip/* ────────► trip :3001
                 ├─► /booking/* ─────► booking :3003
                 ├─► /communication/*► communication :3002
                 ├─► /payment/* ─────► payment :3004
                 ├─► /admin/* ───────► admin :3005
                 └─► /* (default) ───► root :3000
```

**Async Events (SNS → SQS Fan-out):**

```
Any Service → AWS SNS Topic → Fan-out to per-service SQS queues
                                ├── communication-queue
                                ├── booking-queue
                                ├── payment-queue
                                ├── trip-queue
                                └── admin-queue
```

---

## 2. Infrastructure Diagram

```
                          ┌──────────────────────────────────────────────┐
                          │                  AWS eu-north-1               │
                          │                                                │
  Internet ─────HTTPS────►│  ALB (Application Load Balancer)              │
                          │       └── Target Groups: root, trip, etc.     │
                          │                                                │
                          │  ┌─────── Private Subnets (3 AZs) ──────────┐│
                          │  │                                            ││
                          │  │  ECS Fargate Cluster: sendit-production    ││
                          │  │  ┌──────┐ ┌──────┐ ┌─────────┐             ││
                          │  │  │ root │ │ trip │ │ booking │  ...        ││
                          │  │  │:3000 │ │:3001 │ │ :3003   │             ││
                          │  │  └──────┘ └──────┘ └─────────┘             ││
                          │  │                                            ││
                          │  │  ┌─────────────────────────────────────┐  ││
                          │  │  │ DocumentDB (MongoDB-compatible)      │  ││
                          │  │  │ 2 instances, TLS, encrypted          │  ││
                          │  │  └─────────────────────────────────────┘  ││
                          │  │                                            ││
                          │  │  ┌─────────────────────────────────────┐  ││
                          │  │  │ ElastiCache Redis (cluster mode)    │  ││
                          │  │  │ 2 nodes, TLS, encrypted             │  ││
                          │  │  └─────────────────────────────────────┘  ││
                          │  └────────────────────────────────────────────┘│
                          │                                                │
                          │  ┌── AWS Managed Services ──────────────────┐ │
                          │  │ SNS Topic → 5x SQS queues (+ DLQs)      │ │
                          │  │ S3 Bucket (uploads, TLS, versioned)      │ │
                          │  │ Secrets Manager (all app secrets)        │ │
                          │  │ CloudWatch (logs, metrics, alarms)       │ │
                          │  │ ACM (TLS certificate)                    │ │
                          │  └──────────────────────────────────────────┘ │
                          └──────────────────────────────────────────────┘
```

---

## 3. Microservice Inventory

| Service       | Image                | Port | CPU | Memory  | Min | Max | Health  |
| ------------- | -------------------- | ---- | --- | ------- | --- | --- | ------- |
| root          | sendit-root          | 3000 | 512 | 1024 MB | 1   | 5   | /health |
| trip          | sendit-trip          | 3001 | 512 | 1024 MB | 1   | 8   | /health |
| booking       | sendit-booking       | 3003 | 512 | 1024 MB | 1   | 8   | /health |
| communication | sendit-communication | 3002 | 512 | 1024 MB | 1   | 5   | /health |
| payment       | sendit-payment       | 3004 | 512 | 1024 MB | 1   | 5   | /health |
| admin         | sendit-admin         | 3005 | 256 | 512 MB  | 1   | 3   | /health |

> **Note:** You must add a `/health` endpoint to each service. The simplest implementation:
>
> ```typescript
> @Controller()
> class AppController {
>   @Get('health') health() {
>     return { status: 'ok' };
>   }
> }
> ```

---

## 4. Docker Strategy

### Multi-Stage Build

The [Dockerfile](../../Dockerfile) uses three stages:

1. **`deps`** — installs all dependencies (including dev), then copies only `node_modules_prod`
2. **`builder`** — runs `nest build <SERVICE_NAME>` to produce `dist/`
3. **`runner`** — copies only `dist/` and `node_modules_prod` into a clean Alpine image

### Image Naming Convention

```
docker.io/<dockerhub_username>/sendit-<service>:<tag>

Tags used:
  latest       — current HEAD of main branch
  sha-<short>  — Git SHA (immutable, used by ECS)
  v1.2.3       — semver release tags
```

### Build Command (CI/CD)

```bash
docker build \
  --build-arg SERVICE_NAME=gateway \
  --build-arg SERVICE_PORT=3010 \
  -t your-username/sendit-gateway:sha-abc123 \
  .
```

---

## 5. CI/CD Flow

```
Developer pushes to `main` branch
        ↓
GitHub detects changed files (path filters)
        ↓
Only affected service workflows trigger
        ↓
┌─────────────────────────────────────────────────┐
│ 1. Lint & Test Job                               │
│    npm ci → eslint → jest                        │
├─────────────────────────────────────────────────┤
│ 2. Build & Push Job                              │
│    docker buildx → push to Docker Hub            │
│    Tags: latest + sha-XXXXXXX                    │
├─────────────────────────────────────────────────┤
│ 3. Deploy Job                                    │
│    aws ecs describe-task-definition              │
│    → inject new image SHA                        │
│    → aws ecs register-task-definition            │
│    → aws ecs update-service --force-new-deploy   │
│    → aws ecs wait services-stable                │
│    → On failure: rollback to previous task def   │
└─────────────────────────────────────────────────┘
```

### Path Filters — What Triggers What

| Changed Path            | Triggered Workflows |
| ----------------------- | ------------------- |
| `apps/gateway/**`       | gateway only        |
| `apps/trip/**`          | trip only           |
| `apps/booking/**`       | booking + payment   |
| `apps/payment/**`       | payment only        |
| `apps/communication/**` | communication only  |
| `apps/admin/**`         | admin only          |
| `apps/root/**`          | root only           |
| `utils/**`              | **ALL** services    |
| `package.json`          | **ALL** services    |
| `Dockerfile`            | **ALL** services    |

---

## 6. Terraform Modules

```
infrastructure/terraform/
├── main.tf                      # Root: wires all modules
├── variables.tf                 # Input variable declarations
├── outputs.tf                   # Output values
├── terraform.tfvars.example     # Template — copy and fill
└── modules/
    ├── networking/main.tf        # VPC, subnets, NAT GW, IGW, routes
    ├── documentdb/main.tf        # DocumentDB cluster + instances + SG
    ├── redis/main.tf             # ElastiCache Redis + SG
    ├── messaging/main.tf         # SNS + 5 SQS queues + DLQs + subscriptions
    ├── s3/main.tf                # S3 bucket + encryption + lifecycle
    ├── iam/main.tf               # ECS execution + task roles
    ├── alb/main.tf               # ALB + listeners + target group
    ├── acm/main.tf               # TLS certificate
    ├── secrets/main.tf           # Secrets Manager secret
    ├── ecs/main.tf               # ECS cluster + all 7 services + autoscaling
    └── cloudwatch/main.tf        # Alarms + dashboard
```

### First-Time Apply Order

Terraform handles ordering automatically, but conceptually:

1. Networking (VPC must exist before all others)
2. Security Groups (within ECS module)
3. DocumentDB, Redis (need VPC + SGs)
4. S3, SNS/SQS, Secrets, ACM (independent)
5. IAM (needs SNS/SQS/S3 ARNs)
6. ALB (needs VPC + certificate)
7. ECS (needs everything above)
8. CloudWatch (needs ECS cluster name)

---

## 7. Security & IAM

### IAM Roles

| Role                 | Purpose                               | Permissions                                                                                     |
| -------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ecs-execution-role` | ECS agent pulls images, reads secrets | ECR, CloudWatch Logs, Secrets Manager read                                                      |
| `ecs-task-role`      | Application code inside containers    | S3 put/get/delete, SNS publish, SQS receive/delete, CloudWatch logs write, Secrets Manager read |

### Network Security

- ALB in **public subnets**, ECS tasks in **private subnets**
- ECS tasks only reachable from ALB (SG rule)
- DocumentDB only reachable from ECS tasks (SG rule)
- Redis only reachable from ECS tasks (SG rule)
- No tasks have public IPs

### TLS

- ALB terminates TLS using ACM certificate
- DocumentDB: TLS enabled (`tls=enabled` parameter group)
- Redis: Transit encryption enabled

---

## 8. Secrets Management

All secrets are stored in **AWS Secrets Manager** at path `sendit/production/app-secrets`.

ECS task definitions reference individual keys using the `secrets` field:

```json
{
  "name": "JWT_SECRET",
  "valueFrom": "arn:aws:secretsmanager:...:secret:sendit/production/app-secrets:JWT_SECRET::"
}
```

### Populating Secrets (first-time setup)

```bash
aws secretsmanager put-secret-value \
  --secret-id sendit/production/app-secrets \
  --secret-string '{
    "JWT_SECRET": "your-256-bit-random-secret",
    "STRIPE_SECRET_KEY": "sk_live_...",
    "EMAIL_PASS": "your-app-password",
    "DB_URI": "mongodb://user:pass@docdb-endpoint:27017/sendit?tls=true...",
    ...
  }'
```

---

## 9. Monitoring & Logging

### CloudWatch Log Groups

Each service writes to `/ecs/sendit-production/<service-name>` with 30-day retention.

### CloudWatch Alarms (per service)

| Alarm             | Threshold      | Action        |
| ----------------- | -------------- | ------------- |
| CPU High          | > 85% for 2min | Alert via SNS |
| Memory High       | > 85% for 2min | Alert via SNS |
| Running Tasks Low | < 1 task       | Alert via SNS |

### Dashboard

A CloudWatch dashboard `sendit-production` shows CPU and Memory utilization for all services.

### Subscribe to Alarms

```bash
aws sns subscribe \
  --topic-arn <alarm-topic-arn> \
  --protocol email \
  --notification-endpoint your@email.com
```

---

## 10. Scaling

### ECS Auto Scaling

| Service | Trigger      | Scale Out                  | Scale In                   |
| ------- | ------------ | -------------------------- | -------------------------- |
| All     | CPU > 70%    | Immediately (60s cooldown) | After 5min (300s cooldown) |
| All     | Memory > 75% | Immediately (60s cooldown) | After 5min (300s cooldown) |

### Capacity

| Service       | Min Tasks | Max Tasks |
| ------------- | --------- | --------- |
| root          | 1         | 5         |
| trip          | 1         | 8         |
| booking       | 1         | 8         |
| communication | 1         | 5         |
| payment       | 1         | 5         |
| admin         | 1         | 3         |

---

## 11. Deployment: Manual

### Prerequisites

```bash
# Install Terraform >= 1.6
# Install AWS CLI >= 2
# Configure AWS credentials
aws configure

# Set Docker Hub credentials
docker login
```

### Step 1 — Bootstrap Terraform State Backend

```bash
# Create S3 bucket for state
aws s3 mb s3://sendit-terraform-state --region eu-north-1
aws s3api put-bucket-versioning \
  --bucket sendit-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name sendit-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-north-1
```

### Step 2 — Initialize Terraform

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 3 — Populate Secrets Manager

```bash
# After terraform apply, get the secret ARN from outputs
terraform output secrets_arn

# Populate all secrets
aws secretsmanager put-secret-value \
  --secret-id sendit/production/app-secrets \
  --secret-string file://secrets.json
```

### Step 4 — Build and Push Docker Images

```bash
# For each service (replace gateway with each service name)
docker build \
  --build-arg SERVICE_NAME=gateway \
  --build-arg SERVICE_PORT=3010 \
  -t your-username/sendit-gateway:latest \
  -t your-username/sendit-gateway:v1.0.0 \
  .

docker push your-username/sendit-gateway:latest
docker push your-username/sendit-gateway:v1.0.0
```

### Step 5 — Force ECS Redeployment

```bash
# Force deployment for root service as an example (repeat for other services)
aws ecs update-service \
  --cluster sendit-production \
  --service sendit-root-service \
  --force-new-deployment \
  --region eu-north-1
```

---

## 12. Deployment: Automated (CI/CD)

### Setup GitHub Secrets

Go to your GitHub repository → Settings → Secrets → Actions and add:

| Secret Name             | Value                                  |
| ----------------------- | -------------------------------------- |
| `DOCKERHUB_USERNAME`    | Your Docker Hub username               |
| `DOCKERHUB_TOKEN`       | Docker Hub access token (not password) |
| `AWS_ACCESS_KEY_ID`     | IAM user access key                    |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key                    |

### Trigger a Deployment

```bash
# Trigger specific service
git add apps/trip/
git commit -m "feat: improve geospatial search"
git push origin main
# → Only trip.yml workflow triggers
```

### Manual Trigger

Go to GitHub → Actions → Select workflow → Run workflow

---

## 13. Rollback Strategy

### Automatic Rollback

ECS deployment circuit breaker is enabled. If the new task fails health checks, ECS automatically rolls back to the previous task definition.

### Manual Rollback via AWS CLI

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix sendit-trip \
  --sort DESC \
  --query 'taskDefinitionArns[:5]'

# Roll back to specific revision
aws ecs update-service \
  --cluster sendit-production \
  --service sendit-trip-service \
  --task-definition sendit-trip:42  # previous revision number
```

### Rollback via Docker Tag

```bash
# Re-tag a previous image as latest
docker pull your-username/sendit-trip:sha-abc123
docker tag your-username/sendit-trip:sha-abc123 your-username/sendit-trip:latest
docker push your-username/sendit-trip:latest

# Force new deployment
aws ecs update-service \
  --cluster sendit-production \
  --service sendit-trip-service \
  --force-new-deployment
```

---

## 14. Disaster Recovery

### Database Backups

- **DocumentDB**: Automated backups every 24h at 02:00 UTC, retained 7 days
- **Restore**: `aws docdb restore-db-cluster-from-snapshot`

### Redis Recovery

- Redis data is ephemeral cache — no persistent data requiring recovery
- ECS tasks reconnect automatically on Redis restart

### S3

- Versioning enabled — deleted/overwritten files can be restored
- Files transition to STANDARD_IA after 90 days, GLACIER after 365 days

### Multi-AZ

- DocumentDB: 2 instances across multiple AZs
- Redis: 2 nodes, multi-AZ, automatic failover enabled
- ECS: Tasks distributed across 3 AZs via `private_subnet_ids`
- NAT: 1 NAT Gateway per AZ (3 total) — no single point of failure

---

## 15. Estimated AWS Monthly Cost

> **Region: eu-north-1 (Stockholm)**
> Costs are approximate based on 2024 pricing.

| Service           | Spec                                   | Est. Monthly    |
| ----------------- | -------------------------------------- | --------------- |
| ECS Fargate       | 7 services × 2 tasks avg × 512vCPU/1GB | ~$85            |
| DocumentDB        | 2× db.t3.medium                        | ~$130           |
| ElastiCache Redis | 2× cache.t3.micro                      | ~$30            |
| ALB               | 1 ALB + data                           | ~$20            |
| NAT Gateway       | 3 NAT GWs + data                       | ~$100           |
| S3                | Uploads + lifecycle                    | ~$5             |
| Secrets Manager   | 1 secret                               | ~$0.40          |
| CloudWatch        | Logs + alarms                          | ~$10            |
| SNS + SQS         | Per request                            | ~$5             |
| **Total**         |                                        | **~$385/month** |

> **Cost optimization tips:**
>
> - Use FARGATE_SPOT for non-critical services (60-70% cheaper)
> - Use a single NAT GW for non-HA staging environments
> - Downgrade DocumentDB to `db.t3.medium` or use MongoDB Atlas instead

---

## 16. GitHub Secrets Required

Configure these in: Repository → Settings → Secrets and variables → Actions

| Secret                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `DOCKERHUB_USERNAME`    | Docker Hub username                        |
| `DOCKERHUB_TOKEN`       | Docker Hub personal access token           |
| `AWS_ACCESS_KEY_ID`     | AWS IAM access key for GitHub Actions user |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key                         |

> **Best practice**: Create a dedicated `github-actions` IAM user with only the minimum permissions needed:
>
> - `ecs:DescribeTaskDefinition`
> - `ecs:RegisterTaskDefinition`
> - `ecs:UpdateService`
> - `ecs:DescribeServices`
> - `ecs:ListTaskDefinitions`

---

## 17. Required Information from You

Before applying Terraform, you need to provide:

| Item                    | Where to Set                              | Notes                    |
| ----------------------- | ----------------------------------------- | ------------------------ |
| **Domain name**         | `terraform.tfvars` → `domain_name`        | e.g., `api.sendit.app`   |
| **Docker Hub username** | `terraform.tfvars` + GitHub Secret        |                          |
| **DB master password**  | `terraform.tfvars` → `db_master_password` | 8+ chars, alphanumeric   |
| **Real secrets**        | Secrets Manager (after apply)             | JWT, Stripe, Email, etc. |
| **CORS origin**         | Secrets Manager                           | Your frontend domain     |
| **Alarm email**         | Subscribe to SNS alarm topic              | After apply              |

> **Important**: You must add a `/health` endpoint to every NestJS service that returns HTTP 200. The ALB and ECS health checks depend on this.
