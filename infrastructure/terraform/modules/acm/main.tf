# ─── ACM Module ───────────────────────────────────────────────────────────────
# AWS Certificate Manager — DNS-validated TLS certificate
# ──────────────────────────────────────────────────────────────────────────────

variable "domain_name" {}
variable "aws_region"  {}

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = var.domain_name }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "certificate_arn"            { value = aws_acm_certificate.main.arn }
output "domain_validation_options"  { value = aws_acm_certificate.main.domain_validation_options }
