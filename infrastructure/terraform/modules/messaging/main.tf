# ─── Messaging Module ─────────────────────────────────────────────────────────
# AWS SNS Topic + SQS Queues for all Sendit microservices
# Architecture: Services publish to SNS → fan-out to per-service SQS queues
# ──────────────────────────────────────────────────────────────────────────────

variable "environment" {}

# ─── SNS Topic ────────────────────────────────────────────────────────────────
resource "aws_sns_topic" "main" {
  name = "sendit-${var.environment}-events"
  tags = { Name = "sendit-${var.environment}-events" }
}

# ─── SQS Queues per service ───────────────────────────────────────────────────
locals {
  services = ["communication", "booking", "payment", "trip", "admin"]
}

# Dead Letter Queues
resource "aws_sqs_queue" "dlq" {
  for_each                    = toset(local.services)
  name                        = "sendit-${var.environment}-${each.key}-dlq"
  message_retention_seconds   = 1209600 # 14 days
  tags                        = { Name = "sendit-${var.environment}-${each.key}-dlq" }
}

# Main Queues
resource "aws_sqs_queue" "main" {
  for_each                    = toset(local.services)
  name                        = "sendit-${var.environment}-${each.key}"
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400 # 1 day
  receive_wait_time_seconds   = 20    # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  tags = { Name = "sendit-${var.environment}-${each.key}" }
}

# ─── SQS Queue Policy (allow SNS to send) ────────────────────────────────────
resource "aws_sqs_queue_policy" "main" {
  for_each  = toset(local.services)
  queue_url = aws_sqs_queue.main[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.main[each.key].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.main.arn
          }
        }
      }
    ]
  })
}

# ─── SNS Subscriptions ────────────────────────────────────────────────────────
resource "aws_sns_topic_subscription" "main" {
  for_each  = toset(local.services)
  topic_arn = aws_sns_topic.main.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.main[each.key].arn

  # Raw message delivery so services can parse directly
  raw_message_delivery = false
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "sns_topic_arn" {
  value = aws_sns_topic.main.arn
}

output "main_sqs_queue_url" {
  description = "Default SQS queue URL (shared fallback)"
  value       = aws_sqs_queue.main["communication"].url
}

output "sqs_queue_urls" {
  value = { for s in local.services : s => aws_sqs_queue.main[s].url }
}

output "sqs_queue_arns" {
  value = concat(
    [for s in local.services : aws_sqs_queue.main[s].arn],
    [for s in local.services : aws_sqs_queue.dlq[s].arn]
  )
}
