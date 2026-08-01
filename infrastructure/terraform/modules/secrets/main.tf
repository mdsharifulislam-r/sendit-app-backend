# ─── Secrets Module ───────────────────────────────────────────────────────────
# References the existing client-managed secret in AWS Secrets Manager.
# Populate/update values via AWS Console or CLI — not via Terraform.
# ──────────────────────────────────────────────────────────────────────────────

variable "environment" {}

data "aws_secretsmanager_secret" "app" {
  name = "sendit-${var.environment}-app-secret"
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "secret_arn" { value = data.aws_secretsmanager_secret.app.arn }
output "secret_name" { value = data.aws_secretsmanager_secret.app.name }
