import OrderForm from "./OrderForm";

export default function OrderIntakePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Log a Vinted / Whatnot-as-source Order</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Each item (or bundle) is entered with its own price and final category — brand always
          wins to the Torrid/LB show, and bundle totals split evenly across the items in that
          bundle.
        </p>
      </div>
      <OrderForm />
    </div>
  );
}
