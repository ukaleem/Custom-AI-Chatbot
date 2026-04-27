# Deployment Guide — Custom AI Chatbot Platform

## Option A — Railway (Recommended for first deployment)

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Create a Railway project
1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select your repository
3. Railway auto-detects `apps/api/Dockerfile`

### 3. Add services
In the Railway dashboard, add:
- **MongoDB** plugin
- **Redis** plugin

### 4. Set environment variables
In Railway → Variables:
```
NODE_ENV=production
SUPER_ADMIN_KEY=<generate: openssl rand -hex 32>
JWT_SECRET=<generate: openssl rand -hex 32>
ALLOWED_ORIGINS=https://your-admin-domain.com
STRIPE_SECRET_KEY=sk_live_...       (optional)
STRIPE_WEBHOOK_SECRET=whsec_...     (optional)
STRIPE_PRICE_STARTER=price_...      (optional)
STRIPE_PRICE_PRO=price_...          (optional)
```

Railway auto-provides `MONGODB_URI` and `REDIS_URL` from the plugins.

### 5. Custom domain
Railway Settings → Networking → Add custom domain → point DNS CNAME to Railway.

---

## Option B — Render

### 1. Create Web Service
- Go to https://render.com → New → Web Service
- Connect GitHub repo
- Build Command: `npm ci --legacy-peer-deps && npm run build:api && node apps/widget/build.js --production`
- Start Command: `node dist/apps/api/main.js`
- Docker: use `apps/api/Dockerfile`

### 2. Add databases
- New → PostgreSQL → skip (we use MongoDB)
- New → Redis → add Redis service
- Use MongoDB Atlas free tier for managed MongoDB

### 3. Environment variables
Same as Railway section above, plus:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatbot
REDIS_HOST=<render-redis-host>
REDIS_PORT=6379
QDRANT_URL=https://your-qdrant-cluster.cloud.qdrant.io
```

---

## Option C — DigitalOcean App Platform

```bash
# Install doctl
brew install doctl
doctl auth init

# Create app from spec
doctl apps create --spec .do/app.yaml
```

Create `.do/app.yaml`:
```yaml
name: custom-ai-chatbot
services:
  - name: api
    dockerfile_path: apps/api/Dockerfile
    source_dir: /
    envs:
      - key: NODE_ENV
        value: production
      - key: SUPER_ADMIN_KEY
        value: ENC[your-encrypted-value]
    http_port: 3000
    health_check:
      http_path: /api/v1/health
```

---

## Option D — Self-hosted (VPS / Docker Compose)

```bash
# On your server
git clone https://github.com/you/custom-ai-chatbot .
cp .env.example .env
# Edit .env with production values

# Build widget
node apps/widget/build.js --production

# Start everything
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f api
```

---

## Post-Deployment Checklist

```
[ ] GET /api/v1/health returns {"status":"ok"}
[ ] POST /api/v1/tenants works with x-admin-key
[ ] Admin dashboard loads at your domain
[ ] Widget test.html shows bot (open from HTTP server, not file://)
[ ] Stripe webhook registered at POST /api/v1/billing/webhook
[ ] HTTPS enforced (Railway/Render do this automatically)
[ ] ALLOWED_ORIGINS set to your admin domain
[ ] MongoDB backups enabled
[ ] SUPER_ADMIN_KEY stored securely
```

---

## Onboarding a New Client (< 30 minutes)

```bash
# 1. Create their tenant
curl -X POST https://your-api.com/api/v1/tenants \
  -H "x-admin-key: $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Company B","slug":"company-b","adminEmail":"admin@companyb.com","plan":"pro"}'

# Save the returned apiKey and _id

# 2. Set their admin password
curl -X POST https://your-api.com/api/v1/tenants/{id}/set-password \
  -H "x-admin-key: $SUPER_ADMIN_KEY" \
  -d '{"password":"their-password"}'

# 3. Send them:
#   - Admin dashboard URL
#   - Their slug (login username)
#   - Their password
#   - Widget embed snippet from Settings → Embed Widget
```

---

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPER_ADMIN_KEY` | YES | Master key for tenant management |
| `JWT_SECRET` | YES | Signs admin dashboard JWTs |
| `MONGODB_URI` | YES | MongoDB connection string |
| `REDIS_HOST` | YES | Redis hostname |
| `REDIS_PORT` | YES | Redis port (default 6379) |
| `QDRANT_URL` | YES | Qdrant vector DB URL |
| `ALLOWED_ORIGINS` | YES | Comma-separated allowed CORS origins |
| `PORT` | no | API port (default 3000) |
| `STRIPE_SECRET_KEY` | no | Enables Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | no | Validates Stripe webhooks |
| `STRIPE_PRICE_STARTER` | no | Stripe price ID for Starter plan |
| `STRIPE_PRICE_PRO` | no | Stripe price ID for Pro plan |
