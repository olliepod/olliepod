import Decimal from "decimal.js";

// Prisma Decimal fields arrive as objects with toString(); accept that,
// plain numbers, or strings uniformly.
export type DecimalInput = Decimal | { toString(): string } | number | string;

export function toDecimal(value: DecimalInput): Decimal {
  return new Decimal(value.toString());
}

export function avgCogs(totalCogs: DecimalInput, countOnHand: number): Decimal {
  if (countOnHand <= 0) return new Decimal(0);
  return toDecimal(totalCogs).dividedBy(countOnHand);
}

export function formatMoney(value: DecimalInput): string {
  return `$${toDecimal(value).toFixed(2)}`;
}
