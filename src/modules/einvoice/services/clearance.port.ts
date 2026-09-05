import crypto from "node:crypto";

/**
 * The clearance transport, behind an interface.
 *
 * Whether we are allowed to call the DGI platform directly or must route through an
 * approved dematerialization operator is an open regulatory question. Keeping the
 * transport behind this port means the answer changes an adapter, not the product.
 */

export type ClearanceState = "Cleared" | "Rejected" | "Pending";

export interface ClearanceReject {
  code: string;
  field?: string;
  message: string;
}

export interface ClearanceResult {
  state: ClearanceState;
  providerSubmissionId?: string;
  clearanceReference?: string;
  rejects?: ClearanceReject[];
  /** Transport-level failure: retry, do not treat as a rejection. */
  transportError?: string;
}

export interface ClearancePort {
  readonly name: string;
  submit(payload: string, meta: { invoiceNumber: string; tenantId: string }): Promise<ClearanceResult>;
  poll(providerSubmissionId: string): Promise<ClearanceResult>;
}

/**
 * Local adapter used in development and tests. It performs the structural checks the
 * real platform performs so the whole path — validation, queue, retry, state machine —
 * is exercised end to end before any credential exists.
 */
export class SandboxClearanceAdapter implements ClearancePort {
  readonly name = "SANDBOX";

  async submit(payload: string, meta: { invoiceNumber: string }): Promise<ClearanceResult> {
    const rejects: ClearanceReject[] = [];

    if (!payload.includes("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>")) {
      rejects.push({ code: "FORMAT_INVALID", message: "Format UBL 2.1 attendu" });
    }
    const supplierIce = /schemeID="ICE">([^<]*)</.exec(payload)?.[1];
    if (!supplierIce) {
      rejects.push({ code: "ICE_MISSING", field: "supplier.ice", message: "ICE émetteur absent" });
    }
    if (!payload.includes(`<cbc:ID>${meta.invoiceNumber}</cbc:ID>`)) {
      rejects.push({
        code: "NUMBER_MISMATCH",
        field: "number",
        message: "Le numéro du document ne correspond pas au numéro déclaré",
      });
    }

    if (rejects.length > 0) {
      return { state: "Rejected", rejects, providerSubmissionId: randomId("rej") };
    }

    return {
      state: "Cleared",
      providerSubmissionId: randomId("sub"),
      clearanceReference: `MA-${randomId("clr").toUpperCase()}`,
    };
  }

  async poll(providerSubmissionId: string): Promise<ClearanceResult> {
    return { state: "Cleared", providerSubmissionId, clearanceReference: `MA-${providerSubmissionId}` };
  }
}

/**
 * Direct DGI platform adapter. Intentionally inert until the technical specification,
 * the endpoint and the credentials are confirmed — see the strategy file §11 U1/U2.
 * Shipping a guessed integration would be worse than shipping none.
 */
export class DirectDgiAdapter implements ClearancePort {
  readonly name = "DIRECT_DGI";

  constructor(
    private readonly config: { baseUrl?: string; clientId?: string; clientSecret?: string } = {}
  ) {}

  private assertConfigured() {
    if (!this.config.baseUrl || !this.config.clientId) {
      throw new Error(
        "Adaptateur DGI non configuré: renseignez DGI_BASE_URL et DGI_CLIENT_ID une fois la procédure de raccordement confirmée."
      );
    }
  }

  async submit(): Promise<ClearanceResult> {
    this.assertConfigured();
    throw new Error("DirectDgiAdapter.submit not implemented pending the published API contract");
  }

  async poll(): Promise<ClearanceResult> {
    this.assertConfigured();
    throw new Error("DirectDgiAdapter.poll not implemented pending the published API contract");
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function hashPayload(payload: string): string {
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Chooses the transport for a tenant. Environment-driven so it can be switched per deploy. */
export function resolveClearancePort(): ClearancePort {
  const provider = process.env.EINVOICE_PROVIDER ?? "SANDBOX";
  if (provider === "DIRECT_DGI") {
    return new DirectDgiAdapter({
      baseUrl: process.env.DGI_BASE_URL,
      clientId: process.env.DGI_CLIENT_ID,
      clientSecret: process.env.DGI_CLIENT_SECRET,
    });
  }
  return new SandboxClearanceAdapter();
}
