import Link from "next/link";

export default function IntakePage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Log Intake</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Choose how this haul was sourced.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/intake/haul"
          className="rounded-lg border border-neutral-200 p-5 hover:border-neutral-400 transition-colors"
        >
          <h2 className="font-medium text-neutral-900">Goodwill Bins / Thrift haul</h2>
          <p className="text-sm text-neutral-500 mt-1">
            One total price for the whole haul. Sort items into eBay, Torrid/LB show,
            Random show, Personal, Needs-wash, or Trash — COGS splits evenly across
            sellable items.
          </p>
        </Link>
        <Link
          href="/intake/order"
          className="rounded-lg border border-neutral-200 p-5 hover:border-neutral-400 transition-colors"
        >
          <h2 className="font-medium text-neutral-900">Vinted / Whatnot-as-source order</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Itemized per order — log each item or bundle with its own price and final
            category directly.
          </p>
        </Link>
      </div>
    </div>
  );
}
