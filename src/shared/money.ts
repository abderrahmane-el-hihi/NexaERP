import { Prisma } from "../generated/prisma/client";

/**
 * Money and quantity arithmetic.
 *
 * Everything monetary is a Prisma.Decimal end to end. Floats are banned in this
 * codebase: `0.1 + 0.2 !== 0.3` in double precision, and an ERP that cannot make its
 * totals agree with the sum of its lines cannot be trusted with anyone's accounts.
 *
 * Rounding happens once, at document totals, never per intermediate step.
 */
export const D = Prisma.Decimal;
export type Money = Prisma.Decimal;

/** Currency precision for MAD and most currencies we serve. */
export const MONEY_DP = 2;
/** Internal precision kept in the database. */
export const STORAGE_DP = 6;

export type Numeric = Prisma.Decimal | number | string | null | undefined;

export function dec(value: Numeric): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

/** Round half-up to currency precision. Use only when producing a total. */
export function roundMoney(value: Numeric, dp: number = MONEY_DP): Prisma.Decimal {
  return dec(value).toDecimalPlaces(dp, Prisma.Decimal.ROUND_HALF_UP);
}

export function sum(values: Numeric[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.plus(dec(v)), new Prisma.Decimal(0));
}

export function isZero(value: Numeric): boolean {
  return dec(value).isZero();
}

export function eq(a: Numeric, b: Numeric): boolean {
  return dec(a).equals(dec(b));
}

export function gt(a: Numeric, b: Numeric): boolean {
  return dec(a).greaterThan(dec(b));
}

export function gte(a: Numeric, b: Numeric): boolean {
  return dec(a).greaterThanOrEqualTo(dec(b));
}

export function lt(a: Numeric, b: Numeric): boolean {
  return dec(a).lessThan(dec(b));
}

export function neg(value: Numeric): Prisma.Decimal {
  return dec(value).negated();
}

export function abs(value: Numeric): Prisma.Decimal {
  return dec(value).abs();
}

/**
 * Converts a Decimal to a plain number for serialization to React Server Components.
 * Only use at the presentation boundary — never for arithmetic.
 */
export function toNumber(value: Numeric): number {
  return dec(value).toNumber();
}

/** Formats for display, e.g. "1 234,56 MAD". */
export function formatMoney(value: Numeric, currency = "MAD", locale = "fr-MA"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: MONEY_DP,
    maximumFractionDigits: MONEY_DP,
  }).format(toNumber(value));
}

/**
 * The shape a domain object takes once it crosses into React: Decimal becomes number,
 * BigInt becomes string, Date stays a Date.
 *
 * Making this a real type — rather than returning the Prisma type unchanged — is what
 * stops a component from doing arithmetic on a Decimal and getting a compile error
 * instead of a wrong number at runtime.
 */
export type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends bigint
    ? string
    : T extends Date
      ? Date
      : T extends (infer U)[]
        ? Serialized<U>[]
        : T extends object
          ? { [K in keyof T]: Serialized<T[K]> }
          : T;

/**
 * Recursively converts Decimal fields to numbers so a server component can pass the
 * object to a client component. Use only at the presentation boundary.
 */
export function serialize<T>(value: T): Serialized<T> {
  if (value === null || value === undefined) return value as Serialized<T>;
  if (value instanceof Prisma.Decimal) return value.toNumber() as Serialized<T>;
  if (typeof value === "bigint") return value.toString() as Serialized<T>;
  if (value instanceof Date) return value as Serialized<T>;
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as Serialized<T>;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out as Serialized<T>;
  }
  return value as Serialized<T>;
}
