// Plain string-literal mirrors of the Prisma enums, safe to import from
// client components (no dependency on generated Prisma/driver code).

export const ITEM_TYPES = [
  { value: "TOP", label: "Top" },
  { value: "BOTTOM", label: "Bottom" },
  { value: "DRESS", label: "Dress" },
  { value: "JEANS_SHORTS", label: "Jeans/Shorts" },
  { value: "BRA", label: "Bra" },
  { value: "LINGERIE", label: "Lingerie" },
  { value: "OTHER", label: "Other" },
] as const;

export const TAG_STATUSES = [
  { value: "PREOWNED", label: "Preowned" },
  { value: "NWT", label: "New with Tags" },
] as const;

// The four standing buckets every intake pathway sorts directly into --
// flat, no "Random show" umbrella with a sub-tier underneath. This mirrors
// the physical process: items go straight onto a specific rack (Torrid/LB,
// $3, $5-8, or the eBay TO-LIST bin), never onto a "random" pile that gets
// re-split later. Same list for bins/thrift, itemized orders, and
// needs-wash resolution -- destination options are consistent everywhere.
export const STANDING_SHOW_DESTINATIONS = [
  { value: "TORRID_LB", label: "Torrid/LB Show" },
  { value: "RANDOM_3", label: "$3 Pull" },
  { value: "RANDOM_5_8", label: "$5–8 Pull" },
  { value: "EBAY", label: "eBay (TO LIST bin)" },
] as const;

// Bins/Thrift sorting also offers Needs-wash -- a physical treatment step
// for raw secondhand finds that doesn't apply to already listing-ready
// Vinted/Whatnot-as-source items.
export const BINS_THRIFT_SORT_DESTINATIONS = [
  ...STANDING_SHOW_DESTINATIONS,
  { value: "NEEDS_WASH", label: "Needs wash / stain treatment" },
] as const;

// Needs-wash items can resolve into any of the 4 standing shows once
// treated -- a piece that looked $3-tier before washing can turn out to be
// $5-8 quality, same as one sorted there directly (Deals & Steals stays
// transfer-only, never a direct sort/resolve target).
export const NEEDS_WASH_RESOLUTION_SHOWS = STANDING_SHOW_DESTINATIONS;

// Sale reconciliation can land in any standing bucket show -- unlike the
// other intake forms, a Whatnot earnings row could plausibly match any of
// them, so nothing is excluded here.
export const SALE_RECONCILE_SHOWS = [
  { value: "TORRID_LB", label: "Torrid/LB Show" },
  { value: "RANDOM_3", label: "$3 Random Pull" },
  { value: "RANDOM_5_8", label: "$5–8 Random Pull" },
  { value: "EBAY", label: "eBay" },
  { value: "DEALS_STEALS", label: "Torrid/LB Deals & Steals" },
] as const;
