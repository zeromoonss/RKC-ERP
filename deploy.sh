#!/bin/bash
# ============================================
# RKC ERP - Production Deploy Script
# Run on VPS: bash deploy.sh
# ============================================

set -e

echo "🚀 RKC ERP Deploy Starting..."
echo "=================================="

APP_DIR="/var/www/rkc-erp"
REPO_URL="https://github.com/YOUR_REPO/rkc-erp.git"  # ← Change this

# ── 1. Update code ──
echo "📥 Pulling latest code..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 2. Install dependencies ──
echo "📦 Installing dependencies..."
npm ci --production=false

# ── 3. Generate Prisma client ──
echo "🗄️  Generating Prisma client..."
cd apps/api
npx prisma generate
npx prisma db push --accept-data-loss
cd ../..

# ── 4. Build API (NestJS) ──
echo "🔨 Building API..."
cd apps/api
npm run build
cd ../..

# ── 5. Build Web (Next.js) ──
echo "🔨 Building Web..."
cd apps/web
npm run build
cd ../..

# ── 6. Create logs directory ──
mkdir -p logs

# ── 7. Restart with PM2 ──
echo "♻️  Restarting PM2 processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ Deploy Complete!"
echo "=================================="
echo "  🌐 Web:  http://localhost:3000"
echo "  🔧 API:  http://localhost:4000/api"
echo "  📊 PM2:  pm2 monit"
echo "  📋 Logs: pm2 logs"
echo "=================================="
