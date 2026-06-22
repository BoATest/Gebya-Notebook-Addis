// Route-layer smoke test. Not a real e2e — just exercises the
// Express router with an in-memory store and confirms the JSON
// responses match the spec.
//
// Run with:
//   pnpm --filter @workspace/api-server run test:smoke
//
// (Adds the script in artifacts/api-server/package.json.)

import app from "../app";
import { createServer } from "node:http";

const server = createServer(app);
let base = "";

async function step(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    process.stdout.write("ok\n");
  } catch (e) {
    process.stdout.write("FAIL\n");
    console.error(e);
    process.exitCode = 1;
  }
}

async function req(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;
  base = `http://127.0.0.1:${port}`;

  let shopId = "";
  let joinCode = "";
  let ownerToken = "";
  let staffId = "";
  let staffToken = "";
  let deviceId = "";

  try {
    await step("owner creates a shop", async () => {
      const r = await req("POST", "/api/shops", { display_name: "Hanna Shop" });
      if (r.status !== 201) throw new Error(`status=${r.status} body=${JSON.stringify(r.json)}`);
      shopId = r.json.shop_id;
      joinCode = r.json.join_code;
      ownerToken = r.json.device_token;
      if (r.json.role !== "owner") throw new Error("role !== owner");
    });

    await step("GET /api/me returns the owner", async () => {
      const r = await req("GET", "/api/me", undefined, ownerToken);
      if (r.status !== 200) throw new Error(`status=${r.status}`);
      if (r.json.shop_id !== shopId) throw new Error("shop_id mismatch");
    });

    await step("staff joins with code + name", async () => {
      const r = await req("POST", "/api/shops/join", {
        join_code: joinCode,
        display_name: "Tigist",
        device_label: "Tigist's phone",
      });
      if (r.status !== 201) throw new Error(`status=${r.status} body=${JSON.stringify(r.json)}`);
      staffId = r.json.staff_id ?? null;
      staffToken = r.json.device_token;
      deviceId = r.json.device_id ?? null;
    });

    await step("staff /api/me shows them as a staff (not owner)", async () => {
      const r = await req("GET", "/api/me", undefined, staffToken);
      if (r.status !== 200) throw new Error(`status=${r.status}`);
      if (r.json.role === "owner") throw new Error("staff should not be owner");
    });

    await step("owner lists staff and sees Tigist", async () => {
      const r = await req("GET", `/api/shops/${shopId}/staff`, undefined, ownerToken);
      if (r.status !== 200) throw new Error(`status=${r.status}`);
      const names = r.json.staff.map((s: any) => s.display_name);
      if (!names.includes("Tigist")) throw new Error(`missing Tigist: ${JSON.stringify(names)}`);
    });

    await step("non-owner cannot list staff (403)", async () => {
      const r = await req("GET", `/api/shops/${shopId}/staff`, undefined, staffToken);
      if (r.status !== 403) throw new Error(`status=${r.status}, expected 403`);
    });

    await step("owner can rotate join code", async () => {
      const r = await req("POST", `/api/shops/${shopId}/rotate-code`, {}, ownerToken);
      if (r.status !== 200) throw new Error(`status=${r.status}`);
      if (r.json.join_code === joinCode) throw new Error("code did not change");
    });

    await step("owner can deactivate staff (revokes devices)", async () => {
      const r = await req("POST", `/api/staff/${staffId}/deactivate`, {}, ownerToken);
      if (r.status !== 200) throw new Error(`status=${r.status}`);
      if (r.json.deactivated !== true) throw new Error("did not deactivate");
    });

    await step("deactivated staff token returns 401 on /api/me", async () => {
      const r = await req("GET", "/api/me", undefined, staffToken);
      if (r.status !== 401) throw new Error(`status=${r.status}, expected 401`);
    });

    await step("missing token on /api/me returns 401", async () => {
      const r = await req("GET", "/api/me");
      if (r.status !== 401) throw new Error(`status=${r.status}`);
    });

    await step("invalid join code returns 404", async () => {
      const r = await req("POST", "/api/shops/join", { join_code: "ZZZZ-ZZZZ", display_name: "X" });
      if (r.status !== 404) throw new Error(`status=${r.status}`);
    });

    console.log("\nsmoke tests passed.");
  } finally {
    server.close();
  }
})();
