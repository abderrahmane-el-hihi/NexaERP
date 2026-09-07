import { describe, it, expect, vi } from "vitest";
import { executePasswordReset, getSafeRedirectUrl } from "@/app/auth/actions";

describe("password recovery server logic", () => {
  it("rejects an invalid email format without calling the provider", async () => {
    const mockReset = vi.fn();
    const mockClient = {
      auth: {
        resetPasswordForEmail: mockReset,
      },
    };

    const result = await executePasswordReset("not-an-email", mockClient);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Veuillez saisir une adresse email valide.");
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("rejects an empty email without calling the provider", async () => {
    const mockReset = vi.fn();
    const mockClient = {
      auth: {
        resetPasswordForEmail: mockReset,
      },
    };

    const result = await executePasswordReset("", mockClient);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Veuillez saisir une adresse email valide.");
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("invokes provider with safe same-site redirect URL and returns anti-enumeration message", async () => {
    const mockReset = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });
    const mockClient = {
      auth: {
        resetPasswordForEmail: mockReset,
      },
    };

    const result = await executePasswordReset("admin@enterprise.ma", mockClient, "https://app.nexaerp.ma");

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith("admin@enterprise.ma", {
      redirectTo: "https://app.nexaerp.ma/auth/callback?next=/reset-password",
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain("Si un compte est associé à cette adresse");
  });

  it("handles provider rate limiting (HTTP 429) gracefully", async () => {
    const mockReset = vi.fn().mockResolvedValue({
      data: null,
      error: {
        status: 429,
        message: "over_email_send_rate_limit",
      },
    });
    const mockClient = {
      auth: {
        resetPasswordForEmail: mockReset,
      },
    };

    const result = await executePasswordReset("user@enterprise.ma", mockClient);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Trop de tentatives");
  });

  it("handles provider downtime / 500 error gracefully", async () => {
    const mockReset = vi.fn().mockResolvedValue({
      data: null,
      error: {
        status: 503,
        message: "Service Unavailable",
      },
    });
    const mockClient = {
      auth: {
        resetPasswordForEmail: mockReset,
      },
    };

    const result = await executePasswordReset("user@enterprise.ma", mockClient);
    expect(result.success).toBe(false);
    expect(result.error).toContain("temporairement indisponible");
  });

  it("constructs safe redirect URLs cleaning trailing slashes", async () => {
    expect(await getSafeRedirectUrl("https://erp.ma/")).toBe("https://erp.ma/auth/callback?next=/reset-password");
    expect(await getSafeRedirectUrl("https://erp.ma")).toBe("https://erp.ma/auth/callback?next=/reset-password");
  });
});
