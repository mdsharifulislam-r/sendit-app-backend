# ─── Terraform Variables Values ───────────────────────────────────────────────
# Copy this file to terraform.tfvars and fill in values
# NEVER commit terraform.tfvars to git
# ──────────────────────────────────────────────────────────────────────────────

aws_region  = "eu-central-1"
environment = "production"

# Networking
vpc_cidr = "10.0.0.0/16"

# Domain 
domain_name = "api.sendit.app"

# Docker Hub
dockerhub_username = "shariful1234"

# Service images — updated by CI/CD automatically
service_images = {
  root          = "latest"
  trip          = "latest"
  booking       = "latest"
  communication = "latest"
  payment       = "latest"
  admin         = "latest"
}

# DocumentDB
db_master_username        = "senditadmin"
db_master_password        = "REPLACE_WITH_STRONG_PASSWORD"
documentdb_instance_count = 2
documentdb_instance_class = "db.t3.medium"

# Redis
redis_node_type = "cache.t3.micro"

# S3
s3_bucket_name = "sendit-uploads-production"
