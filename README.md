# OlliePod

Cost-of-goods, inventory, and profit tracker for a two-business resale operation
(Whatnot + eBay via Nifty). This is phase one of the build: the database, the
category-bucket inventory model (spec Section 4a), and intake logging (spec
Section 2/3).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma (driver adapter: `@prisma/adapter-pg`)
- Cloudflare R2 (S3-compatible) for receipt/screenshot uploads
- Single shared-password auth gate (no user accounts)

## What's built so far

- **Category-bucket inventory model** (Section 4a): buckets keyed by Show
  (Torrid/LB, $3 Random, $5–8 Random, eBay, Deals & Steals) × Type (Top,
  Bottom, Dress, Jeans/Shorts, Bra, Lingerie, Other) × Tag status (Preowned,
  NWT) — with Bra/Lingerie buckets skipping the Show dimension, since brand
  doesn't affect their price. Each bucket tracks count on hand, total COGS
  invested, and running average COGS (computed, not stored, to avoid drift).
- **Bins/Thrift haul intake**: enter a total haul cost, sort items into the
  six piles from Section 2 (eBay / Torrid-LB show / Random $3 / Personal /
  Needs-wash / Trash), and per-item COGS is computed as total cost ÷
  sellable items (eBay + Torrid/LB + Random $3 + Needs-wash — Personal and
  Trash are excluded, per the owner's clarification that Needs-wash counts
  as sellable at sort time).
- **Vinted / Whatnot-as-source itemized intake**: log each item or bundle
  with its own price, split evenly across bundle quantity.
- **Needs-wash queue**: items held for treatment carry the COGS locked in at
  haul time; resolving one assigns it to a final bucket without re-pricing.
- **Deals & Steals transfers**: manually move aged Torrid/LB stock (by type)
  into the Deals & Steals bucket — immediate, permanent transfer using the
  origin bucket's current average COGS.
- **One-time starting inventory count** entry per bucket (Section 4a build
  requirement).
- **Receipt/screenshot uploads** to Cloudflare R2 via presigned URLs, attached
  to a haul/order.
- **Password gate** protecting the whole app (single shared password).

## Not yet built (later phases)

- Weekly Earnings Report CSV import + sale reconciliation tab (Section 4a
  "Sale → reconciliation").
- Themed Raid Trains as their own campaign entity (soft-reserve pulls from
  standing buckets, custom pricing, own COGS/revenue/profit totals).
- eBay Death Pile countdown tracker (Section 8).
- Nifty sales/analytics import + cross-business profit view (Section 7).
- Exports: Full Data Export, Tax Summary, Quarterly Inventory Snapshot,
  Show/Period Performance (Section 9).
- Import of the 187-item / 41-order historical seed data (Section 10) — not
  yet supplied.

## Local development

Requires a local Postgres instance.

```bash
npm install
cp .env.example .env   # if starting fresh; otherwise edit .env directly
npx prisma migrate dev
npx prisma db seed     # seeds the standing category buckets
npm run dev
```

Set `APP_PASSWORD` and `SESSION_SECRET` in `.env`. For receipt uploads to
work, also set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
and `R2_BUCKET_NAME` (and optionally `R2_PUBLIC_URL` if the bucket has a
public/custom domain attached).

## Deployment

Intended for Vercel + a managed Postgres provider (Neon/Vercel
Postgres/Supabase) + Cloudflare R2. `DATABASE_URL`, `APP_PASSWORD`,
`SESSION_SECRET`, and the `R2_*` variables need to be set as environment
variables on the hosting platform.
