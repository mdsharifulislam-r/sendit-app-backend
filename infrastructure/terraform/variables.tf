# ─── Global ───────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
}

# ─── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ─── Domain & TLS ─────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain name for ACM and Route53 (e.g. api.sendit.app)"
  type        = string
  # REQUIRED — fill in your domain
}

# ─── Docker Hub ───────────────────────────────────────────────────────────────

variable "dockerhub_username" {
  description = "Docker Hub username for image references"
  type        = string
}

variable "service_images" {
  description = "Map of service name to Docker image tag. Set by CI/CD."
  type        = map(string)
  default = {
    root          = "latest"
    trip          = "latest"
    booking       = "latest"
    communication = "latest"
    payment       = "latest"
    admin         = "latest"
  }
}

# ─── DocumentDB ───────────────────────────────────────────────────────────────

variable "db_master_username" {
  description = "DocumentDB master username"
  type        = string
  default     = "senditadmin"
  sensitive   = true
}

variable "db_master_password" {
  description = "DocumentDB master password"
  type        = string
  sensitive   = true
}

variable "documentdb_instance_count" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 2
}

variable "documentdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

# ─── Redis ────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

# ─── S3 ──────────────────────────────────────────────────────────────────────

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for file uploads"
  type        = string
  default     = "sendit-uploads-production"
}
