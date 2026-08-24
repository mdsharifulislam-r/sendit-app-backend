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
  services = ["root", "communication", "booking", "payment", "trip", "admin"]

  # Only deliver events to the service that actually handles them.
  # Without this, SNS copies every message to every queue; root then retries
  # email.send until it lands in sendit-dev-root-dlq.
  queue_event_filters = {
    root = [
      "device.create",
      "referral.create",
    ]
    communication = [
      "email.send",
      "notification.send",
      "chat.create",
      "chat.report.create",
    ]
    booking = [
      "qr.code.generate",
    ]
    payment = [
      "wallet.created",
      "wallet.diposit",
      "wallet.add.payment",
      "add.balance",
      "transaction.created",
      "coupon.used",
    ]
    trip = [
      "review.calculate",
    ]
    admin = [
      "audit.create",
      "audit.log.create",
      "risk.item.create",
    ]
  }
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

data "aws_caller_identity" "current" {}

# ─── SQS Queue Policy (SNS fan-out + same-account ECS SendMessage) ───────────
resource "aws_sqs_queue_policy" "main" {
  for_each  = toset(local.services)
  queue_url = aws_sqs_queue.main[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSnsFanout"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.main[each.key].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.main.arn
          }
        }
      },
      {
        Sid       = "AllowAccountSendMessage"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.main[each.key].arn
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

  raw_message_delivery = false
  filter_policy_scope  = "MessageAttributes"
  filter_policy = jsonencode({
    eventType = local.queue_event_filters[each.key]
  })
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "sns_topic_arn" {
  value = aws_sns_topic.main.arn
}

output "main_sqs_queue_url" {
  description = "Default SQS queue URL (shared fallback)"
  value       = aws_sqs_queue.main["root"].url
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
