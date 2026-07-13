# ─── DocumentDB Module ────────────────────────────────────────────────────────
# Amazon DocumentDB (MongoDB-compatible) for Sendit
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"        {}
variable "vpc_id"             {}
variable "private_subnet_ids" {}
variable "ecs_sg_id"          {}
variable "db_master_username" { sensitive = true }
variable "db_master_password" { sensitive = true }
variable "instance_count"     { default = 2 }
variable "instance_class"     { default = "db.t3.medium" }

# ─── Security Group ───────────────────────────────────────────────────────────
resource "aws_security_group" "documentdb" {
  name        = "sendit-${var.environment}-documentdb-sg"
  description = "DocumentDB cluster security group"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB from ECS tasks"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "sendit-${var.environment}-documentdb-sg" }
}

# ─── Subnet Group ─────────────────────────────────────────────────────────────
resource "aws_docdb_subnet_group" "main" {
  name       = "sendit-${var.environment}-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "sendit-${var.environment}-docdb-subnet-group" }
}

# ─── Cluster Parameter Group ──────────────────────────────────────────────────
resource "aws_docdb_cluster_parameter_group" "main" {
  family      = "docdb5.0"
  name        = "sendit-${var.environment}-docdb-params"
  description = "DocumentDB cluster parameter group for Sendit"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = { Name = "sendit-${var.environment}-docdb-params" }
}

# ─── Cluster ──────────────────────────────────────────────────────────────────
resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "sendit-${var.environment}-docdb"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.db_master_username
  master_password                 = var.db_master_password
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.documentdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  storage_encrypted               = true
  backup_retention_period         = 7
  preferred_backup_window         = "02:00-03:00"
  preferred_maintenance_window    = "sun:03:00-sun:04:00"
  skip_final_snapshot             = false
  final_snapshot_identifier       = "sendit-${var.environment}-final-snapshot"
  deletion_protection             = true

  tags = { Name = "sendit-${var.environment}-docdb" }
}

# ─── Cluster Instances ────────────────────────────────────────────────────────
resource "aws_docdb_cluster_instance" "main" {
  count              = var.instance_count
  identifier         = "sendit-${var.environment}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class

  tags = { Name = "sendit-${var.environment}-docdb-${count.index}" }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "cluster_endpoint"         { value = aws_docdb_cluster.main.endpoint }
output "cluster_reader_endpoint"  { value = aws_docdb_cluster.main.reader_endpoint }
output "cluster_port"             { value = aws_docdb_cluster.main.port }
output "cluster_arn"              { value = aws_docdb_cluster.main.arn }
