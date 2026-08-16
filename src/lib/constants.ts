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

// Bra, Lingerie, Jeans/Shorts, and Other crosslist across every show from
// one shared pool (see normalizeShowForType in src/lib/buckets.ts) -- the
// Show picker is meaningless for these at reconciliation, since whichever
// value is picked gets ignored in favor of the one shared bucket.
export function isCrossShowItemType(itemType: string): boolean {
  return itemType === "BRA" || itemType === "LINGERIE" || itemType === "JEANS_SHORTS" || itemType === "OTHER";
}

// eBay, $3 Pull, and $5-8 Pull are flat -- count + total COGS only, no
// Type/Tag split (see FLAT_SHOWS in src/lib/buckets.ts). Torrid/LB and
// Deals & Steals keep full Type x Tag granularity.
export function isFlatShow(show: string | null | undefined): boolean {
  return show === "EBAY" || show === "RANDOM_3" || show === "RANDOM_5_8";
}

// Type options for a Torrid/LB (or Deals & Steals) line -- these are the
// only item types that ever get a show-specific bucket.
export const SHOW_ITEM_TYPES = ITEM_TYPES.filter((t) => t.value === "TOP" || t.value === "BOTTOM" || t.value === "DRESS");

// "Kind" options once "Shop Item" is picked as the destination -- Bra,
// Lingerie, Jeans/Shorts, Other. Jeans/Shorts also gets an optional Brand
// field (brand affects resale price) wherever this list is used.
export const SHOP_ITEM_KINDS = ITEM_TYPES.filter((t) => isCrossShowItemType(t.value));

// The intake destination list every sort/resolve form shares: the four
// flat/show-specific standing buckets, plus Shop Item as its own top-level
// destination (not nested under a show -- Bra/Lingerie/Jeans-Shorts/Other
// don't belong to a specific show at all).
export const INTAKE_DESTINATIONS = [
  { value: "TORRID_LB", label: "Torrid/LB Show" },
  { value: "RANDOM_3", label: "$3 Pull" },
  { value: "RANDOM_5_8", label: "$5–8 Pull" },
  { value: "EBAY", label: "eBay (TO LIST bin)" },
  { value: "SHOP_ITEM", label: "Shop Item (Bra, Lingerie, Jeans/Shorts, Other)" },
] as const;

// Bins/Thrift sorting also offers Needs-wash -- a physical treatment step
// for raw secondhand finds that doesn't apply to already listing-ready
// Vinted/Whatnot-as-source items.
export const BINS_THRIFT_SORT_DESTINATIONS = [
  ...INTAKE_DESTINATIONS,
  { value: "NEEDS_WASH", label: "Needs wash / stain treatment" },
] as const;

// Needs-wash items can resolve into any standing destination once treated --
// a piece that looked $3-tier before washing can turn out to be $5-8
// quality, same as one sorted there directly (Deals & Steals stays
// transfer-only, never a direct sort/resolve target).
export const NEEDS_WASH_RESOLUTION_SHOWS = INTAKE_DESTINATIONS;

// Sale reconciliation can land in any standing bucket show -- unlike the
// other intake forms, a Whatnot earnings row could plausibly match any of
// them, so nothing is excluded here. Shop Item isn't listed separately here
// since picking a cross-show Type already routes the sale there regardless
// of which of these is selected (see isCrossShowItemType usage in
// SaleRow.tsx).
export const SALE_RECONCILE_SHOWS = [
  { value: "TORRID_LB", label: "Torrid/LB Show" },
  { value: "RANDOM_3", label: "$3 Random Pull" },
  { value: "RANDOM_5_8", label: "$5–8 Random Pull" },
  { value: "EBAY", label: "eBay" },
  { value: "DEALS_STEALS", label: "Torrid/LB Deals & Steals" },
] as const;
