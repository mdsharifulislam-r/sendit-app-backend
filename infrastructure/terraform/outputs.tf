# ─── Terraform Outputs ────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB (for Route53 alias records)"
  value       = module.alb.alb_zone_id
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster write endpoint"
  value       = module.documentdb.cluster_endpoint
  sensitive   = true
}

output "documentdb_reader_endpoint" {
  description = "DocumentDB cluster read endpoint"
  value       = module.documentdb.cluster_reader_endpoint
  sensitive   = true
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = module.redis.primary_endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 uploads bucket name"
  value       = module.s3.bucket_name
}

output "sns_topic_arn" {
  description = "SNS events topic ARN"
  value       = module.messaging.sns_topic_arn
}

output "sqs_queue_urls" {
  description = "Per-service SQS queue URLs"
  value       = module.messaging.sqs_queue_urls
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = module.ecs.cluster_name
}

output "secrets_arn" {
  description = "Secrets Manager secret ARN"
  value       = module.secrets.secret_arn
  sensitive   = true
}

output "cloudwatch_alarm_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  value       = module.cloudwatch.alarm_topic_arn
}

# output "acm_certificate_arn" {
#   description = "ACM certificate ARN (disabled — ACM not deployed yet)"
#   value       = module.acm.certificate_arn
# }
