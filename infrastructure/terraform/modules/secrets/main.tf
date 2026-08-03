# ─── Secrets Module ───────────────────────────────────────────────────────────
# Creates the app secret in AWS Secrets Manager.
# At container start each service calls loadAwsSecrets()
# (utils/helper-modules/secret-manager/load-aws-secrets.ts) which reads this
# secret and merges all keys into process.env.
#
# Terraform seeds placeholder values from secrets.template.json on first apply.
# After that, update real values via AWS Console or CLI — Terraform will not
# overwrite them (see lifecycle.ignore_changes on secret_version).
#
# ECS only needs AWS_SECRET_NAME + AWS_REGION as plain env vars (set by Terraform).
# ──────────────────────────────────────────────────────────────────────────────

variable "environment" {}

resource "aws_secretsmanager_secret" "app" {
  name        = "sendit-${var.environment}-app-secret"
  description = "Application secrets for Sendit ${var.environment}"

  tags = {
    Name = "sendit-${var.environment}-app-secret"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id     = aws_secretsmanager_secret.app.id
  secret_string = file("${path.module}/secrets.template.json")

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "secret_arn"  { value = aws_secretsmanager_secret.app.arn }
output "secret_name" { value = aws_secretsmanager_secret.app.name }
