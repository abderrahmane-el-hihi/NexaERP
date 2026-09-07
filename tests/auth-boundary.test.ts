import { describe, it, expect } from "vitest";

function evaluateRouteAccess(pathname: string, user: { id: string } | null): { action: "allow" | "redirect"; destination?: string } {
  // Unauthenticated visitors accessing protected areas
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))) {
    return { action: "redirect", destination: "/login" };
  }

  // Authenticated users accessing login/signup/forgot-password
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password'))) {
    return { action: "redirect", destination: "/dashboard" };
  }

  return { action: "allow" };
}

describe("auth boundary and redirect rules", () => {
  describe("unauthenticated visitors", () => {
    it("redirects /onboarding to /login", () => {
      const result = evaluateRouteAccess("/onboarding", null);
      expect(result).toEqual({ action: "redirect", destination: "/login" });
    });

    it("redirects /onboarding/step-2 to /login", () => {
      const result = evaluateRouteAccess("/onboarding/step-2", null);
      expect(result).toEqual({ action: "redirect", destination: "/login" });
    });

    it("redirects /dashboard to /login", () => {
      const result = evaluateRouteAccess("/dashboard", null);
      expect(result).toEqual({ action: "redirect", destination: "/login" });
    });

    it("redirects /dashboard/sales/invoices to /login", () => {
      const result = evaluateRouteAccess("/dashboard/sales/invoices", null);
      expect(result).toEqual({ action: "redirect", destination: "/login" });
    });

    it("allows public access to /", () => {
      const result = evaluateRouteAccess("/", null);
      expect(result).toEqual({ action: "allow" });
    });

    it("allows public access to /login", () => {
      const result = evaluateRouteAccess("/login", null);
      expect(result).toEqual({ action: "allow" });
    });

    it("allows public access to /signup", () => {
      const result = evaluateRouteAccess("/signup", null);
      expect(result).toEqual({ action: "allow" });
    });

    it("allows public access to /forgot-password", () => {
      const result = evaluateRouteAccess("/forgot-password", null);
      expect(result).toEqual({ action: "allow" });
    });

    it("allows public access to /company/about", () => {
      const result = evaluateRouteAccess("/company/about", null);
      expect(result).toEqual({ action: "allow" });
    });

    it("allows public access to /product/finance", () => {
      const result = evaluateRouteAccess("/product/finance", null);
      expect(result).toEqual({ action: "allow" });
    });
  });

  describe("authenticated users", () => {
    const mockUser = { id: "user-123" };

    it("allows authenticated access to /onboarding", () => {
      const result = evaluateRouteAccess("/onboarding", mockUser);
      expect(result).toEqual({ action: "allow" });
    });

    it("allows authenticated access to /dashboard", () => {
      const result = evaluateRouteAccess("/dashboard", mockUser);
      expect(result).toEqual({ action: "allow" });
    });

    it("redirects authenticated user from /login to /dashboard", () => {
      const result = evaluateRouteAccess("/login", mockUser);
      expect(result).toEqual({ action: "redirect", destination: "/dashboard" });
    });

    it("redirects authenticated user from /signup to /dashboard", () => {
      const result = evaluateRouteAccess("/signup", mockUser);
      expect(result).toEqual({ action: "redirect", destination: "/dashboard" });
    });

    it("redirects authenticated user from /forgot-password to /dashboard", () => {
      const result = evaluateRouteAccess("/forgot-password", mockUser);
      expect(result).toEqual({ action: "redirect", destination: "/dashboard" });
    });
  });
});
