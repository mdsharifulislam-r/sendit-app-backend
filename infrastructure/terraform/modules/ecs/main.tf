# ─── ECS Module ───────────────────────────────────────────────────────────────
# ECS Cluster + Fargate Services for all 6 Sendit microservices
# Gateway removed — ALB handles routing directly to each service
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"          {}
variable "aws_region"           {}
variable "vpc_id"               {}
variable "private_subnet_ids"   {}
variable "alb_sg_id"            {}
variable "alb_listener_arn"     {}
variable "alb_listener_http_arn" {}
variable "alb_tg_arns"          { type = map(string) }
variable "execution_role_arn"   {}
variable "task_role_arn"        {}
variable "secret_name"          {}
variable "dockerhub_username"   {}
variable "service_images"       { type = map(string) }
variable "documentdb_endpoint"  {}
variable "db_master_username"   { sensitive = true }
variable "db_master_password"   { sensitive = true }
variable "redis_endpoint"       {}
variable "redis_port"           {}
variable "sns_topic_arn"        {}
variable "sqs_queue_urls"      { type = map(string) }
variable "enable_autoscaling" {
  description = "Enable ECS auto scaling (requires application-autoscaling permissions)"
  type        = bool
  default     = false
}

variable "s3_bucket_name"       {}

# ─── ECS Cluster ──────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "sendit-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "sendit-${var.environment}" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ─── ECS Tasks Security Group ─────────────────────────────────────────────────
resource "aws_security_group" "ecs_tasks" {
  name        = "sendit-${var.environment}-ecs-tasks-sg"
  description = "ECS tasks security group"
  vpc_id      = var.vpc_id

  # Allow ALB to reach all backend services directly (ports 3000–3005)
  ingress {
    from_port       = 3000
    to_port         = 3005
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
  }

  # Allow inter-service communication on all service ports
  ingress {
    from_port = 3000
    to_port   = 3005
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "sendit-${var.environment}-ecs-tasks-sg" }
}

# ─── CloudWatch Log Groups ────────────────────────────────────────────────────
locals {
  services = {
    root          = { port = 3000, cpu = 512,  memory = 1024, desired = 2, min = 1, max = 5 }
    trip          = { port = 3001, cpu = 512,  memory = 1024, desired = 2, min = 1, max = 8 }
    booking       = { port = 3003, cpu = 512,  memory = 1024, desired = 2, min = 1, max = 8 }
    communication = { port = 3002, cpu = 512,  memory = 1024, desired = 2, min = 1, max = 5 }
    payment       = { port = 3004, cpu = 512,  memory = 1024, desired = 2, min = 1, max = 5 }
    admin         = { port = 3005, cpu = 256,  memory = 512,  desired = 1, min = 1, max = 3 }
  }

  # ALB target group ARN map — each service gets its own TG from the ALB module
  service_tg_arns = {
    root          = var.alb_tg_arns["root"]
    trip          = var.alb_tg_arns["trip"]
    booking       = var.alb_tg_arns["booking"]
    communication = var.alb_tg_arns["communication"]
    payment       = var.alb_tg_arns["payment"]
    admin         = var.alb_tg_arns["admin"]
  }

  # Non-secret env vars injected into every container.
  # App secrets (JWT, Stripe, email, etc.) are loaded at runtime via
  # loadAwsSecrets() using AWS_SECRET_NAME + the ECS task role.
  common_env = [
    { name = "NODE_ENV",           value = "production" },
    { name = "AWS_REGION",         value = var.aws_region },
    { name = "AWS_SECRET_NAME",    value = var.secret_name },
    { name = "AWS_BUCKET_NAME",    value = var.s3_bucket_name },
    { name = "SNS_TOPIC_ARN",      value = var.sns_topic_arn },
    { name = "REDIS_HOST",         value = var.redis_endpoint },
    { name = "REDIS_PORT",         value = tostring(var.redis_port) },
    { name = "REDIS_TLS",          value = "true" },
    { name = "DB_URI",             value = "mongodb://${var.db_master_username}:${urlencode(var.db_master_password)}@${var.documentdb_endpoint}:27017/sendit?tls=true&tlsCAFile=/app/certs/rds-global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&authMechanism=SCRAM-SHA-1" },
    { name = "PORT",               value = "3000" },
    { name = "TRIP_SERVER_PORT",   value = "3001" },
    { name = "COMMUNICATION_PORT", value = "3002" },
    { name = "BOOKING_PORT",       value = "3003" },
    { name = "PAYMENT_PORT",       value = "3004" },
    { name = "ADMIN_PORT",         value = "3005" },
    { name = "IP_ADDRESS",         value = "0.0.0.0" },
  ]
}

resource "aws_cloudwatch_log_group" "services" {
  for_each          = local.services
  name              = "/ecs/sendit-${var.environment}/${each.key}"
  retention_in_days = 30
  tags              = { Service = each.key }
}

# ─── ECS Task Definitions ─────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "services" {
  for_each = local.services

  family                   = "sendit-${var.environment}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${var.dockerhub_username}/sendit-${each.key}:${lookup(var.service_images, each.key, "latest")}"
      essential = true

      portMappings = [
        {
          containerPort = each.value.port
          protocol      = "tcp"
        }
      ]

      environment = concat(
        local.common_env,
        [
          { name = "SQS_QUEUE_URL", value = var.sqs_queue_urls[each.key] },
          { name = "${upper(each.key)}_SQS_QUEUE_URL", value = var.sqs_queue_urls[each.key] },
          { name = "SERVICE_PATH_PREFIX", value = each.key == "root" ? "" : "/${each.key}" },
        ],
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/sendit-${var.environment}/${each.key}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:${each.value.port}/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }

      readonlyRootFilesystem = false
      ulimits = [
        {
          name      = "nofile"
          softLimit = 65536
          hardLimit = 65536
        }
      ]
    }
  ])

  tags = { Service = each.key }
}

# ─── ECS Services ─────────────────────────────────────────────────────────────
resource "aws_ecs_service" "services" {
  for_each = local.services

  name            = "sendit-${var.environment}-${each.key}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = each.value.desired
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Each service is connected directly to its own ALB target group
  dynamic "load_balancer" {
    for_each = [1]
    content {
      target_group_arn = local.service_tg_arns[each.key]
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  deployment_controller {
    type = "ECS"
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  health_check_grace_period_seconds = 60

  lifecycle {
    ignore_changes = [
      # Image updates are managed by CI/CD, not Terraform
      task_definition,
      desired_count
    ]
  }

  tags = { Service = each.key }
}

# ─── Target Groups moved to ALB module — one per service ─────────────────────
# Target groups are now created in modules/alb/main.tf and their ARNs are
# passed back to this module via the alb_tg_arns variable.

# ─── ECS Auto Scaling ─────────────────────────────────────────────────────────
resource "aws_appautoscaling_target" "services" {
  for_each = var.enable_autoscaling ? local.services : {}

  max_capacity       = each.value.max
  min_capacity       = each.value.min
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU-based scaling
resource "aws_appautoscaling_policy" "cpu" {
  for_each = var.enable_autoscaling ? local.services : {}

  name               = "sendit-${var.environment}-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Memory-based scaling
resource "aws_appautoscaling_policy" "memory" {
  for_each = var.enable_autoscaling ? local.services : {}

  name               = "sendit-${var.environment}-${each.key}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 75.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "cluster_name"    { value = aws_ecs_cluster.main.name }
output "cluster_arn"     { value = aws_ecs_cluster.main.arn }
output "ecs_tasks_sg_id" { value = aws_security_group.ecs_tasks.id }
output "service_names"    { value = [for s in aws_ecs_service.services : s.name] }
output "service_name_map" { value = { for k, s in aws_ecs_service.services : k => s.name } }
output "log_group_arns"  { value = [for g in aws_cloudwatch_log_group.services : g.arn] }
output "service_ports"   { value = { for k, v in local.services : k => v.port } }
