# ─── ALB Module ───────────────────────────────────────────────────────────────
# Application Load Balancer — public-facing, HTTPS only
# Routes all traffic to the gateway service (port 3010)
# ──────────────────────────────────────────────────────────────────────────────

variable "environment"        {}
variable "vpc_id"             {}
variable "public_subnet_ids"  {}
variable "certificate_arn"    {}

# ─── ALB Security Group ───────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "sendit-${var.environment}-alb-sg"
  description = "ALB security group — allow HTTP/HTTPS from internet"
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

# ─── HTTPS Listener ───────────────────────────────────────────────────────────
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  # Default: forward to gateway target group
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }
}

# ─── HTTP → HTTPS Redirect ────────────────────────────────────────────────────
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── Target Group — Gateway ──────────────────────────────────────────────────
# All external traffic goes through the gateway service
resource "aws_lb_target_group" "gateway" {
  name        = "sendit-${var.environment}-gateway"
  port        = 3010
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

  tags = { Name = "sendit-${var.environment}-gateway-tg" }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "alb_arn"               { value = aws_lb.main.arn }
output "alb_dns_name"          { value = aws_lb.main.dns_name }
output "alb_zone_id"           { value = aws_lb.main.zone_id }
output "alb_sg_id"             { value = aws_security_group.alb.id }
output "https_listener_arn"    { value = aws_lb_listener.https.arn }
output "http_listener_arn"     { value = aws_lb_listener.http_redirect.arn }
output "gateway_target_group_arn" { value = aws_lb_target_group.gateway.arn }
