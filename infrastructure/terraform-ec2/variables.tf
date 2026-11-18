variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name (e.g. ec2-dev, staging)"
  type        = string
  default     = "ec2-dev"
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "sendit"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "instance_type" {
  description = "EC2 instance type for the all-in-one box"
  type        = string
  default     = "t3.xlarge"
}

variable "root_volume_gb" {
  type    = number
  default = 40
}

variable "key_name" {
  description = "Existing EC2 key pair name. Leave empty to auto-create and write *.pem next to this module."
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (prefer your IP/32)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "dockerhub_username" {
  description = "Docker Hub org/user that hosts sendit-* images"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag for all services"
  type        = string
  default     = "latest"
}

variable "gateway_port" {
  type    = number
  default = 3010
}

variable "aws_secret_name" {
  description = "Secrets Manager secret name loaded by apps at boot (optional)"
  type        = string
  default     = ""
}

variable "create_elastic_ip" {
  description = "Attach a static Elastic IP"
  type        = bool
  default     = true
}

variable "enable_documentdb" {
  description = "Create DocumentDB in this VPC and point apps at it"
  type        = bool
  default     = true
}

variable "db_master_username" {
  type      = string
  default   = "senditadmin"
  sensitive = true
}

variable "db_master_password" {
  type      = string
  sensitive = true
}

variable "documentdb_instance_count" {
  type    = number
  default = 1
}

variable "documentdb_instance_class" {
  type    = string
  default = "db.t3.medium"
}
