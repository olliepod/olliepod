# OlliePod

Cost-of-goods, inventory, and profit tracker for a resale operation selling
across two channels (Whatnot livestreams, and eBay/Poshmark/Depop —
crosslisted copies of the same eBay inventory — imported via Nifty). This is
phase one of the build: the database, the
category-bucket inventory model (spec Section 4a), and intake logging (spec
Section 2/3).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma (driver adapter: `@prisma/adapter-pg`)
- Backblaze B2 (S3-compatible) for receipt/screenshot uploads
- Single shared-password auth gate (no user accounts)

## What's built so far

- **Category-bucket inventory model** (Section 4a): buckets keyed by Show
  (Torrid/LB, $3 Random, $5–8 Random, eBay, Deals & Steals) × Type (Top,
  Bottom, Dress, Jeans/Shorts, Bra, Lingerie, Other) × Tag status (Preowned,
  NWT) — with Bra/Lingerie buckets skipping the Show dimension, since brand
  doesn't affect their price. Each bucket tracks count on hand, total COGS
  invested, and running average COGS (computed, not stored, to avoid drift).
- **Bins/Thrift haul intake**: enter a total haul cost, sort items into the
  seven piles from Section 2 (eBay / Torrid-LB show / $3 Pull / $5–8 Pull /
  Personal / Needs-wash / Trash), and per-item COGS is computed as total
  cost ÷ sellable items (eBay + Torrid/LB + $3 Pull + $5–8 Pull +
  Needs-wash — Personal and Trash are excluded, per the owner's
  clarification that Needs-wash counts as sellable at sort time).
- **Vinted / Whatnot-as-source itemized intake**: priced the same way as a
  bins/thrift haul — enter the order's total price and total item count,
  which gives a flat per-item COGS (total ÷ count), then sort those items
  into eBay / Torrid/LB show / $3 Pull / $5–8 Pull by quantity. No
  per-line pricing and no "bundle" concept at intake — every intake
  pathway now offers the same four standing destinations directly, flat,
  with no "Random show" umbrella to sub-split.
- **Needs-wash queue**: items held for treatment carry the COGS locked in at
  haul time; resolving one assigns it to a final bucket without re-pricing.
- **Deals & Steals transfers**: manually move aged Torrid/LB stock (by type)
  into the Deals & Steals bucket — immediate, permanent transfer using the
  origin bucket's current average COGS.
- **One-time starting inventory count** entry per bucket (Section 4a build
  requirement).
- **Receipt/screenshot uploads** to Backblaze B2 via presigned URLs, attached
  to a haul/order.
- **Password gate** protecting the whole app (single shared password).
- **Weekly Earnings Report CSV import + sale reconciliation** (Section 4a
  "Sale → reconciliation"): import a Whatnot Weekly Earnings Report CSV;
  giveaway deductions are auto-skipped (not inventory), and each item sale
  gets a best-effort show/type/tag guess parsed from the listing and
  livestream titles. Nothing touches inventory until you confirm a sale on
  the Reconcile tab — confirming decrements the matched bucket and logs
  COGS/profit against that sale. Livestream titles outside the standing
  Torrid/LB show (e.g. themed Raid Trains) come through with no show guess
  and need a manual pick.
- **Themed Raid Trains**: a campaign entity layered on top of the standing
  buckets. Pulling an item into a raid train earmarks it with its own
  custom price and a carried COGS locked in from the bucket's average at
  pull time — the bucket's count/COGS are untouched until a real sale
  reconciles against the pull, at which point that inventory finally
  decrements. Raid Trains are a selectable reconciliation target in the
  Reconcile tab alongside the standing shows, each with its own
  revenue/COGS/profit roll-up separate from the buckets' own pricing.
- **eBay Death Pile** (Section 8): a running count of unlisted eBay items,
  fed from two ongoing sources. "Add backlog" is a repeatable manual action
  for old pre-system stock as it turns up (laundry, going through the
  house) — flat-estimated COGS, since there's no purchase record. New
  intake grows the same count automatically — any haul sort, itemized order
  line, or needs-wash resolution that lands in an EBAY-show bucket bumps
  it, since that stock already carries real COGS on its own bucket like
  everything else. Marking items as listed (individually or in a batch)
  counts it back down, regardless of which source — old backlog or new
  intake — the unit came from. No dates, no aging, no threshold — just the
  running total and a log of the activity behind it.
- **Nifty Orders import + cross-business profit view** (Section 7): import a
  Nifty "export_orders" CSV, which covers every marketplace in one file.
  Rows are filtered to Marketplace = eBay, Poshmark, or Depop — crosslisted
  copies of the same eBay-bucket inventory, not separate businesses — so all
  three import as one channel and reconcile like any other sale (Type/Tag
  confirmation, show locked to eBay, no Raid Train option). Whatnot rows in
  the same file are skipped entirely, since those sales are already covered
  by the Weekly Earnings Report import; importing them here too would
  double-count. Nifty's own Cost of Goods figure isn't trusted (same as
  Whatnot's), so it's backed out of Nifty's "Total Profit" column to recover
  a clean pre-COGS revenue number, and OlliePod's own bucket-tracked COGS is
  subtracted at reconciliation time instead. A Profit tab shows
  revenue/COGS/profit per channel (Whatnot vs. eBay) side by side, plus a
  combined total, computed from the same reconciled Sale records both
  imports feed into.
- **Exports** (Section 9): CSV downloads, no on-screen previews. Full Data
  Export is one CSV per underlying table (buckets, hauls, haul sort entries,
  order lines, needs-wash queue, starting counts, bucket transfers, sales,
  raid trains, raid train pulls, death pile entries) — a complete backup of
  everything tracked. Tax Summary totals revenue/COGS/profit by calendar
  quarter, split by channel plus a combined row per quarter, keyed off when
  each sale actually happened rather than when it got reconciled. Quarterly
  Inventory Snapshot exports the live bucket state (count on hand, COGS
  invested, avg COGS) labeled with the current quarter — the app has no
  historical point-in-time storage, so this is meant to be downloaded and
  kept each quarter rather than reconstructed later. Show/Period Performance
  breaks reconciled revenue/COGS/profit down by show for a date range you
  pick on the page.

## Not yet built (later phases)

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
work, also set `B2_ENDPOINT` (the bucket's S3-compatible endpoint, e.g.
`https://s3.us-west-004.backblazeb2.com` — copy it from the bucket's
details page in the B2 console), `B2_KEY_ID`, `B2_APPLICATION_KEY`, and
`B2_BUCKET_NAME` (and optionally `B2_PUBLIC_URL` if the bucket has a
public/custom domain attached).

## Deployment

Intended for Vercel + a managed Postgres provider (Neon/Vercel
Postgres/Supabase) + Backblaze B2. `DATABASE_URL`, `APP_PASSWORD`,
`SESSION_SECRET`, and the `B2_*` variables need to be set as environment
variables on the hosting platform.
