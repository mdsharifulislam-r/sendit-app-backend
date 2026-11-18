# Reusable Infrastructure + CI/CD Prompt

Copy the prompt below into another NestJS (or Node) monorepo. An AI assistant should inspect **that** repo and implement the same class of AWS infrastructure.

Source of truth for this pattern is the **executable Terraform + workflows** in this project (`infrastructure/terraform/**`, `.github/workflows/**`, `Dockerfile`), not older docs that may disagree (region, gateway, HTTPS).

---

## Copy-and-paste prompt

```text
Act as a senior AWS / Terraform / NestJS infrastructure engineer.

## Goal

Inspect THIS repository and implement (or adapt) the same infrastructure style used by a NestJS microservices monorepo that deploys to AWS ECS Fargate with Terraform + GitHub Actions.

Do NOT invent services. Derive service names, ports, controller path prefixes, health endpoints, and event types from THIS repo. Parameterize all project-specific names (`PROJECT`, `ENVIRONMENT`, Docker Hub org, region, domain).

Do NOT apply Terraform, destroy resources, or print secrets / `.env` / real `terraform.tfvars` / state contents.

---

## Target architecture (implement this pattern)

### High-level traffic
```
Internet
  → public ALB (HTTP :80; HTTPS :443 optional via ACM)
    → path rules under /api/v1/{prefix}*  → ECS Fargate service target groups
    → /socket.io*?service={name}          → matching service TG (sticky cookies)
    → default                           → "root"/main API service
```

Private ECS tasks only (no public IPs). ALB in public subnets; tasks + DocumentDB + Redis in private subnets across up to 3 AZs. Private egress via NAT (1 NAT/AZ for HA, or explicit single-NAT for cheap non-prod).

### Async messaging
```
Any service → SNS topic "{project}-{env}-events"
  → filtered SQS queues (one per service) via MessageAttributes.eventType
  → DLQ per queue (maxReceiveCount=3)
```
App pattern: publish with `eventType`; each service long-polls its own queue. Map event types → owning service from THIS repo's event registry (or create one if missing).

### Data / storage / secrets
- Amazon DocumentDB (MongoDB-compatible), private, TLS, encrypted, ingress only from ECS SG. Build `DB_URI` with URL-encoded credentials + DocumentDB options (`tls=true`, CA file in image, `retryWrites=false`, etc.) after verifying driver compatibility.
- ElastiCache Redis (TLS + at-rest), private, Multi-AZ when appropriate, ingress only from ECS SG.
- Private S3 uploads bucket: block public access in non-dev, AES256, versioning, lifecycle (temp cleanup, IA, Glacier), CORS for frontend origins only when known.
- One Secrets Manager secret `{project}-{env}-app-secret` (JSON blob). Terraform creates the secret shell; ops fill values later; Terraform must IGNORE live secret_string changes.
- ECS tasks receive only infra env vars (`AWS_REGION`, `AWS_SECRET_NAME`, queue URLs, Redis, DB_URI, SNS ARN, bucket, SERVICE_NAME, ports). App secrets load at process start into `process.env` before Nest boots (same idea as `loadAwsSecrets()`). Never put JWT/Stripe/email passwords in task-definition plaintext or git.

### Runtime (ECS Fargate)
- One ECS service + task definition + target group + CloudWatch log group per microservice that actually exists in THIS monorepo.
- `awsvpc`, dedicated container port, health check `GET /health` → 200 (container HEALTHCHECK + ALB TG).
- Separate IAM roles: execution (pull image + logs) vs task (S3/SNS/SQS/Secrets/CW write) — least privilege, scoped to this project's ARNs.
- Deployment circuit breaker + rollback. Prefer `lifecycle.ignore_changes` on task_definition/desired_count so CI owns image updates.
- Optional: CPU/memory target-tracking autoscaling behind a feature flag (default off unless requested).
- Optional CloudWatch alarms/dashboard behind a feature flag.

### Containers
Single multi-stage Dockerfile with build-args `SERVICE_NAME` and `SERVICE_PORT`:
1. deps — npm ci (+ any native deps the app needs)
2. builder — `nest build $SERVICE_NAME` (or THIS repo's build command)
3. runner — prod deps only, non-root user, expose port, HEALTHCHECK `/health`, CMD `node dist/apps/$SERVICE_NAME/main.js`
Include DocumentDB CA bundle if TLS to DocDB is used. Do not copy secrets into the image.

Image naming: `{dockerhub_org}/{project}-{service}:{tag}` with tags `latest` and `sha-{git_sha}`. Prefer deploying the SHA tag when adapting CI; if reusing a latest-based workflow, document that clearly.

### CI/CD (GitHub Actions)
One workflow file per service (path-filtered), roughly:
1. Trigger: push to main/production when `apps/{service}/**`, shared `utils/**`, lockfiles, nest-cli, Dockerfile, or that workflow change; plus `workflow_dispatch`.
2. build-push: Docker Hub login → buildx build/push with SERVICE_NAME/PORT args.
3. deploy: configure AWS → describe current task definition → render new image → register task definition → update ECS service → wait services-stable → on failure roll back to previous PRIMARY task definition.

Required GitHub secrets (prefer environment-scoped): `DOCKERHUB_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or migrate to OIDC later). Cluster/service/task-family names MUST match Terraform naming.

Terraform apply is manual / separate — workflows only roll images unless you explicitly add a terraform workflow.

### Local vs production
- Optional local gateway reverse-proxy is fine for local multi-process dev.
- Production ingress is ALB path routing (gateway service is NOT required in ECS unless THIS repo truly needs it).
- `docker-compose` local Kafka/Redis/etc. is NOT production infrastructure.

---

## Terraform layout to create/adapt

```
infrastructure/terraform/
  main.tf                 # backend, provider tags, module wiring
  variables.tf
  outputs.tf
  terraform.tfvars.example
  modules/
    networking/           # VPC, public/private subnets, IGW, NAT, route tables
    alb/                  # ALB, SG, target groups, HTTP listener, path + socket rules
    acm/                  # optional HTTPS cert (enable only when domain ready)
    ecs/                  # cluster, per-service tasks/services, ECS SG, log groups
    iam/                  # ecs-execution + ecs-task roles
    documentdb/           # cluster + instances + SG
    redis/                # replication group + SG
    messaging/            # SNS + per-service SQS + DLQ + filter subscriptions
    secrets/              # Secrets Manager secret + template JSON (placeholders only)
    s3/                   # uploads bucket
    cloudwatch/           # optional alarms/dashboard
```

### Naming convention (parameterize)
`{project}-{environment}-{resource}` examples:
- VPC: `{project}-{env}-vpc`
- ALB: `{project}-{env}-alb`
- ECS cluster: `{project}-{env}`
- Service: `{project}-{env}-{svc}-service`
- Task family: `{project}-{env}-{svc}`
- Queues: `{project}-{env}-{svc}` + `{project}-{env}-{svc}-dlq`
- Secret: `{project}-{env}-app-secret`
- Logs: `/ecs/{project}-{env}/{svc}`

Terraform remote state: S3 backend (+ lock). Bucket/key/region must be variables or clearly called out as one-time bootstrap — never hardcode another project's bucket.

### ALB routing
Derive path rules from THIS repo's Nest `@Controller('...')` prefixes under global prefix `api/v1` (or whatever THIS repo uses). Example pattern from a parcel marketplace:

| Priority | Paths | Service |
|---|---|---|
| 10 | `/api/v1/trip*`, `/api/v1/review*` | trip |
| 20 | `/api/v1/booking*` | booking |
| 30 | notification/message/chat/disclaimer/report | communication |
| 40 | wallet/coupon/transaction/pricing-rules/webhook | payment |
| 50 | admin/ticket/risk-settings/audit-logs | admin |
| 60+ | `/socket.io*` + query `service=` | matching service |
| default | `/*` | root |

Replace with THIS repo's real controllers. Stickiness enabled for socket TGs.

### ECS common env (infra)
Inject for every task:
- `NODE_ENV`, `AWS_REGION`, `AWS_SECRET_NAME`, `AWS_BUCKET_NAME`
- `SNS_TOPIC_ARN`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_TLS`
- `DB_URI` (DocumentDB)
- All service port env vars used by the monorepo
- `IP_ADDRESS=0.0.0.0`
- Per service: `SERVICE_NAME`, `SQS_QUEUE_URL` (own queue), and every `{SERVICE}_SQS_QUEUE_URL` if publishers need cross-queue URLs

### Secrets template (placeholders only)
Provide `secrets.template.json` with keys THIS app needs (JWT, email, Stripe, CORS, admin bootstrap, etc.). Document how to `put-secret-value` after first apply. Locally, omit `AWS_SECRET_NAME` and use `.env`.

---

## Reference service inventory (VERIFY against THIS repo — do not copy blindly)

Example Nest monorepo services that inspired this stack:

| Service | Port | Typical CPU/Mem | Notes |
|---|---:|---|---|
| root | 3000 | 512 / 1024 | Auth/users; ALB default |
| trip | 3001 | 512 / 1024 | |
| communication | 3002 | 512 / 1024 | email/chat/notifications |
| booking | 3003 | 512 / 1024 | |
| payment | 3004 | 512 / 1024 | Stripe webhooks need raw body |
| admin | 3005 | 256 / 512 | |
| gateway | 3010 | n/a | Local reverse proxy only in the reference prod TF |

Every service MUST expose `GET /health` outside the global API prefix if the app excludes it that way.

---

## CI/CD workflow template (per service)

```yaml
name: 'CI/CD — {service}'
on:
  push:
    branches: [main, production]
    paths:
      - 'apps/{service}/**'
      - 'utils/**'          # or THIS repo shared libs
      - 'package.json'
      - 'package-lock.json'
      - 'nest-cli.json'
      - 'Dockerfile'
      - '.github/workflows/{service}.yml'
  workflow_dispatch:

env:
  SERVICE_NAME: {service}
  SERVICE_PORT: {port}
  DOCKER_IMAGE: {dockerhub_org}/{project}-{service}
  ECS_CLUSTER: {project}-{environment}
  ECS_SERVICE: {project}-{environment}-{service}-service
  ECS_TASK_FAMILY: {project}-{environment}-{service}
  AWS_REGION: {region}
  CONTAINER_NAME: {service}

jobs:
  build-push:
    # checkout → validate DOCKERHUB_TOKEN → login → buildx push :latest and :sha-{github.sha}
  deploy:
    needs: build-push
    # configure-aws-credentials → describe-task-definition → amazon-ecs-render-task-definition
    # → register-task-definition → update-service --force-new-deployment
    # → wait services-stable → rollback previous task def on failure
```

Shared path changes (`utils/**`, Dockerfile, lockfiles) should trigger all services that share that code.

---

## Workflow for you (the assistant)

1. Inspect THIS repo: nest-cli apps, ports, controllers, health routes, Dockerfile, existing infra, event map, secret loading.
2. Summarize discovered architecture + conflicts + cost-sensitive choices. Ask only for decisions that cannot be derived (project name, environment, region, domain/TLS, Docker Hub org, DocDB password strategy, NAT HA vs cost).
3. Implement a coherent stack under `infrastructure/terraform/` + `.github/workflows/` + Dockerfile as needed. Reuse existing files; do not create a parallel abandoned stack.
4. Make every `sendit` / personal Docker Hub / hardcoded state-bucket name a variable for THIS project.
5. Align ALB paths and SNS/SQS filters with THIS app's controllers and event types.
6. Add/update docs: apply order, required GitHub secrets, how to fill Secrets Manager, rollback, what is optional (ACM HTTPS, autoscaling, CloudWatch).
7. Validate locally without credentials when possible (`terraform fmt`, `terraform validate` after init if safe). Report what could not be run.
8. Finish with: files changed, inputs user must provide, remaining manual steps, risks (HTTP-only, public S3 in dev, deploying `latest` vs SHA, gateway not in ECS, etc.).

## Safety

- Never commit real secrets, state, or filled `terraform.tfvars`.
- Never make production uploads public without explicit approval.
- Never silently enable destructive replaces; call them out.
- Prefer GitHub OIDC over long-lived AWS keys when adding new CI IAM, but keep compatibility with access-key workflows if the repo already uses them.
- Docs that disagree with executable Terraform must be corrected or clearly marked stale.
```

---

## How to use this in another app

1. Open the target repo in Cursor.
2. Paste the prompt above.
3. Add any app-specific notes at the end, for example:

```text
Project name: myapp
Environment: staging
Region: eu-central-1
Docker Hub org: myorg
Services in this repo: api, worker, admin
Domain for HTTPS later: api.myapp.com
Use DocumentDB + Redis + SNS/SQS + ALB path routing like the prompt.
```

4. Let the assistant inspect the target monorepo and generate Terraform + workflows adapted to its services.

---

## Quick map of this (source) repository

| Piece | Location |
|---|---|
| Terraform root | `infrastructure/terraform/` |
| Modules | `infrastructure/terraform/modules/*` |
| Secrets template | `infrastructure/terraform/modules/secrets/secrets.template.json` |
| CI workflows | `.github/workflows/{root,trip,booking,communication,payment,admin,gateway}.yml` |
| Dockerfile | `Dockerfile` (multi-stage, `SERVICE_NAME` / `SERVICE_PORT`) |
| Runtime secret load | `utils/helper-modules/secret-manager/load-aws-secrets.ts` |
| Event → service map | `utils/config/sqs-events.ts` |
| Deploy docs | `infrastructure/docs/DEPLOYMENT.md` (may lag Terraform — prefer TF) |

### Known source-project caveats (verify when reusing)
- Executable Terraform uses **eu-central-1**, six ECS services, ALB HTTP :80; ACM HTTPS is commented out.
- Gateway exists in app/workflows but is **not** an ECS service in Terraform (ALB replaces it in prod).
- Workflows currently target cluster names like `{project}-dev` and often deploy the `latest` tag (also push SHA tags).
- Some docs still mention eu-north-1 / seven processes / production HTTPS — treat as stale unless re-verified.
