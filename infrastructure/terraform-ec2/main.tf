# ─── Sendit EC2 all-in-one stack ──────────────────────────────────────────────
# Separate from infrastructure/terraform (ECS/Fargate).
# Deploys one EC2 that runs gateway + all Nest services via Docker Compose.
# ──────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }

  # Local state — avoids sharing the ECS S3 state bucket (that bucket returned 403
  # for any key other than the existing production state object).
  # Optional later: migrate to your own S3 bucket with:
  #   backend "s3" { bucket = "..." key = "ec2-all-in-one/terraform.tfstate" region = "eu-central-1" encrypt = true }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Stack       = "ec2-all-in-one"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  name_prefix        = "${var.project}-${var.environment}"
  az                 = data.aws_availability_zones.available.names[0]
  az_b               = data.aws_availability_zones.available.names[1]
  create_key_pair    = var.key_name == null || var.key_name == ""
  effective_key_name = local.create_key_pair ? aws_key_pair.generated[0].key_name : var.key_name
  db_uri = var.enable_documentdb ? format(
    "mongodb://%s:%s@%s:27017/sendit?tls=true&tlsCAFile=/app/certs/rds-global-bundle.pem&replicaSet=rs0&readPreference=primary&retryWrites=false&authMechanism=SCRAM-SHA-1",
    var.db_master_username,
    urlencode(var.db_master_password),
    aws_docdb_cluster.main[0].endpoint,
  ) : "mongodb://mongo:27017/sendit"
}

# Create SSH key when key_name is empty (region currently has no key pairs)
resource "tls_private_key" "ssh" {
  count     = local.create_key_pair ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated" {
  count      = local.create_key_pair ? 1 : 0
  key_name   = "${local.name_prefix}-ec2"
  public_key = tls_private_key.ssh[0].public_key_openssh
}

resource "local_sensitive_file" "ssh_private_key" {
  count           = local.create_key_pair ? 1 : 0
  filename        = "${path.module}/${local.name_prefix}-ec2.pem"
  content         = tls_private_key.ssh[0].private_key_pem
  file_permission = "0600"
}

# ─── Networking (isolated from ECS VPC) ───────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 0)
  availability_zone       = local.az
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name_prefix}-public" }
}

# Second AZ required for DocumentDB subnet group
resource "aws_subnet" "public_b" {
  count                   = var.enable_documentdb ? 1 : 0
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 1)
  availability_zone       = local.az_b
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name_prefix}-public-b" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  count          = var.enable_documentdb ? 1 : 0
  subnet_id      = aws_subnet.public_b[0].id
  route_table_id = aws_route_table.public.id
}

# ─── DocumentDB (Mongo-compatible) in the same VPC as EC2 ─────────────────────
resource "aws_security_group" "documentdb" {
  count       = var.enable_documentdb ? 1 : 0
  name        = "${local.name_prefix}-docdb-sg"
  description = "DocumentDB for EC2 all-in-one"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MongoDB from EC2"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-docdb-sg" }
}

resource "aws_docdb_subnet_group" "main" {
  count      = var.enable_documentdb ? 1 : 0
  name       = "${local.name_prefix}-docdb-subnets"
  subnet_ids = [aws_subnet.public.id, aws_subnet.public_b[0].id]
  tags       = { Name = "${local.name_prefix}-docdb-subnets" }
}

resource "aws_docdb_cluster_parameter_group" "main" {
  count       = var.enable_documentdb ? 1 : 0
  family      = "docdb5.0"
  name        = "${local.name_prefix}-docdb-params"
  description = "EC2 stack DocumentDB params"

  parameter {
    name  = "tls"
    value = "enabled"
  }
}

resource "aws_docdb_cluster" "main" {
  count                           = var.enable_documentdb ? 1 : 0
  cluster_identifier              = "${local.name_prefix}-docdb"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.db_master_username
  master_password                 = var.db_master_password
  db_subnet_group_name            = aws_docdb_subnet_group.main[0].name
  vpc_security_group_ids          = [aws_security_group.documentdb[0].id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main[0].name
  storage_encrypted               = true
  backup_retention_period         = 1
  skip_final_snapshot             = true
  deletion_protection             = false
  tags                            = { Name = "${local.name_prefix}-docdb" }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = var.enable_documentdb ? var.documentdb_instance_count : 0
  identifier         = "${local.name_prefix}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main[0].id
  instance_class     = var.documentdb_instance_class
  tags               = { Name = "${local.name_prefix}-docdb-${count.index}" }
}

# ─── Security group ───────────────────────────────────────────────────────────
resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "Sendit all-in-one EC2"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "API Gateway"
    from_port   = var.gateway_port
    to_port     = var.gateway_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Optional direct service ports (debug); gateway is the public entry
  ingress {
    description = "Nest service ports"
    from_port   = 3000
    to_port     = 3005
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-ec2-sg" }
}

# ─── IAM (Secrets Manager + S3 + SNS/SQS optional) ────────────────────────────
resource "aws_iam_role" "ec2" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ec2" {
  name = "${local.name_prefix}-ec2-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueAttributes",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ─── EC2 ──────────────────────────────────────────────────────────────────────
resource "aws_instance" "app" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  key_name                    = local.effective_key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true

  # Hop limit 2 so Docker containers can use the instance role (IMDSv2)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_size = var.root_volume_gb
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user-data.sh.tpl", {
    dockerhub_username = var.dockerhub_username
    image_tag          = var.image_tag
    aws_region         = var.aws_region
    aws_secret_name    = var.aws_secret_name
    docker_compose_b64 = base64encode(file("${path.module}/docker-compose.yml"))
    nginx_conf_b64     = base64encode(file("${path.module}/nginx.conf"))
    proxy_params_b64   = base64encode(file("${path.module}/proxy_params"))
  })

  # Keep false so adding DocumentDB / compose edits does not replace the running box
  user_data_replace_on_change = false

  tags = {
    Name = "${local.name_prefix}-app"
  }
}

resource "aws_eip" "app" {
  count    = var.create_elastic_ip ? 1 : 0
  domain   = "vpc"
  instance = aws_instance.app.id
  tags     = { Name = "${local.name_prefix}-eip" }
}
