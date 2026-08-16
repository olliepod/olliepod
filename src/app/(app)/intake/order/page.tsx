import OrderForm from "./OrderForm";

export default function OrderIntakePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Log a Vinted / Whatnot-as-source Order</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Enter what the whole order cost and how many items it covered, then sort those items
          into buckets by quantity — the per-item cost is a flat split across the order, same as
          a bins/thrift haul.
        </p>
      </div>
      <OrderForm />
    </div>
  );
}
