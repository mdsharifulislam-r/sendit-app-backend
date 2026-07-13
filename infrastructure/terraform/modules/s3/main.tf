# ─── S3 Module ────────────────────────────────────────────────────────────────
# S3 bucket for Sendit file uploads (KYC, proof images, damage images, avatars)
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"  {}
variable "bucket_name"  {}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${var.bucket_name}-${random_id.suffix.hex}"

  tags = { Name = "${var.bucket_name}", Purpose = "file-uploads" }
}

# ─── Block all public access ──────────────────────────────────────────────────
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Encryption at rest ───────────────────────────────────────────────────────
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─── Versioning ───────────────────────────────────────────────────────────────
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ─── CORS for presigned URL uploads ──────────────────────────────────────────
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"] # Restrict to your frontend domain in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ─── Lifecycle rules ──────────────────────────────────────────────────────────
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "expire-temp-uploads"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }

  rule {
    id     = "transition-old-uploads"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "bucket_name" { value = aws_s3_bucket.uploads.bucket }
output "bucket_arn"  { value = aws_s3_bucket.uploads.arn }
output "bucket_regional_domain_name" {
  value = aws_s3_bucket.uploads.bucket_regional_domain_name
}
