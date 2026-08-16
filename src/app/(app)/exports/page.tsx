import { EXPORT_TABLES, currentQuarterLabel } from "@/lib/exports";

export default function ExportsPage() {
  const quarter = currentQuarterLabel();

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="page-title text-xl">Exports</h1>
        <p className="text-sm text-neutral-500 mt-1">Download CSV reports for backups, taxes, and performance review.</p>
      </div>

      <Section
        title="Full Data Export"
        description="One CSV per data table -- buckets, hauls/intake, sales, raid trains, and the death pile."
      >
        <div className="flex flex-wrap gap-2">
          {Object.entries(EXPORT_TABLES).map(([key, { label }]) => (
            <a key={key} href={`/api/exports/data/${key}`} className="btn-secondary text-xs">
              {label}
            </a>
          ))}
        </div>
      </Section>

      <Section
        title="Tax Summary"
        description="Revenue, COGS, and profit by calendar quarter, split by channel (Whatnot / eBay) plus a combined total."
      >
        <a href="/api/exports/tax-summary" className="btn-primary">
          Download Tax Summary CSV
        </a>
      </Section>

      <Section
        title="Quarterly Inventory Snapshot"
        description={`Current bucket state (count on hand, COGS invested, avg COGS), labeled for ${quarter}. Take one each quarter for your own records -- the app only tracks live inventory, not history.`}
      >
        <a href="/api/exports/inventory-snapshot" className="btn-primary">
          Download Inventory Snapshot CSV
        </a>
      </Section>

      <Section title="Show / Period Performance" description="Revenue, COGS, and profit by show, for a date range you choose.">
        <form action="/api/exports/show-performance" method="GET" className="flex flex-wrap items-end gap-2">
          <Field label="Start date">
            <input type="date" name="start" required className="input" />
          </Field>
          <Field label="End date">
            <input type="date" name="end" required className="input" />
          </Field>
          <button type="submit" className="btn-primary">
            Download CSV
          </button>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-600">
      {label}
      {children}
    </label>
  );
}
