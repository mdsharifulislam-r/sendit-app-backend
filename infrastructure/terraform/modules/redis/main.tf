# ─── Redis Module ─────────────────────────────────────────────────────────────
# Amazon ElastiCache Redis for Sendit caching layer
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"        {}
variable "vpc_id"             {}
variable "private_subnet_ids" {}
variable "ecs_sg_id"          {}
variable "node_type"          { default = "cache.t3.micro" }

# ─── Security Group ───────────────────────────────────────────────────────────
resource "aws_security_group" "redis" {
  name        = "sendit-${var.environment}-redis-sg"
  description = "ElastiCache Redis security group"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "sendit-${var.environment}-redis-sg" }
}

# ─── Subnet Group ─────────────────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "sendit-${var.environment}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "sendit-${var.environment}-redis-subnet-group" }
}

# ─── Parameter Group ─────────────────────────────────────────────────────────
resource "aws_elasticache_parameter_group" "main" {
  name   = "sendit-${var.environment}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = { Name = "sendit-${var.environment}-redis-params" }
}

# ─── Replication Group (HA) ───────────────────────────────────────────────────
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "sendit-${var.environment}-redis"
  description                = "Sendit Redis cache cluster"
  node_type                  = var.node_type
  num_cache_clusters         = 2
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true
  multi_az_enabled           = true
  engine_version             = "7.1"
  snapshot_retention_limit   = 3
  snapshot_window            = "03:00-04:00"
  maintenance_window         = "sun:04:00-sun:05:00"

  tags = { Name = "sendit-${var.environment}-redis" }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "primary_endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}
output "reader_endpoint" {
  value = aws_elasticache_replication_group.main.reader_endpoint_address
}
output "port" {
  value = 6379
}
output "sg_id" {
  value = aws_security_group.redis.id
}
