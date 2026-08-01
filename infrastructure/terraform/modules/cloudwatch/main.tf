# ─── CloudWatch Module ────────────────────────────────────────────────────────
# Log groups, dashboards, alarms for all Sendit ECS services
# ──────────────────────────────────────────────────────────────────────────────

# ─── SNS Alarm Topic ──────────────────────────────────────────────────────────
resource "aws_sns_topic" "alarms" {
  count = var.enable_monitoring ? 1 : 0
  name  = "sendit-${var.environment}-alarms"
  tags  = { Name = "sendit-${var.environment}-alarms" }
}

# ─── CPU Alarms ───────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  for_each = var.enable_monitoring ? var.ecs_services : {}

  alarm_name          = "sendit-${var.environment}-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "CPU > 85% for ${each.key}"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  ok_actions          = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }
}

# ─── Memory Alarms ────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  for_each = var.enable_monitoring ? var.ecs_services : {}

  alarm_name          = "sendit-${var.environment}-${each.key}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Memory > 85% for ${each.key}"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  ok_actions          = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }
}

# ─── Task Count Alarm (service degraded) ─────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "task_count_low" {
  for_each = var.enable_monitoring ? var.ecs_services : {}

  alarm_name          = "sendit-${var.environment}-${each.key}-tasks-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Running tasks < 1 for ${each.key}"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }
}

# ─── Dashboard ────────────────────────────────────────────────────────────────
resource "aws_cloudwatch_dashboard" "main" {
  count          = var.enable_monitoring ? 1 : 0
  dashboard_name = "sendit-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 24
        height = 6
        properties = {
          title  = "ECS CPU Utilization"
          region = var.aws_region
          period = 60
          view   = "timeSeries"
          metrics = [
            for svc in values(var.ecs_services) : [
              "AWS/ECS", "CPUUtilization",
              "ClusterName", var.ecs_cluster_name,
              "ServiceName", svc,
              { stat = "Average", label = svc }
            ]
          ]
        }
      },
      {
        type   = "metric"
        width  = 24
        height = 6
        properties = {
          title  = "ECS Memory Utilization"
          region = var.aws_region
          period = 60
          view   = "timeSeries"
          metrics = [
            for svc in values(var.ecs_services) : [
              "AWS/ECS", "MemoryUtilization",
              "ClusterName", var.ecs_cluster_name,
              "ServiceName", svc,
              { stat = "Average", label = svc }
            ]
          ]
        }
      }
    ]
  })
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "alarm_topic_arn" {
  value = var.enable_monitoring ? aws_sns_topic.alarms[0].arn : null
}
output "log_group_arns" {
  value = []
}
