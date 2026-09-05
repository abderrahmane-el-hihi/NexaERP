import { beforeAll } from "vitest";

// Tests run against a dedicated database, as the restricted application role, so row
// level security is exercised for real rather than bypassed by a superuser connection.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://nexaerp_app:nexaerp_app@127.0.0.1:55432/nexaerp_test";
process.env.EINVOICE_ENABLED = "true";
process.env.EINVOICE_PROVIDER = "SANDBOX";
// NODE_ENV is set by the test runner.

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "Refusing to run the suite against a database whose name does not contain 'test'"
    );
  }
});
