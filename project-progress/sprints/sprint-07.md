# Sprint 7 — Billing & SaaS Management ⬜ PLANNED

**Duration:** Week 13–14  
**Depends on:** Sprint 5 ✅ (Admin dashboard working)  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

You can charge companies monthly, track their usage, enforce limits, and see all clients in a super-admin panel.

**Deliverable:** You can onboard Company B, assign them a paid plan, see their usage in real time, and the system automatically blocks sessions when they exceed their monthly quota.

---

## Plan Tiers

| Plan | Monthly Sessions | Languages | Analytics | Branding | Price |
|------|-----------------|-----------|-----------|----------|-------|
| **Starter** | 500 | EN + IT | Basic | Default | $49/mo |
| **Pro** | 5,000 | All 5 | Full | Custom colors + logo | $149/mo |
| **Enterprise** | Unlimited | All 5 | Full + export | Full custom | Custom |

---

## Tasks

### Stripe Integration

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Install Stripe SDK | `package.json` (`stripe`) | ⬜ |
| 2 | Stripe service | `apps/api/src/modules/billing/stripe.service.ts` | ⬜ |
| 3 | Plan config (price IDs from Stripe dashboard) | `apps/api/src/modules/billing/plans.config.ts` | ⬜ |
| 4 | Billing module | `apps/api/src/modules/billing/billing.module.ts` | ⬜ |

### Stripe Lifecycle

| # | Task | File | Status |
|---|------|------|--------|
| 5 | Create Stripe customer when tenant created | Hook in `tenant.service.ts` | ⬜ |
| 6 | Create subscription endpoint | `POST /api/v1/billing/subscribe` | ⬜ |
| 7 | Upgrade/downgrade plan endpoint | `PUT /api/v1/billing/plan` | ⬜ |
| 8 | Cancel subscription endpoint | `DELETE /api/v1/billing/subscription` | ⬜ |
| 9 | Stripe webhook handler | `POST /api/v1/billing/webhook` | ⬜ |
| 10 | Handle `customer.subscription.created` | `stripe.service.ts` | ⬜ |
| 11 | Handle `customer.subscription.updated` | Update tenant plan in DB | ⬜ |
| 12 | Handle `customer.subscription.deleted` | Downgrade to Starter or deactivate | ⬜ |
| 13 | Handle `invoice.payment_failed` | Alert + grace period logic | ⬜ |
| 14 | Add Stripe `customerId` + `subscriptionId` to Tenant schema | `tenant.schema.ts` | ⬜ |

### Usage Tracking

| # | Task | File | Status |
|---|------|------|--------|
| 15 | Usage service | `apps/api/src/modules/billing/usage.service.ts` | ⬜ |
| 16 | Session count increment (already in tenant.service) | Verify working from Sprint 1 | ⬜ |
| 17 | Message count increment | `apps/api/src/modules/chat/chat.service.ts` | ⬜ |
| 18 | Monthly usage reset cron | `apps/api/src/modules/billing/billing.cron.ts` | ⬜ |
| 19 | `GET /api/v1/billing/usage` — current month stats | `billing.controller.ts` | ⬜ |
| 20 | Plan limit guard (block chat when over quota) | `apps/api/src/modules/chat/guards/plan-limit.guard.ts` | ⬜ |

### Admin Dashboard — Billing Page

| # | Task | File | Status |
|---|------|------|--------|
| 21 | Billing page (current plan, usage bar, upgrade) | `apps/admin/src/app/pages/billing/` | ⬜ |
| 22 | Usage progress bar component | `apps/admin/src/app/components/usage-bar/` | ⬜ |
| 23 | Upgrade CTA + Stripe checkout redirect | `apps/admin/src/app/pages/billing/upgrade/` | ⬜ |
| 24 | Payment history table | `apps/admin/src/app/pages/billing/history/` | ⬜ |

### Super-Admin Panel

| # | Task | File | Status |
|---|------|------|--------|
| 25 | All tenants list (your view, not company view) | `apps/admin/src/app/pages/super-admin/tenants/` | ⬜ |
| 26 | Tenant detail (usage, plan, revenue) | `apps/admin/src/app/pages/super-admin/tenant-detail/` | ⬜ |
| 27 | Revenue overview (MRR, active plans breakdown) | `apps/admin/src/app/pages/super-admin/revenue/` | ⬜ |
| 28 | Super-admin auth (separate login with `x-admin-key`) | Already exists — wire to Angular admin | ⬜ |

---

## Stripe Webhook Setup

```bash
# Local testing
stripe listen --forward-to localhost:3000/api/v1/billing/webhook

# Add to .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Usage Enforcement Logic

```
When bot receives a message:
  1. Load tenant from API key
  2. Check usage.currentMonthSessions < usage.monthlySessionLimit
  3. If over limit:
     - Return 429 with message: "Monthly session limit reached. Please upgrade your plan."
  4. If within limit:
     - Process message normally
     - Increment usage.currentMonthMessages by 1
```

---

## Definition of Done

- [ ] Creating a tenant automatically creates a Stripe customer
- [ ] Upgrading plan via dashboard updates Stripe subscription and tenant plan in DB
- [ ] Stripe webhook correctly processes `subscription.updated` event
- [ ] Bot returns 429 when tenant exceeds their monthly session limit
- [ ] Monthly cron resets `currentMonthSessions` to 0 on 1st of each month
- [ ] Super-admin can see all tenants and their plans
- [ ] TypeScript compiles with no errors
