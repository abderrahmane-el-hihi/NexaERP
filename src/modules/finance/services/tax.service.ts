import { Prisma } from "@/generated/prisma/client";
import { dec, roundMoney, sum, type Numeric } from "@/shared/money";

/**
 * Tax and line arithmetic.
 *
 * Rule (blueprint §6.2): compute lines at full precision, then round ONCE per tax
 * group when producing document totals. Summing individually-rounded line taxes is
 * what produces the one-centime disputes that tax authorities reject.
 */

export interface LineInput {
  quantity: Numeric;
  unitPrice: Numeric;
  discountPercent?: Numeric;
  tvaRate: Numeric; // percentage points, e.g. 20 for 20%
}

export interface ComputedLine {
  lineSubtotal: Prisma.Decimal;
  lineTva: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export interface TaxBucket {
  rate: number;
  base: number;
  amount: number;
}

export interface DocumentTotals {
  subtotal: Prisma.Decimal;
  tvaAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  breakdown: TaxBucket[];
}

const HUNDRED = new Prisma.Decimal(100);

/** Full-precision amounts for one line. Never rounded here. */
export function computeLine(input: LineInput): ComputedLine {
  const qty = dec(input.quantity);
  const price = dec(input.unitPrice);
  const discount = dec(input.discountPercent ?? 0);
  const rate = dec(input.tvaRate);

  const gross = qty.times(price);
  const lineSubtotal = gross.times(HUNDRED.minus(discount)).dividedBy(HUNDRED);
  const lineTva = lineSubtotal.times(rate).dividedBy(HUNDRED);

  return {
    lineSubtotal,
    lineTva,
    lineTotal: lineSubtotal.plus(lineTva),
  };
}

/**
 * Document totals, with tax rounded once per rate group.
 * `total` is derived from the rounded parts so that subtotal + tva === total exactly,
 * which is what the printed document and the DGI payload must both show.
 */
export function computeDocumentTotals(
  lines: Array<LineInput & { lineSubtotal?: Numeric; lineTva?: Numeric }>
): DocumentTotals {
  const byRate = new Map<string, { rate: Prisma.Decimal; base: Prisma.Decimal; tax: Prisma.Decimal }>();

  for (const line of lines) {
    const computed =
      line.lineSubtotal !== undefined && line.lineTva !== undefined
        ? { lineSubtotal: dec(line.lineSubtotal), lineTva: dec(line.lineTva) }
        : computeLine(line);

    const rate = dec(line.tvaRate);
    const key = rate.toFixed(6);
    const bucket = byRate.get(key) ?? {
      rate,
      base: new Prisma.Decimal(0),
      tax: new Prisma.Decimal(0),
    };
    bucket.base = bucket.base.plus(computed.lineSubtotal);
    bucket.tax = bucket.tax.plus(computed.lineTva);
    byRate.set(key, bucket);
  }

  const breakdown: TaxBucket[] = [];
  const roundedBases: Prisma.Decimal[] = [];
  const roundedTaxes: Prisma.Decimal[] = [];

  for (const bucket of [...byRate.values()].sort((a, b) => a.rate.comparedTo(b.rate))) {
    const base = roundMoney(bucket.base);
    const amount = roundMoney(bucket.tax);
    roundedBases.push(base);
    roundedTaxes.push(amount);
    breakdown.push({
      rate: bucket.rate.toNumber(),
      base: base.toNumber(),
      amount: amount.toNumber(),
    });
  }

  const subtotal = sum(roundedBases);
  const tvaAmount = sum(roundedTaxes);

  return {
    subtotal,
    tvaAmount,
    total: subtotal.plus(tvaAmount),
    breakdown,
  };
}

/**
 * Asserts that a document's stored totals agree with its lines. Called before posting:
 * refusing to post an inconsistent document is cheaper than explaining it later.
 */
export function assertTotalsConsistent(
  documentLabel: string,
  stored: { subtotal: Numeric; tvaAmount: Numeric; total: Numeric },
  computed: DocumentTotals
): void {
  const problems: string[] = [];
  if (!dec(stored.subtotal).equals(computed.subtotal)) {
    problems.push(`subtotal ${dec(stored.subtotal).toFixed(2)} != ${computed.subtotal.toFixed(2)}`);
  }
  if (!dec(stored.tvaAmount).equals(computed.tvaAmount)) {
    problems.push(`tva ${dec(stored.tvaAmount).toFixed(2)} != ${computed.tvaAmount.toFixed(2)}`);
  }
  if (!dec(stored.total).equals(computed.total)) {
    problems.push(`total ${dec(stored.total).toFixed(2)} != ${computed.total.toFixed(2)}`);
  }
  if (problems.length > 0) {
    throw new Error(`${documentLabel}: totals disagree with lines (${problems.join(", ")})`);
  }
}
