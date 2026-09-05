/**
 * Domain errors carry a machine-readable code so the UI can branch on it
 * (blueprint §12.2) instead of matching on message strings.
 */
export type DomainErrorCode =
  | "PERIOD_CLOSED"
  | "UNBALANCED_ENTRY"
  | "TOTALS_INCONSISTENT"
  | "DOCUMENT_IMMUTABLE"
  | "INVALID_STATE_TRANSITION"
  | "INSUFFICIENT_STOCK"
  | "NEGATIVE_STOCK_BLOCKED"
  | "MISSING_ACCOUNT"
  | "CREDIT_LIMIT_EXCEEDED"
  | "OVER_ALLOCATION"
  | "DUPLICATE_DOCUMENT"
  | "LIMIT_REACHED"
  | "FEATURE_NOT_AVAILABLE"
  | "TENANT_SUSPENDED"
  | "CLEARANCE_REJECTED"
  | "CLEARANCE_PENDING"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_FAILED";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: DomainErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export function domainError(
  code: DomainErrorCode,
  message: string,
  details: Record<string, unknown> = {}
): DomainError {
  return new DomainError(code, message, details);
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}

/** Serializes an error for a server action response. */
export function toErrorPayload(e: unknown): {
  code: DomainErrorCode | "INTERNAL";
  message: string;
  details?: Record<string, unknown>;
} {
  if (isDomainError(e)) {
    return { code: e.code, message: e.message, details: e.details };
  }
  return {
    code: "INTERNAL",
    message: e instanceof Error ? e.message : "Unexpected error",
  };
}

/** Safe message extraction from an unknown thrown value. */
export function messageOf(e: unknown, fallback = "Une erreur est survenue"): string {
  if (isDomainError(e)) return e.message;
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}
