# ─── Terraform Root Configuration ──────────────────────────────────────────────
# Sendit Backend — AWS ECS Fargate Production Infrastructure
# Region: eu-north-1 (Stockholm)
# ──────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state — replace bucket/table with your own
  backend "s3" {
    bucket         = "sendit-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "eu-north-1"
    dynamodb_table = "sendit-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "sendit"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ─── Networking ───────────────────────────────────────────────────────────────
module "networking" {
  source      = "./modules/networking"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  aws_region  = var.aws_region
}

# ─── Secrets Manager ─────────────────────────────────────────────────────────
module "secrets" {
  source      = "./modules/secrets"
  environment = var.environment
}

# ─── IAM ─────────────────────────────────────────────────────────────────────
module "iam" {
  source              = "./modules/iam"
  environment         = var.environment
  aws_region          = var.aws_region
  account_id          = data.aws_caller_identity.current.account_id
  sns_topic_arn       = module.messaging.sns_topic_arn
  sqs_queue_arns      = module.messaging.sqs_queue_arns
  s3_bucket_arn       = module.s3.bucket_arn
  documentdb_arn      = module.documentdb.cluster_arn
  log_group_arns      = module.cloudwatch.log_group_arns
}

# ─── S3 ──────────────────────────────────────────────────────────────────────
module "s3" {
  source      = "./modules/s3"
  environment = var.environment
  bucket_name = var.s3_bucket_name
}

# ─── DocumentDB (MongoDB-compatible) ─────────────────────────────────────────
module "documentdb" {
  source               = "./modules/documentdb"
  environment          = var.environment
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  ecs_sg_id            = module.ecs.ecs_tasks_sg_id
  db_master_username   = var.db_master_username
  db_master_password   = var.db_master_password
  instance_count       = var.documentdb_instance_count
  instance_class       = var.documentdb_instance_class
}

# ─── ElastiCache Redis ────────────────────────────────────────────────────────
module "redis" {
  source             = "./modules/redis"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  ecs_sg_id          = module.ecs.ecs_tasks_sg_id
  node_type          = var.redis_node_type
}

# ─── SNS / SQS Messaging ─────────────────────────────────────────────────────
module "messaging" {
  source      = "./modules/messaging"
  environment = var.environment
}

# ─── ACM Certificate ─────────────────────────────────────────────────────────
module "acm" {
  source      = "./modules/acm"
  domain_name = var.domain_name
  aws_region  = var.aws_region
}

# ─── Application Load Balancer ────────────────────────────────────────────────
module "alb" {
  source             = "./modules/alb"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  certificate_arn    = module.acm.certificate_arn
}

# ─── ECS Cluster + Services ──────────────────────────────────────────────────
module "ecs" {
  source               = "./modules/ecs"
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  alb_sg_id            = module.alb.alb_sg_id
  alb_listener_arn     = module.alb.https_listener_arn
  alb_listener_http_arn = module.alb.http_listener_arn
  execution_role_arn   = module.iam.ecs_execution_role_arn
  task_role_arn        = module.iam.ecs_task_role_arn
  secrets_arn          = module.secrets.secret_arn

  # Docker images — set via CI/CD, default to latest for initial bootstrap
  dockerhub_username   = var.dockerhub_username
  service_images       = var.service_images

  # DocumentDB
  documentdb_endpoint  = module.documentdb.cluster_endpoint
  db_master_username   = var.db_master_username
  db_master_password   = var.db_master_password

  # Redis
  redis_endpoint       = module.redis.primary_endpoint
  redis_port           = module.redis.port

  # Messaging
  sns_topic_arn        = module.messaging.sns_topic_arn
  sqs_queue_url        = module.messaging.main_sqs_queue_url

  # S3
  s3_bucket_name       = var.s3_bucket_name
}

# ─── CloudWatch ──────────────────────────────────────────────────────────────
module "cloudwatch" {
  source      = "./modules/cloudwatch"
  environment = var.environment
  aws_region  = var.aws_region

  # Pass ECS service names for alarm configuration
  ecs_cluster_name    = module.ecs.cluster_name
  ecs_service_names   = module.ecs.service_names
}

# ─── Data Sources ─────────────────────────────────────────────────────────────
data "aws_caller_identity" "current" {}
