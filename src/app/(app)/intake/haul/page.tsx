import HaulForm from "./HaulForm";

export default function HaulIntakePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title text-xl">Log a Bins/Thrift Haul</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Enter the total haul cost, then record how many items were sorted into each pile.
          Per-item COGS is the total cost split evenly across eBay + Torrid/LB + Random $3 +
          Needs-wash items — Personal and Trash are excluded from that split.
        </p>
      </div>
      <HaulForm />
    </div>
  );
}
