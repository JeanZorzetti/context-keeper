# Context Keeper Web App

Next.js 15 + Prisma 7 + Stripe + Auth0

## Setup

### Prerequisites

- Node.js 20 LTS
- PostgreSQL database
- Auth0 tenant
- Stripe account

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

3. Fill in all required environment variables (see `.env.example` for details).

4. Run database migrations:

```bash
pnpm db:migrate
```

5. Generate Prisma client:

```bash
pnpm db:generate
```

6. Start development server:

```bash
pnpm dev
```

The app will be available at http://localhost:3000.

## Architecture

### Pages

- `/` - Landing page with pricing table
- `/dashboard` - User dashboard showing projects and decisions
- `/settings` - Configure Groq API key and daemon settings
- `/billing` - Manage subscription and upgrade plans
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/auth/[auth0]` - Auth0 authentication routes

### Database Schema

#### User

- `id` - CUID primary key
- `auth0Id` - Auth0 user ID
- `email` - User email
- `plan` - Current plan (FREE, PERSONAL, PRO, LIFETIME)
- `stripeId` - Stripe customer ID
- `createdAt` - Account creation date

#### Project

- `id` - CUID primary key
- `userId` - Reference to User
- `name` - Project name
- `path` - Absolute path to project on disk
- `decisions` - Related Decision records

#### Decision

- `id` - CUID primary key
- `projectId` - Reference to Project
- `text` - Decision statement
- `sessionId` - Claude Code session ID
- `capturedAt` - When decision was captured

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH0_SECRET` - Auth0 secret
- `AUTH0_BASE_URL` - App base URL for Auth0 callback
- `AUTH0_ISSUER_BASE_URL` - Auth0 issuer URL
- `AUTH0_CLIENT_ID` - Auth0 client ID
- `AUTH0_CLIENT_SECRET` - Auth0 client secret
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

### Optional

- `STRIPE_PRICE_PERSONAL` - Stripe price ID for Personal plan
- `STRIPE_PRICE_PRO` - Stripe price ID for Pro plan
- `STRIPE_PRICE_LIFETIME` - Stripe price ID for Lifetime plan
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for frontend)

## Testing

Run tests with:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

## Building

Production build:

```bash
pnpm build
pnpm start
```

## Deployment

See [EasyPanel deployment guide](../../docs/deployment-easypanel.md).
