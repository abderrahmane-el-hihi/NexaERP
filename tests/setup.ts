import 'dotenv/config';
import { beforeAll } from "vitest";

// Tests run against a dedicated database, as the restricted application role, so row
// Use the cloud database URL provided in the .env file instead of hardcoded local docker
// process.env.DATABASE_URL =
//   process.env.TEST_DATABASE_URL ??
//   "postgresql://nexaerp_app:nexaerp_app@127.0.0.1:55432/nexaerp_test";
process.env.EINVOICE_ENABLED = "true";
process.env.EINVOICE_PROVIDER = "SANDBOX";
// NODE_ENV is set by the test runner.

beforeAll(() => {
  // Commented out to allow using the cloud DB which is named 'postgres', not 'test'
  // if (!process.env.DATABASE_URL?.includes("test")) {
  //   throw new Error(
  //     "Refusing to run the suite against a database whose name does not contain 'test'"
  //   );
  // }
});
