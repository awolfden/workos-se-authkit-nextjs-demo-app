import { WorkOS } from "@workos-inc/node";
import assert from "node:assert/strict";

const WORKOS_API_KEY = process.env.WORKOS_API_KEY;
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;
assert.ok(WORKOS_API_KEY, "WORKOS_API_KEY is required");
assert.ok(WORKOS_CLIENT_ID, "WORKOS_CLIENT_ID is required");

export const workos = new WorkOS(WORKOS_API_KEY, {
  clientId: WORKOS_CLIENT_ID,
});
