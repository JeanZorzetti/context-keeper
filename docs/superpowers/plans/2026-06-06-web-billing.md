# Web + Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/web` — a Next.js 15 App Router application with Auth0 auth, Prisma 7 data layer, and Stripe Checkout Sessions billing for Context Keeper.

**Architecture:** App Router inside pnpm monorepo (`apps/web`). Server components fetch data directly from Postgres via Prisma. Auth0 middleware guards `/dashboard`, `/settings`, `/billing`. Stripe Checkout Sessions handle plan upgrades; a webhook endpoint updates `User.plan` in DB. No client-side global state — server components own data fetching.

**Tech Stack:** Next.js 15.x (App Router), React 19, TypeScript 5, Prisma 7 (PostgreSQL), `@auth0/nextjs-auth0` v3, `stripe` Node SDK, Vitest + React Testing Library, pnpm workspaces.

---

## File Map

```
(monorepo root)/
  package.json                          # private: true, monorepo root
  .gitignore

apps/web/
  package.json
  next.config.ts
  tsconfig.json
  vitest.config.ts
  .env.example
  Dockerfile
  middleware.ts                         # Auth0 route protection matcher
  prisma/
    schema.prisma                       # User, Project, Decision, Plan enum
  app/
    layout.tsx                          # Root layout + UserProvider
    page.tsx                            # Public landing page
    dashboard/
      layout.tsx                        # Checks session, shows shell nav
      page.tsx                          # Server component: lists projects+decisions
    settings/
      page.tsx                          # Settings: Groq key, auto-commit toggle
    billing/
      page.tsx                          # Shows current plan + upgrade CTA
    api/
      auth/[auth0]/route.ts             # Auth0 dynamic handler (login/logout/callback)
      stripe/
        checkout/route.ts               # POST: create Stripe Checkout Session
        webhook/route.ts                # POST: process Stripe subscription events
  components/
    PricingTable.tsx                    # Pricing cards component
    DecisionsList.tsx                   # Renders decisions for a project
  lib/
    prisma.ts                           # Prisma Client singleton
    stripe.ts                           # Stripe client + price-ID map
    auth0.ts                            # getSessionUser() server helper
  tests/
    setup.ts                            # @testing-library/jest-dom matchers
    lib/
      prisma.test.ts
      stripe.test.ts
    components/
      PricingTable.test.tsx
      DecisionsList.test.tsx
    api/
      stripe-webhook.test.ts
```

---

## Task 1: Monorepo Root + apps/web Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/tests/setup.ts`

- [ ] **Step 1: Init git at monorepo root**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git init
```

Expected: `Initialized empty Git repository in .../context-keeper/.git/`

- [ ] **Step 2: Create root package.json**

```bash
cat > package.json << 'EOF'
{
  "name": "context-keeper",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "build:web": "pnpm --filter web build",
    "test:web": "pnpm --filter web test"
  }
}
EOF
```

- [ ] **Step 3: Create .gitignore**

```bash
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.next/
dist/
*.tsbuildinfo
.DS_Store
EOF
```

- [ ] **Step 4: Create apps/web directory and package.json**

```bash
mkdir -p apps/web
cat > apps/web/package.json << 'EOF'
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@auth0/nextjs-auth0": "^3.5.0",
    "@prisma/client": "^7.0.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "stripe": "^17.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "jsdom": "^26.0.0",
    "prisma": "^7.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
EOF
```

- [ ] **Step 5: Create next.config.ts**

```bash
cat > apps/web/next.config.ts << 'EOF'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
EOF
```

- [ ] **Step 6: Create tsconfig.json**

```bash
cat > apps/web/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
```

- [ ] **Step 7: Create vitest.config.ts**

```bash
cat > apps/web/vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
EOF
```

- [ ] **Step 8: Create tests/setup.ts**

```bash
mkdir -p apps/web/tests/lib apps/web/tests/components apps/web/tests/api
cat > apps/web/tests/setup.ts << 'EOF'
import '@testing-library/jest-dom'
EOF
```

- [ ] **Step 9: Install dependencies**

```bash
cd apps/web
pnpm install
```

Expected: lockfile created, `node_modules` populated.

- [ ] **Step 10: Verify Next.js installed**

```bash
cd apps/web && pnpm next --version
```

Expected: `15.x.x`

- [ ] **Step 11: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add .
git commit -m "chore: scaffold monorepo root and apps/web"
```

---

## Task 2: Prisma Schema + Client Singleton

**Files:**
- Create: `apps/web/prisma/schema.prisma`
- Create: `apps/web/lib/prisma.ts`
- Create: `apps/web/tests/lib/prisma.test.ts`

- [ ] **Step 1: Write failing test for Prisma singleton**

```bash
cat > apps/web/tests/lib/prisma.test.ts << 'EOF'
import { describe, it, expect, vi } from 'vitest'

// Mock @prisma/client before importing the module under test
vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn(() => ({ $connect: vi.fn() }))
  return { PrismaClient }
})

describe('lib/prisma', () => {
  it('exports a PrismaClient instance', async () => {
    const { prisma } = await import('@/lib/prisma')
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
  })

  it('returns the same instance on repeated imports (singleton)', async () => {
    const { prisma: first } = await import('@/lib/prisma')
    const { prisma: second } = await import('@/lib/prisma')
    expect(first).toBe(second)
  })
})
EOF
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/web && pnpm test tests/lib/prisma.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/prisma'`

- [ ] **Step 3: Create prisma/schema.prisma**

```bash
mkdir -p apps/web/prisma
cat > apps/web/prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Plan {
  FREE
  PERSONAL
  PRO
  LIFETIME
}

model User {
  id        String    @id @default(cuid())
  auth0Id   String    @unique
  email     String    @unique
  plan      Plan      @default(FREE)
  stripeId  String?
  projects  Project[]
  createdAt DateTime  @default(now())
}

model Project {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  name      String
  path      String
  decisions Decision[]
}

model Decision {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  text       String
  sessionId  String
  capturedAt DateTime @default(now())
}
EOF
```

- [ ] **Step 4: Create lib/prisma.ts (singleton)**

```bash
mkdir -p apps/web/lib
cat > apps/web/lib/prisma.ts << 'EOF'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
EOF
```

- [ ] **Step 5: Run test — expect PASS**

```bash
cd apps/web && pnpm test tests/lib/prisma.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 6: Generate Prisma client**

```bash
cd apps/web && pnpm db:generate
```

Expected: `Generated Prisma Client` output.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/prisma apps/web/lib/prisma.ts apps/web/tests/lib/prisma.test.ts
git commit -m "feat: prisma schema and client singleton"
```

---

## Task 3: Stripe Client + Helpers

**Files:**
- Create: `apps/web/lib/stripe.ts`
- Create: `apps/web/tests/lib/stripe.test.ts`

- [ ] **Step 1: Write failing test**

```bash
cat > apps/web/tests/lib/stripe.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: { sessions: { create: vi.fn() } },
      webhooks: { constructEvent: vi.fn() },
    })),
  }
})

describe('lib/stripe', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_PRICE_PERSONAL = 'price_personal'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_LIFETIME = 'price_lifetime'
  })

  it('exports a stripe instance', async () => {
    const { stripe } = await import('@/lib/stripe')
    expect(stripe).toBeDefined()
  })

  it('PRICE_IDS maps plan names to env price IDs', async () => {
    const { PRICE_IDS } = await import('@/lib/stripe')
    expect(PRICE_IDS.PERSONAL).toBe('price_personal')
    expect(PRICE_IDS.PRO).toBe('price_pro')
    expect(PRICE_IDS.LIFETIME).toBe('price_lifetime')
  })
})
EOF
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/web && pnpm test tests/lib/stripe.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/stripe'`

- [ ] **Step 3: Create lib/stripe.ts**

```bash
cat > apps/web/lib/stripe.ts << 'EOF'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

export const PRICE_IDS = {
  PERSONAL: process.env.STRIPE_PRICE_PERSONAL!,
  PRO: process.env.STRIPE_PRICE_PRO!,
  LIFETIME: process.env.STRIPE_PRICE_LIFETIME!,
} as const

export type PlanKey = keyof typeof PRICE_IDS
EOF
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd apps/web && pnpm test tests/lib/stripe.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/lib/stripe.ts apps/web/tests/lib/stripe.test.ts
git commit -m "feat: stripe client and price ID map"
```

---

## Task 4: Auth0 Setup (Route Handler + Middleware + Server Helper)

**Files:**
- Create: `apps/web/lib/auth0.ts`
- Create: `apps/web/app/api/auth/[auth0]/route.ts`
- Create: `apps/web/middleware.ts`

No unit tests for Auth0 glue — the SDK integration is tested via Auth0's own suite. Integration is verified manually in Task 6.

- [ ] **Step 1: Create lib/auth0.ts (server session helper)**

```bash
cat > apps/web/lib/auth0.ts << 'EOF'
import { getSession } from '@auth0/nextjs-auth0'
import { prisma } from './prisma'

/**
 * Returns the DB User for the current Auth0 session,
 * creating one on first login if it doesn't exist.
 */
export async function getSessionUser() {
  const session = await getSession()
  if (!session?.user) return null

  const { sub: auth0Id, email } = session.user as { sub: string; email: string }

  return prisma.user.upsert({
    where: { auth0Id },
    create: { auth0Id, email },
    update: {},
  })
}
EOF
```

- [ ] **Step 2: Create Auth0 dynamic API route**

```bash
mkdir -p "apps/web/app/api/auth/[auth0]"
cat > "apps/web/app/api/auth/[auth0]/route.ts" << 'EOF'
import { handleAuth } from '@auth0/nextjs-auth0'

export const GET = handleAuth()
EOF
```

- [ ] **Step 3: Create middleware.ts**

```bash
cat > apps/web/middleware.ts << 'EOF'
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge'

export default withMiddlewareAuthRequired()

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/billing/:path*'],
}
EOF
```

- [ ] **Step 4: Create .env.example**

```bash
cat > apps/web/.env.example << 'EOF'
# Auth0
AUTH0_SECRET=use-openssl-rand-base64-32-output
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/context_keeper

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PERSONAL=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_LIFETIME=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOF
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/lib/auth0.ts "apps/web/app/api/auth" apps/web/middleware.ts apps/web/.env.example
git commit -m "feat: auth0 route handler, middleware, and session helper"
```

---

## Task 5: Root Layout + Landing Page

**Files:**
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`

- [ ] **Step 1: Create root layout with UserProvider**

```bash
mkdir -p apps/web/app
cat > apps/web/app/layout.tsx << 'EOF'
import { UserProvider } from '@auth0/nextjs-auth0/client'

export const metadata = {
  title: 'Context Keeper',
  description: 'Automatic context lifecycle manager for AI coding agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}
EOF
```

- [ ] **Step 2: Write failing test for PricingTable (needed by landing page)**

```bash
cat > apps/web/tests/components/PricingTable.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PricingTable } from '@/components/PricingTable'

describe('PricingTable', () => {
  it('renders all three plan names', () => {
    render(<PricingTable />)
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
  })

  it('renders correct prices', () => {
    render(<PricingTable />)
    expect(screen.getByText('$19/mo')).toBeInTheDocument()
    expect(screen.getByText('$49/mo')).toBeInTheDocument()
    expect(screen.getByText('$149')).toBeInTheDocument()
  })

  it('renders CTA links', () => {
    render(<PricingTable />)
    const links = screen.getAllByRole('link', { name: /get started/i })
    expect(links).toHaveLength(3)
  })
})
EOF
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd apps/web && pnpm test tests/components/PricingTable.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/PricingTable'`

- [ ] **Step 4: Create PricingTable component**

```bash
mkdir -p apps/web/components
cat > apps/web/components/PricingTable.tsx << 'EOF'
const plans = [
  {
    name: 'Personal',
    price: '$19/mo',
    features: ['5 projects', 'Claude Code only', 'Auto context updates'],
    href: '/api/auth/login?returnTo=/billing',
  },
  {
    name: 'Pro',
    price: '$49/mo',
    features: ['Unlimited projects', 'Multi-tool sync', 'Priority support'],
    href: '/api/auth/login?returnTo=/billing',
  },
  {
    name: 'Lifetime',
    price: '$149',
    label: 'Early-bird — 100 seats',
    features: ['All Pro features', 'Lifetime access', 'No recurring fees'],
    href: '/api/auth/login?returnTo=/billing',
  },
]

export function PricingTable() {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {plans.map((plan) => (
        <div
          key={plan.name}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '2rem',
            minWidth: '260px',
            maxWidth: '300px',
            flex: '1',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem' }}>{plan.name}</h3>
          {plan.label && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
              {plan.label}
            </p>
          )}
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{plan.price}</p>
          <ul style={{ paddingLeft: '1.25rem', margin: '1rem 0' }}>
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <a
            href={plan.href}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.75rem',
              background: '#111827',
              color: '#fff',
              borderRadius: '0.5rem',
              textDecoration: 'none',
            }}
          >
            Get Started
          </a>
        </div>
      ))}
    </div>
  )
}
EOF
```

- [ ] **Step 5: Run test — expect PASS**

```bash
cd apps/web && pnpm test tests/components/PricingTable.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 6: Create landing page**

```bash
cat > apps/web/app/page.tsx << 'EOF'
import { PricingTable } from '@/components/PricingTable'

export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '960px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0 0 1rem' }}>
          Context Keeper
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#4b5563', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Automatic context lifecycle manager for AI coding agents.
          Your architectural decisions, captured passively — always in context.
        </p>
        <a
          href="/api/auth/login"
          style={{
            display: 'inline-block',
            padding: '0.875rem 2rem',
            background: '#111827',
            color: '#fff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Start free →
        </a>
      </section>

      <section>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Simple pricing</h2>
        <PricingTable />
      </section>
    </main>
  )
}
EOF
```

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/app/layout.tsx apps/web/app/page.tsx apps/web/components/PricingTable.tsx apps/web/tests/components/PricingTable.test.tsx
git commit -m "feat: landing page with pricing table"
```

---

## Task 6: Dashboard Layout + DecisionsList Component

**Files:**
- Create: `apps/web/app/dashboard/layout.tsx`
- Create: `apps/web/components/DecisionsList.tsx`
- Create: `apps/web/tests/components/DecisionsList.test.tsx`

- [ ] **Step 1: Write failing test for DecisionsList**

```bash
cat > apps/web/tests/components/DecisionsList.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DecisionsList } from '@/components/DecisionsList'

const mockDecisions = [
  { id: '1', text: 'Chose Prisma over Drizzle because team familiarity', capturedAt: new Date('2026-06-06'), sessionId: 'session-1' },
  { id: '2', text: 'Decided to use Auth0 because SSO requirement', capturedAt: new Date('2026-06-06'), sessionId: 'session-2' },
]

describe('DecisionsList', () => {
  it('renders each decision text', () => {
    render(<DecisionsList decisions={mockDecisions} />)
    expect(screen.getByText('Chose Prisma over Drizzle because team familiarity')).toBeInTheDocument()
    expect(screen.getByText('Decided to use Auth0 because SSO requirement')).toBeInTheDocument()
  })

  it('renders empty state when no decisions', () => {
    render(<DecisionsList decisions={[]} />)
    expect(screen.getByText(/no decisions captured/i)).toBeInTheDocument()
  })

  it('renders session IDs', () => {
    render(<DecisionsList decisions={mockDecisions} />)
    expect(screen.getByText('session-1')).toBeInTheDocument()
  })
})
EOF
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/web && pnpm test tests/components/DecisionsList.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/DecisionsList'`

- [ ] **Step 3: Create DecisionsList component**

```bash
cat > apps/web/components/DecisionsList.tsx << 'EOF'
type Decision = {
  id: string
  text: string
  capturedAt: Date
  sessionId: string
}

type Props = { decisions: Decision[] }

export function DecisionsList({ decisions }: Props) {
  if (decisions.length === 0) {
    return (
      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
        No decisions captured yet. Start the daemon to begin capturing.
      </p>
    )
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {decisions.map((d) => (
        <li
          key={d.id}
          style={{
            borderLeft: '3px solid #e5e7eb',
            paddingLeft: '1rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: '0 0 0.25rem', fontWeight: 500 }}>{d.text}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
            {d.sessionId} · {new Date(d.capturedAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  )
}
EOF
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd apps/web && pnpm test tests/components/DecisionsList.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create dashboard layout (auth guard + nav shell)**

```bash
mkdir -p apps/web/app/dashboard
cat > apps/web/app/dashboard/layout.tsx << 'EOF'
import { getSession } from '@auth0/nextjs-auth0'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/api/auth/login')

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/dashboard" style={{ fontWeight: 700, textDecoration: 'none', color: '#111827' }}>Context Keeper</a>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: '#4b5563', textDecoration: 'none' }}>Dashboard</a>
          <a href="/settings" style={{ color: '#4b5563', textDecoration: 'none' }}>Settings</a>
          <a href="/billing" style={{ color: '#4b5563', textDecoration: 'none' }}>Billing</a>
          <a href="/api/auth/logout" style={{ color: '#ef4444', textDecoration: 'none' }}>Logout</a>
        </nav>
      </header>
      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
EOF
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/components/DecisionsList.tsx apps/web/tests/components/DecisionsList.test.tsx apps/web/app/dashboard/layout.tsx
git commit -m "feat: dashboard layout and DecisionsList component"
```

---

## Task 7: Dashboard Page (Server Component)

**Files:**
- Create: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

```bash
cat > apps/web/app/dashboard/page.tsx << 'EOF'
import { getSessionUser } from '@/lib/auth0'
import { prisma } from '@/lib/prisma'
import { DecisionsList } from '@/components/DecisionsList'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/api/auth/login')

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: { decisions: { orderBy: { capturedAt: 'desc' }, take: 10 } },
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700 }}>Your Projects</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Plan: <strong>{user.plan}</strong>
          {user.plan === 'FREE' && (
            <> · <a href="/billing">Upgrade to capture decisions</a></>
          )}
        </p>
      </div>

      {projects.length === 0 ? (
        <div style={{ border: '1px dashed #e5e7eb', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No projects yet.</p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Start the daemon with <code>npx context-keeper start</code> to begin capturing decisions.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {projects.map((project) => (
            <section
              key={project.id}
              style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}
            >
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', fontWeight: 600 }}>{project.name}</h2>
              <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#9ca3af' }}>{project.path}</p>
              <DecisionsList decisions={project.decisions} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
EOF
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/app/dashboard/page.tsx
git commit -m "feat: dashboard page with projects and decisions"
```

---

## Task 8: Stripe Checkout API Route

**Files:**
- Create: `apps/web/app/api/stripe/checkout/route.ts`
- Create: `apps/web/tests/api/stripe-checkout.test.ts`

- [ ] **Step 1: Write failing test**

```bash
mkdir -p apps/web/tests/api
cat > apps/web/tests/api/stripe-checkout.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: mockSessionCreate } } },
  PRICE_IDS: { PERSONAL: 'price_personal', PRO: 'price_pro', LIFETIME: 'price_lifetime' },
}))

vi.mock('@auth0/nextjs-auth0', () => ({
  getSession: vi.fn().mockResolvedValue({
    user: { sub: 'auth0|123', email: 'test@example.com' },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', stripeId: null }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    process.env.AUTH0_BASE_URL = 'http://localhost:3000'
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' })
  })

  it('creates a checkout session and redirects', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const req = new Request('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'PERSONAL' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toBe('https://checkout.stripe.com/session_123')
  })

  it('returns 400 for invalid plan', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const req = new Request('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'INVALID' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
EOF
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/web && pnpm test tests/api/stripe-checkout.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create checkout route**

```bash
mkdir -p apps/web/app/api/stripe/checkout
cat > apps/web/app/api/stripe/checkout/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { stripe, PRICE_IDS, type PlanKey } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const VALID_PLANS = new Set<PlanKey>(['PERSONAL', 'PRO', 'LIFETIME'])

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sub: auth0Id, email } = session.user as { sub: string; email: string }
  const body = await req.json()
  const plan = body.plan as PlanKey

  if (!VALID_PLANS.has(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const user = await prisma.user.upsert({
    where: { auth0Id },
    create: { auth0Id, email },
    update: {},
  })

  const isLifetime = plan === 'LIFETIME'

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: isLifetime ? 'payment' : 'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    customer_email: user.stripeId ? undefined : email,
    customer: user.stripeId ?? undefined,
    success_url: `${process.env.AUTH0_BASE_URL}/billing?success=1`,
    cancel_url: `${process.env.AUTH0_BASE_URL}/billing?cancelled=1`,
    metadata: { userId: user.id, plan },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
EOF
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd apps/web && pnpm test tests/api/stripe-checkout.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/app/api/stripe/checkout apps/web/tests/api/stripe-checkout.test.ts
git commit -m "feat: stripe checkout session API route"
```

---

## Task 9: Stripe Webhook Handler

**Files:**
- Create: `apps/web/app/api/stripe/webhook/route.ts`
- Create: `apps/web/tests/api/stripe-webhook.test.ts`

- [ ] **Step 1: Write failing test**

```bash
cat > apps/web/tests/api/stripe-webhook.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const mockConstructEvent = vi.fn()
const mockUserUpdate = vi.fn().mockResolvedValue({})

vi.mock('@/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: mockConstructEvent } },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { update: mockUserUpdate } },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: () => 'test-signature' }),
}))

function makeRequest(body: string) {
  return new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 'test-signature' },
  })
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    mockConstructEvent.mockClear()
    mockUserUpdate.mockClear()
  })

  it('activates PERSONAL plan on subscription created', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          status: 'active',
          metadata: { userId: 'user-1', plan: 'PERSONAL' },
        } as Stripe.Subscription,
      },
    }
    mockConstructEvent.mockReturnValue(event)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeRequest(JSON.stringify(event)))

    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { plan: 'PERSONAL' },
    })
  })

  it('sets plan to FREE on subscription cancelled', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          status: 'canceled',
          metadata: { userId: 'user-1', plan: 'PERSONAL' },
        } as Stripe.Subscription,
      },
    }
    mockConstructEvent.mockReturnValue(event)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeRequest(JSON.stringify(event)))

    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { plan: 'FREE' },
    })
  })

  it('activates LIFETIME plan on one-time payment', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          payment_status: 'paid',
          metadata: { userId: 'user-1', plan: 'LIFETIME' },
        } as unknown as Stripe.Checkout.Session,
      },
    }
    mockConstructEvent.mockReturnValue(event)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeRequest(JSON.stringify(event)))

    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { plan: 'LIFETIME' },
    })
  })

  it('returns 400 on invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature') })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeRequest('bad-payload'))

    expect(res.status).toBe(400)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})
EOF
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/web && pnpm test tests/api/stripe-webhook.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create webhook route**

```bash
mkdir -p apps/web/app/api/stripe/webhook
cat > apps/web/app/api/stripe/webhook/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import type { Plan } from '@prisma/client'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const { userId, plan } = sub.metadata
    const isActive = sub.status === 'active'

    await prisma.user.update({
      where: { id: userId },
      data: { plan: isActive ? (plan as Plan) : 'FREE' },
    })
  }

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object as Stripe.Checkout.Session
    if (checkoutSession.payment_status === 'paid') {
      const { userId, plan } = checkoutSession.metadata!
      await prisma.user.update({
        where: { id: userId },
        data: { plan: plan as Plan },
      })
    }
  }

  return NextResponse.json({ received: true })
}
EOF
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd apps/web && pnpm test tests/api/stripe-webhook.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/app/api/stripe/webhook apps/web/tests/api/stripe-webhook.test.ts
git commit -m "feat: stripe webhook handler (subscription + lifetime)"
```

---

## Task 10: Settings Page

**Files:**
- Create: `apps/web/app/settings/page.tsx`
- Create: `apps/web/app/settings/layout.tsx`

- [ ] **Step 1: Create settings layout (reuse dashboard shell)**

```bash
mkdir -p apps/web/app/settings
cat > apps/web/app/settings/layout.tsx << 'EOF'
export { default } from '@/app/dashboard/layout'
EOF
```

- [ ] **Step 2: Create settings page**

```bash
cat > apps/web/app/settings/page.tsx << 'EOF'
import { getSessionUser } from '@/lib/auth0'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/api/auth/login')

  return (
    <div>
      <h1 style={{ margin: '0 0 2rem', fontSize: '1.5rem', fontWeight: 700 }}>Settings</h1>

      <section style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Groq API Key</h2>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Used by the local daemon to extract architectural decisions from your sessions.
          The key is stored only on your machine — never sent to our servers.
        </p>
        <p style={{ margin: 0, padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: '#374151' }}>
          Set <code>GROQ_API_KEY</code> in your shell profile or <code>~/.context-keeper/.env</code>
        </p>
      </section>

      <section style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Daemon Installation</h2>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Install and start the daemon with:
        </p>
        <pre style={{ margin: 0, padding: '1rem', background: '#111827', color: '#f9fafb', borderRadius: '0.5rem', overflowX: 'auto', fontSize: '0.875rem' }}>
          {`npx context-keeper start`}
        </pre>
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Auto-commit</h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          To enable automatic git commits when decisions are captured, start the daemon with:{' '}
          <code style={{ background: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>
            npx context-keeper start --auto-commit
          </code>
        </p>
      </section>
    </div>
  )
}
EOF
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/app/settings
git commit -m "feat: settings page"
```

---

## Task 11: Billing Page

**Files:**
- Create: `apps/web/app/billing/page.tsx`
- Create: `apps/web/app/billing/layout.tsx`

- [ ] **Step 1: Create billing layout**

```bash
mkdir -p apps/web/app/billing
cat > apps/web/app/billing/layout.tsx << 'EOF'
export { default } from '@/app/dashboard/layout'
EOF
```

- [ ] **Step 2: Create billing page**

```bash
cat > apps/web/app/billing/page.tsx << 'EOF'
import { getSessionUser } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import { PricingTable } from '@/components/PricingTable'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/api/auth/login')

  const params = await searchParams

  const isPaid = user.plan !== 'FREE'

  return (
    <div>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Billing</h1>
      <p style={{ margin: '0 0 2rem', color: '#6b7280' }}>
        Current plan: <strong>{user.plan}</strong>
      </p>

      {params.success && (
        <div style={{ padding: '1rem', background: '#d1fae5', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#065f46' }}>
          Payment successful! Your plan has been activated.
        </div>
      )}

      {params.cancelled && (
        <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#92400e' }}>
          Checkout cancelled. No charge was made.
        </div>
      )}

      {isPaid ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            You are on the <strong>{user.plan}</strong> plan.
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>
            To manage your subscription, contact{' '}
            <a href="mailto:billing@contexkeeper.app">billing@contexkeeper.app</a>
          </p>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
            Choose a plan to unlock decision capture.
          </p>
          <UpgradePricingTable />
        </>
      )}
    </div>
  )
}

function UpgradePricingTable() {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
      {[
        { plan: 'PERSONAL', label: 'Personal', price: '$19/mo', desc: '5 projects, Claude Code' },
        { plan: 'PRO', label: 'Pro', price: '$49/mo', desc: 'Unlimited projects, multi-tool' },
        { plan: 'LIFETIME', label: 'Lifetime', price: '$149', desc: 'Early-bird, 100 seats only' },
      ].map((p) => (
        <form key={p.plan} method="POST" action="/api/stripe/checkout" style={{ flex: 1, minWidth: '200px' }}>
          <input type="hidden" name="plan" value={p.plan} />
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.25rem' }}>{p.label}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{p.price}</p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>{p.desc}</p>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#111827',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Upgrade
            </button>
          </div>
        </form>
      ))}
    </div>
  )
}
EOF
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/app/billing
git commit -m "feat: billing page with plan upgrade UI"
```

---

## Task 12: Dockerfile + .env.example + EasyPanel Notes

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/web/.env.example` (already done in Task 4)

- [ ] **Step 1: Create Dockerfile**

```bash
cat > apps/web/Dockerfile << 'EOF'
FROM node:22-alpine AS base
RUN corepack enable pnpm

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /app/apps/web
RUN pnpm db:generate
RUN pnpm build

# Runner
FROM base AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
EOF
```

- [ ] **Step 2: Enable standalone output in next.config.ts**

Edit `apps/web/next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git add apps/web/Dockerfile apps/web/next.config.ts
git commit -m "feat: dockerfile for easypanel deploy"
```

---

## Task 13: Run Full Test Suite + Verify

- [ ] **Step 1: Run all tests**

```bash
cd apps/web && pnpm test
```

Expected: All tests PASS. Summary should include:
- `tests/lib/prisma.test.ts` — 2 tests
- `tests/lib/stripe.test.ts` — 2 tests
- `tests/components/PricingTable.test.tsx` — 3 tests
- `tests/components/DecisionsList.test.tsx` — 3 tests
- `tests/api/stripe-checkout.test.ts` — 2 tests
- `tests/api/stripe-webhook.test.ts` — 4 tests

**Total: 16 tests**

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Final commit**

```bash
cd "C:/Users/jeanz/OneDrive/Desktop/ROI Labs/context-keeper"
git status
git commit --allow-empty -m "chore: all 16 tests pass, TS clean — ready for QA review"
```

---

## EasyPanel Deployment Notes

1. Create a **PostgreSQL** service in EasyPanel → copy the connection string to `DATABASE_URL`.
2. Create a **Web** service pointing to this repo, Dockerfile path: `apps/web/Dockerfile`.
3. Set all env vars from `.env.example` in the EasyPanel dashboard.
4. On first deploy: open a shell and run `pnpm db:migrate --name init` inside the container.
5. Configure Stripe webhook endpoint: `https://<your-domain>/api/stripe/webhook` → send `customer.subscription.updated` and `checkout.session.completed`.

---

## Self-Review Notes

- **Spec coverage:** All C1–C6 items covered. Pricing matches spec exactly ($19/$49/$149).
- **Plan enum:** Matches spec (FREE, PERSONAL, PRO, LIFETIME). Webhook correctly sets FREE on cancel.
- **Checkout Sessions** used (not PaymentIntents) — matches spec §4.3.
- **Auth0 middleware** protects `/dashboard`, `/settings`, `/billing` — matches spec.
- **Next.js 15** used (spec corrects the task title from "16" to "15" in §4.3).
- **QA gate:** Reviewer (@jack) reviews before done.
