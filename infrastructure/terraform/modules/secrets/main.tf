# ─── Secrets Module ───────────────────────────────────────────────────────────
# AWS Secrets Manager — all production secrets for Sendit
# These replace plaintext .env values
# ──────────────────────────────────────────────────────────────────────────────

variable "environment" {}

# ─── Master secret (single JSON blob) ────────────────────────────────────────
resource "aws_secretsmanager_secret" "app" {
  name                    = "sendit/${var.environment}/app-secrets"
  description             = "All Sendit production application secrets"
  recovery_window_in_days = 7

  tags = { Name = "sendit/${var.environment}/app-secrets" }
}

# ─── Secret value template ────────────────────────────────────────────────────
# DO NOT store real credentials here. Populate via:
#   aws secretsmanager put-secret-value \
#     --secret-id sendit/production/app-secrets \
#     --secret-string '{"JWT_SECRET":"...","STRIPE_SECRET_KEY":"...",...}'
resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    # Application
    NODE_ENV             = "production"
    CORS_ORIGIN          = "https://your-frontend-domain.com"

    # JWT
    JWT_SECRET           = "REPLACE_WITH_STRONG_RANDOM_SECRET"
    JWT_EXPIRE_IN        = "7d"

    # Database
    DB_URI               = "REPLACE_WITH_DOCUMENTDB_URI"

    # Redis
    REDIS_HOST           = "REPLACE_WITH_ELASTICACHE_ENDPOINT"
    REDIS_PORT           = "6379"

    # Email (SMTP)
    EMAIL_HOST           = "smtp.gmail.com"
    EMAIL_PORT           = "587"
    EMAIL_USER           = "REPLACE_WITH_EMAIL"
    EMAIL_PASS           = "REPLACE_WITH_EMAIL_APP_PASSWORD"
    EMAIL_FROM           = "REPLACE_WITH_EMAIL"

    # Super Admin
    SUPER_ADMIN_EMAIL    = "REPLACE_WITH_ADMIN_EMAIL"
    SUPER_ADMIN_PASSWORD = "REPLACE_WITH_STRONG_PASSWORD"

    # AWS
    AWS_ACCESS_KEY_ID     = "REPLACE_OR_USE_INSTANCE_PROFILE"
    AWS_SECRET_ACCESS_KEY = "REPLACE_OR_USE_INSTANCE_PROFILE"
    AWS_REGION            = "eu-north-1"
    AWS_BUCKET_NAME       = "REPLACE_WITH_BUCKET_NAME"
    SNS_TOPIC_ARN         = "REPLACE_WITH_SNS_ARN"
    SQS_QUEUE_URL         = "REPLACE_WITH_MAIN_SQS_URL"

    # Per-service SQS queues
    COMMUNICATION_SQS_QUEUE_URL = "REPLACE"
    BOOKING_SQS_QUEUE_URL       = "REPLACE"
    PAYMENT_SQS_QUEUE_URL       = "REPLACE"
    TRIP_SQS_QUEUE_URL          = "REPLACE"

    # Stripe
    STRIPE_SECRET_KEY      = "REPLACE_WITH_LIVE_KEY"
    STRIPE_WEBHOOK_SECRET  = "REPLACE_WITH_WEBHOOK_SECRET"

    # OpenAI (optional)
    OPENAI_API_KEY = "REPLACE_IF_NEEDED"
  })

  lifecycle {
    # Prevent Terraform from overwriting secrets updated via CLI/Console
    ignore_changes = [secret_string]
  }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "secret_arn"  { value = aws_secretsmanager_secret.app.arn }
output "secret_name" { value = aws_secretsmanager_secret.app.name }
