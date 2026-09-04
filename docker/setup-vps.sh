#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
#  VPS Setup Script — Simple Single Cluster
#  Run once on your production server:
#    bash setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/grocery-shop"
echo "════════════════════════════════════════════"
echo "  Grocery Shop — Single Server Setup"
echo "════════════════════════════════════════════"

# ── 1. Install Docker & Docker Compose ──────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  usermod -aG docker "$USER"
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed: $(docker --version)"
fi

# ── 2. Create app directory structure ───────────────────────────────────
echo "📁 Creating app directory: $APP_DIR"
mkdir -p "$APP_DIR"
chown -R "$USER:$USER" "$APP_DIR"
cd "$APP_DIR"

# ── 3. Instructions ─────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  SETUP COMPLETE! To start your application:"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "  1. Copy docker-compose.yml and .env to $APP_DIR:"
echo "     scp docker-compose.yml .env user@YOUR_VPS:$APP_DIR/"
echo ""
echo "  2. Start everything in the background:"
echo "     cd $APP_DIR"
echo "     docker compose up -d"
echo ""
echo "  3. Open in browser:"
echo "     http://<YOUR_VPS_IP>/"
echo ""
