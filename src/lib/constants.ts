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

export const SELLABLE_SORT_DESTINATIONS = [
  { value: "EBAY", label: "eBay (TO LIST bin)" },
  { value: "TORRID_LB", label: "Whatnot — Torrid/LB show" },
  { value: "RANDOM_3", label: "Whatnot — Random show ($3 pull)" },
  { value: "NEEDS_WASH", label: "Needs wash / stain treatment" },
] as const;

// Vinted / Whatnot-as-source itemized orders can land in any of these
// shows (brand always wins to Torrid/LB; Random $3 is bins/thrift only).
export const ITEMIZED_SHOWS = [
  { value: "TORRID_LB", label: "Torrid/LB Show" },
  { value: "RANDOM_5_8", label: "$5–8 Random Pull" },
  { value: "EBAY", label: "eBay" },
] as const;

// Needs-wash items came from a bins/thrift haul, so once treated they can
// only resolve into the same 3 bins/thrift-sourced destinations (never
// Random $5-8, which is Vinted-only, or Deals & Steals, which is
// transfer-only).
export const NEEDS_WASH_RESOLUTION_SHOWS = [
  { value: "EBAY", label: "eBay" },
  { value: "TORRID_LB", label: "Torrid/LB Show" },
  { value: "RANDOM_3", label: "$3 Random Pull" },
] as const;

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
