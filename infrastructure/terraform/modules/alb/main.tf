# ─── ALB Module ───────────────────────────────────────────────────────────────
# Application Load Balancer — public-facing, HTTPS only
# Routes traffic directly to each backend service via path-based rules
# Gateway removed — ALB handles routing
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"        {}
variable "vpc_id"             {}
variable "public_subnet_ids"  {}
# variable "certificate_arn"    {}

# ─── Service port map ─────────────────────────────────────────────────────────
locals {
  # Must match the ports defined in modules/ecs/main.tf locals.services
  services = {
    root          = { port = 3000 }
    trip          = { port = 3001 }
    communication = { port = 3002 }
    booking       = { port = 3003 }
    payment       = { port = 3004 }
    admin         = { port = 3005 }
  }

  # Path rules mirror apps/gateway gateway.service.ts:
  # route by first segment after /api/v1 (trip, booking, notification, …).
  # Default listener action → root (auth, user, address, …).
  routing_rules = [
    {
      service  = "trip"
      priority = 10
      paths    = ["/api/v1/trip*", "/api/v1/review*"]
    },
    {
      service  = "booking"
      priority = 20
      paths    = ["/api/v1/booking*"]
    },
    {
      service  = "communication"
      priority = 30
      paths    = [
        "/api/v1/notification*",
        "/api/v1/message*",
        "/api/v1/chat*",
        "/api/v1/disclaimer*",
        "/api/v1/report*",
      ]
    },
    {
      service  = "payment"
      priority = 40
      paths    = [
        "/api/v1/wallet*",
        "/api/v1/coupon*",
        "/api/v1/transaction*",
        "/api/v1/pricing-rules*",
      ]
    },
    {
      service  = "admin"
      priority = 50
      paths    = [
        "/api/v1/admin*",
        "/api/v1/ticket*",
        "/api/v1/risk-settings*",
        "/api/v1/audit-logs*",
      ]
    },
  ]
}

# ─── ALB Security Group ───────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "sendit-${var.environment}-alb-sg"
  description = "ALB security group - allow HTTP/HTTPS from internet"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "sendit-${var.environment}-alb-sg" }
}

# ─── ALB ──────────────────────────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "sendit-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
  idle_timeout               = 60

  access_logs {
    bucket  = "sendit-alb-logs-${var.environment}"
    enabled = false # Enable and create bucket if you need access logs
  }

  tags = { Name = "sendit-${var.environment}-alb" }
}

# ─── Target Groups — one per service ─────────────────────────────────────────
resource "aws_lb_target_group" "services" {
  for_each = local.services

  name        = "sendit-${var.environment}-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }

  deregistration_delay = 30
  tags                 = { Name = "sendit-${var.environment}-${each.key}-tg" }
}

# ─── HTTP Listener ────────────────────────────────────────────────────────────
# Default: forward to root service (HTTPS disabled for now)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["root"].arn
  }
}

# ─── Path-Based Routing Rules ─────────────────────────────────────────────────
resource "aws_lb_listener_rule" "service_routes" {
  for_each = { for r in local.routing_rules : r.service => r }

  listener_arn = aws_lb_listener.http.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  condition {
    path_pattern {
      values = each.value.paths
    }
  }

  tags = { Service = each.key }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "alb_arn"            { value = aws_lb.main.arn }
output "alb_dns_name"       { value = aws_lb.main.dns_name }
output "alb_zone_id"        { value = aws_lb.main.zone_id }
output "alb_sg_id"          { value = aws_security_group.alb.id }
# output "https_listener_arn" { value = aws_lb_listener.https.arn }
output "http_listener_arn"  { value = aws_lb_listener.http.arn }

# Map of service name → target group ARN — consumed by ECS module
output "service_tg_arns" {
  value = { for k, tg in aws_lb_target_group.services : k => tg.arn }
}
