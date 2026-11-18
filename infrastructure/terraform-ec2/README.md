# Sendit — EC2 all-in-one stack

**Separate from** `infrastructure/terraform` (ECS/Fargate/ALB).  
This stack does **not** modify the existing ECS configuration.

## What it deploys

One EC2 (Amazon Linux 2023) running Docker Compose:

| Container | Role |
|-----------|------|
| `nginx` | Public entry on **:80** / **:3010** (ALB-style path routing) |
| `root` `trip` `communication` `booking` `payment` `admin` | Nest services |
| `mongo` | Local MongoDB 7 |
| `redis` | Local Redis 7 |

Traffic example: `http://<eip>/api/v1/user/...` → root, `/api/v1/trip` → trip, etc.

## Prerequisites

1. Docker Hub images already built/pushed:
   - `{user}/sendit-root`, `sendit-trip`, `sendit-communication`, `sendit-booking`, `sendit-payment`, `sendit-admin`
2. EC2 key pair in the target region
3. AWS credentials with rights to create VPC/EC2/IAM/EIP
4. Uses **local** Terraform state in this folder (ECS remote S3 bucket denied other keys with 403)

## Apply

```bash
cd infrastructure/terraform-ec2
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

terraform init
terraform plan
terraform apply
```

```bash
terraform output gateway_url
terraform output ssh_command
```

## After boot

1. Wait ~3–5 minutes for user-data (Docker + pull images).
2. SSH in and check:

```bash
sendit-logs
docker ps
curl http://localhost/health
```

3. Edit `/opt/sendit/.env` for JWT, Stripe, SNS/SQS, S3, etc., then:

```bash
sendit-up
```

## Helpers on the instance

- `sendit-up` — pull + start
- `sendit-down` — stop
- `sendit-logs` — follow logs

## Important

- **Does not touch** `infrastructure/terraform` (ECS stack).
- Gateway Nest app is **not** required here; nginx replaces ALB path routing.
- For production HA, keep using the ECS stack; this is for cheap single-box / staging.
- Restrict `ssh_cidr` to your IP.
- Change `JWT_SECRET` in `/opt/sendit/.env` immediately after first boot.
