#!/bin/bash
set -euxo pipefail

APP_DIR=/opt/sendit
DOCKERHUB_USERNAME="${dockerhub_username}"
IMAGE_TAG="${image_tag}"
AWS_REGION="${aws_region}"
AWS_SECRET_NAME="${aws_secret_name}"

# AL2023 ships curl-minimal — do NOT install curl (conflicts and aborts bootstrap)
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Unpack compose + nginx from Terraform (base64)
echo "${docker_compose_b64}" | base64 -d > "$APP_DIR/docker-compose.yml"
echo "${nginx_conf_b64}" | base64 -d > "$APP_DIR/nginx.conf"
echo "${proxy_params_b64}" | base64 -d > "$APP_DIR/proxy_params"

cat > "$APP_DIR/.env.compose" <<EOF
DOCKERHUB_USERNAME=$${DOCKERHUB_USERNAME}
IMAGE_TAG=$${IMAGE_TAG}
EOF

cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
AWS_REGION=$${AWS_REGION}
%{ if aws_secret_name != "" ~}
AWS_SECRET_NAME=$${AWS_SECRET_NAME}
%{ endif ~}
DB_URI=mongodb://mongo:27017/sendit
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_TLS=false
IP_ADDRESS=0.0.0.0
PORT=3000
TRIP_SERVER_PORT=3001
COMMUNICATION_PORT=3002
BOOKING_PORT=3003
PAYMENT_PORT=3004
ADMIN_PORT=3005
JWT_SECRET=change-me-after-boot
JWT_EXPIRE_IN=7d
CORS_ORIGIN=*
EOF

chown -R ec2-user:ec2-user "$APP_DIR"

cat > /usr/local/bin/sendit-up <<'EOF'
#!/bin/bash
cd /opt/sendit || exit 1
docker compose --env-file .env.compose pull
docker compose --env-file .env.compose up -d
EOF
cat > /usr/local/bin/sendit-down <<'EOF'
#!/bin/bash
cd /opt/sendit && docker compose --env-file .env.compose down
EOF
cat > /usr/local/bin/sendit-logs <<'EOF'
#!/bin/bash
cd /opt/sendit && docker compose --env-file .env.compose logs -f --tail=200 "$@"
EOF
chmod +x /usr/local/bin/sendit-up /usr/local/bin/sendit-down /usr/local/bin/sendit-logs

cd "$APP_DIR"
docker compose --env-file .env.compose pull || true
docker compose --env-file .env.compose up -d

echo "bootstrap ok $(date -u)" > /var/log/sendit-bootstrap.log
