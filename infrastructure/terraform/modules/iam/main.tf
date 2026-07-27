# ─── IAM Module ───────────────────────────────────────────────────────────────
# Least-privilege IAM roles for ECS Task Execution and ECS Tasks
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"     {}
variable "aws_region"      {}
variable "account_id"      {}
variable "sns_topic_arn"   {}
variable "sqs_queue_arns"  { type = list(string) }
variable "s3_bucket_arn"   {}
variable "documentdb_arn"  {}
variable "log_group_arns"  { type = list(string) }

# ─── ECS Task Execution Role ──────────────────────────────────────────────────
# Allows ECS agent to pull images and push logs
resource "aws_iam_role" "ecs_execution" {
  name = "sendit-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "sendit-${var.environment}-ecs-execution-role" }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow execution role to read secrets from Secrets Manager
resource "aws_iam_role_policy" "execution_secrets" {
  name = "sendit-${var.environment}-execution-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:sendit/${var.environment}/*"
      }
    ]
  })
}

# ─── ECS Task Role ────────────────────────────────────────────────────────────
# Permissions available to the application code inside running containers
resource "aws_iam_role" "ecs_task" {
  name = "sendit-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "sendit-${var.environment}-ecs-task-role" }
}

resource "aws_iam_role_policy" "task_permissions" {
  name = "sendit-${var.environment}-task-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 — upload and delete files
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = var.s3_bucket_arn
      },
      # SNS — publish events
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [var.sns_topic_arn, "arn:aws:sns:${var.aws_region}:${var.account_id}:*"]
      },
      # SQS — receive and manage messages
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = var.sqs_queue_arns
      },
      # CloudWatch Logs — write logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = concat(var.log_group_arns, ["${element(var.log_group_arns, 0)}:*"])
      },
      # Secrets Manager — read secrets at runtime (e.g., JWT_SECRET refresh)
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:sendit/${var.environment}/*"
      }
    ]
  })
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "ecs_execution_role_arn" { value = aws_iam_role.ecs_execution.arn }
output "ecs_task_role_arn"      { value = aws_iam_role.ecs_task.arn }
