variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_services" {
  type = map(string)
}

variable "enable_monitoring" {
  description = "Create CloudWatch alarms and dashboard (requires cloudwatch permissions)"
  type        = bool
  default     = false
}
