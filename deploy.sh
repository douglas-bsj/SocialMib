#!/bin/bash
# SocialPost — Production Deploy Script
# Usage: ./deploy.sh [--ssl] [--rebuild]
set -euo pipefail

DOMAIN=${DOMAIN:-""}
EMAIL=${EMAIL:-""}
SSL=false
REBUILD=false

for arg in "$@"; do
  case $arg in
    --ssl)     SSL=true ;;
    --rebuild) REBUILD=true ;;
  esac
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SocialPost — Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Pre-flight checks ──────────────────────────────────────────────────────────
if [ ! -f .env.production ]; then
  echo "✗ .env.production not found. Copy .env.production.example and fill in values."
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "✗ Docker not installed. Install via: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

# ── Update nginx config with domain ───────────────────────────────────────────
if [ -n "$DOMAIN" ]; then
  echo "→ Configuring domain: $DOMAIN"
  sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/app.conf
fi

# ── Build images ───────────────────────────────────────────────────────────────
if [ "$REBUILD" = true ] || ! docker image inspect socialpost-app:latest &>/dev/null; then
  echo "→ Building Docker images..."
  docker compose -f docker-compose.prod.yml build --no-cache
else
  echo "→ Images already built (use --rebuild to force)"
fi

# ── Obtain SSL certificate (first time) ───────────────────────────────────────
if [ "$SSL" = true ]; then
  if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "✗ --ssl requires DOMAIN and EMAIL environment variables."
    echo "  Example: DOMAIN=app.example.com EMAIL=admin@example.com ./deploy.sh --ssl"
    exit 1
  fi

  echo "→ Starting nginx for ACME challenge..."
  docker compose -f docker-compose.prod.yml up -d nginx

  echo "→ Obtaining SSL certificate for $DOMAIN..."
  docker compose -f docker-compose.prod.yml run --rm certbot \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

  echo "✓ Certificate obtained. Reloading nginx..."
  docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
fi

# ── Start all services ─────────────────────────────────────────────────────────
echo "→ Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Deploy complete!"
if [ -n "$DOMAIN" ]; then
  echo "  URL: https://$DOMAIN"
else
  echo "  URL: http://$(hostname -I | awk '{print $1}')"
fi
echo ""
echo "  Useful commands:"
echo "  docker compose -f docker-compose.prod.yml logs -f app"
echo "  docker compose -f docker-compose.prod.yml logs -f worker"
echo "  docker compose -f docker-compose.prod.yml ps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
