# EasyPanel Deployment Guide

Context Keeper Web App deployment to EasyPanel.

## Prerequisites

- EasyPanel account with project created
- PostgreSQL database provisioned in EasyPanel
- Auth0 application configured
- Stripe account with API keys and webhook configured

## Environment Variables

Before deploying, set these environment variables in EasyPanel:

### Auth0

- `AUTH0_SECRET` - Generate with: `openssl rand -hex 32`
- `AUTH0_BASE_URL` - Your deployed app URL (e.g., https://app.contextkeeper.dev)
- `AUTH0_ISSUER_BASE_URL` - Your Auth0 tenant URL (e.g., https://your-tenant.us.auth0.com)
- `AUTH0_CLIENT_ID` - From Auth0 application
- `AUTH0_CLIENT_SECRET` - From Auth0 application

### Database

- `DATABASE_URL` - PostgreSQL connection string from EasyPanel (format: `postgresql://user:password@host:port/dbname`)

### Stripe

- `STRIPE_SECRET_KEY` - From Stripe Dashboard (Secret key)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (from webhook configuration)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Publishable key (safe for frontend)
- `STRIPE_PRICE_PERSONAL` - Stripe price ID for Personal plan ($19/mo) - used by webhook
- `STRIPE_PRICE_PRO` - Stripe price ID for Pro plan ($49/mo) - used by webhook
- `STRIPE_PRICE_LIFETIME` - Stripe price ID for Lifetime ($149 one-time) - used by webhook
- `NEXT_PUBLIC_STRIPE_PRICE_PERSONAL` - Stripe price ID for Personal plan ($19/mo) - used by frontend
- `NEXT_PUBLIC_STRIPE_PRICE_PRO` - Stripe price ID for Pro plan ($49/mo) - used by frontend
- `NEXT_PUBLIC_STRIPE_PRICE_LIFETIME` - Stripe price ID for Lifetime ($149 one-time) - used by frontend

### Daemon Integration

- `CONTEXT_KEEPER_TOKEN` - Secret token for daemon authentication when sending decisions to the API

### Optional

- `NODE_ENV` - Set to `production`
- `NEXT_TELEMETRY_DISABLED` - Set to `1`

## Deployment Steps

### 1. Configure Auth0

1. Go to Auth0 Dashboard → Applications
2. Create a new application (Regular Web Application)
3. Set allowed callback URLs:
   - `https://your-domain.com/api/auth/callback`
4. Set allowed logout URLs:
   - `https://your-domain.com`
5. Copy Client ID and Client Secret

### 2. Configure Stripe

1. Go to Stripe Dashboard → Products
2. Create three products (Personal, Pro, Lifetime)
3. Create prices for each:
   - Personal: $19/month (recurring)
   - Pro: $49/month (recurring)
   - Lifetime: $149 one-time
4. Copy price IDs to environment variables
5. Set up webhook:
   - Go to Webhooks → Add endpoint
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy Webhook Signing Secret

### 3. Deploy to EasyPanel

Using EasyPanel Docker Integration (Recommended)

1. In EasyPanel: Create new service → Connect GitHub
2. Select repository: `JeanZorzetti/context-keeper`
3. Select branch: `feat/web-billing`
4. Configure Docker:
   - Dockerfile path: `apps/web/Dockerfile`
   - Build context: repository root
5. Set all environment variables (see Environment Variables section above)
6. Deploy

The Dockerfile will:
- Install dependencies using `npm ci` (reproducible builds)
- Build Next.js application
- Generate Prisma client
- On container start: automatically run `prisma migrate deploy` and start the server

No manual database migration step is needed — it runs automatically on each deployment.

### 5. Test Deployment

1. Visit your deployed URL
2. Click "Get Started"
3. Verify Auth0 login flow
4. Create test user and project
5. Test Stripe subscription flow

## Monitoring

### Logs

View application logs in EasyPanel dashboard:
- Application logs
- Error logs
- Build logs

### Health Checks

Configure health check endpoint in EasyPanel:
- Path: `/`
- Port: `3000`
- Interval: 30s

### Database Backups

EasyPanel PostgreSQL provides automatic backups. Configure:
- Backup frequency: Daily
- Retention: 7 days (minimum)

## Troubleshooting

### Auth0 Login Fails

- Verify callback URL matches Auth0 application settings
- Check `AUTH0_BASE_URL` matches deployed domain
- Verify `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`

### Stripe Webhook Not Working

- Verify webhook URL is correct and accessible
- Check `STRIPE_WEBHOOK_SECRET` matches webhook configuration
- Enable webhook events in Stripe dashboard

### Database Connection Issues

- Verify `DATABASE_URL` format
- Check PostgreSQL service is running
- Verify IP whitelist allows EasyPanel access

### Build Failures

- Check Docker build logs in EasyPanel dashboard
- Verify `package.json` and `package-lock.json` are in the repo root
- Verify app-specific files exist: `apps/web/package.json`, `apps/web/Dockerfile`, `apps/web/tsconfig.json`
- Check for TypeScript compilation errors in build logs

## Rollback

To rollback to previous version:

1. In EasyPanel: Deployments tab
2. Select previous deployment
3. Click "Rollback"
4. Verify application works

## Updates

To deploy updates:

1. Push changes to `feat/web-billing` branch
2. EasyPanel auto-deploys (if GitHub integration enabled)
3. Or manually trigger deployment in EasyPanel dashboard

For database schema changes:
1. Modify Prisma schema (`apps/web/prisma/schema.prisma`)
2. Create migration locally: `npx prisma migrate dev --name feature_name`
3. Commit migration files to git
4. Push to `feat/web-billing` branch
5. EasyPanel auto-deploys, migrations run automatically on container start

## Performance Optimization

- Enable Edge Functions in EasyPanel for faster responses
- Set Cache-Control headers for static assets
- Configure CDN for static assets and images
- Use Stripe API version 2024-12-15 or later

## Security

- Store all secrets in EasyPanel environment variables (never in code)
- Enable HTTPS (EasyPanel default)
- Configure CORS if needed
- Set appropriate database connection limits
- Enable PostgreSQL SSL connections

## Support

For EasyPanel-specific issues:
- Contact EasyPanel support
- Check EasyPanel documentation at https://docs.easypanel.io

For Context Keeper-specific issues:
- Check application logs
- Verify all environment variables are set
- Test locally with `docker-compose up`
