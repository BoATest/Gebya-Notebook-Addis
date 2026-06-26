/**
 * RBAC + Multi-Staff Smoke Tests
 *
 * These tests verify the critical paths for multi-staff functionality.
 * They require a running database and auth tokens set as env vars.
 * Skip the suite by omitting the env vars.
 *
 * Required env vars to run:
 *   TEST_OWNER_TOKEN  — JWT for an owner account
 *   TEST_CASHIER_TOKEN — JWT for a cashier account
 *   TEST_VIEWER_TOKEN  — JWT for a viewer account
 *   TEST_NEW_USER_TOKEN — JWT for a user NOT yet in any business (for join test)
 *   API_TEST_URL       — e.g. http://localhost:3001/api (default)
 */

import { describe, it, expect, afterAll } from "vitest";

const API_BASE = process.env.API_TEST_URL || "http://localhost:3001/api";
const AUTH_TOKEN_OWNER = process.env.TEST_OWNER_TOKEN || "";
const AUTH_TOKEN_CASHIER = process.env.TEST_CASHIER_TOKEN || "";
const AUTH_TOKEN_VIEWER = process.env.TEST_VIEWER_TOKEN || "";
const AUTH_TOKEN_NEW_USER = process.env.TEST_NEW_USER_TOKEN || "";

// Track invites we create so we can clean them up
const createdInviteTokens: string[] = [];

async function apiPost(path: string, body: any, token?: string) {
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function apiPatch(path: string, body: any, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { ...{ Authorization: `Bearer ${token}` }, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─────────────────────────────────────────────
// 1. RBAC Enforcement
// ─────────────────────────────────────────────
describe.runIf(AUTH_TOKEN_OWNER)("RBAC Enforcement", () => {
  it("Owner can push sync → 200", async () => {
    const { status } = await apiPost("/sync/push", { device_id: "test-device", tables: {} }, AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
  });

  it("Owner can pull sync → 200", async () => {
    const { status } = await apiGet("/sync/pull", AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
  });

  it("Owner can call audit/activity → 200", async () => {
    // API_BASE already includes /api, so path is just /audit/activity
    const { status } = await apiGet("/audit/activity", AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
  });

  it("Cashier blocked from audit/activity → 403", async () => {
    if (!AUTH_TOKEN_CASHIER) return;
    const { status } = await apiGet("/audit/activity", AUTH_TOKEN_CASHIER);
    expect(status).toBe(403);
  });

  it("Cashier blocked from PATCH permissions → 403", async () => {
    if (!AUTH_TOKEN_CASHIER) return;
    const { status } = await apiPatch("/business/members/999/permissions", { can_delete_records: false }, AUTH_TOKEN_CASHIER);
    expect(status).toBe(403);
  });

  it("Viewer blocked from sync/push → 403", async () => {
    if (!AUTH_TOKEN_VIEWER) return;
    const { status } = await apiPost("/sync/push", { device_id: "test-device", tables: {} }, AUTH_TOKEN_VIEWER);
    expect(status).toBe(403);
  });

  it("Viewer allowed on sync/pull → 200", async () => {
    if (!AUTH_TOKEN_VIEWER) return;
    const { status } = await apiGet("/sync/pull", AUTH_TOKEN_VIEWER);
    expect(status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// 2. Invite Flow
// ─────────────────────────────────────────────
describe.runIf(AUTH_TOKEN_OWNER)("Invite Flow", () => {
  let inviteToken = "";
  let inviteId: number | null = null;

  afterAll(async () => {
    // Cleanup: revoke invites created during test run
    for (const token of createdInviteTokens) {
      // We need the invite ID to cancel it via DELETE /invites/:inviteId
      // First look up pending invites to find the matching one
      const { data } = await apiGet("/business/invites/pending", AUTH_TOKEN_OWNER);
      if (data.pending) {
        for (const inv of data.pending) {
          if (inv.token === token && inv.id) {
            await apiDelete(`/business/invites/${inv.id}`, AUTH_TOKEN_OWNER);
          }
        }
      }
    }
    createdInviteTokens.length = 0;
  });

  it("Owner can create invite → 200 with invite_token", async () => {
    const { status, data } = await apiPost("/business/invite", {
      staff_name: "Test Staff",
      phone_number: "911223344",
      role: "cashier",
    }, AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
    expect(data.invite_token).toBeTruthy();
    inviteToken = data.invite_token;
    createdInviteTokens.push(inviteToken);
  });

  it("Owner sees pending invites with token → 200", async () => {
    const { status, data } = await apiGet("/business/invites/pending", AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
    expect(Array.isArray(data.pending)).toBe(true);
    const found = data.pending.find((inv: any) => inv.token === inviteToken);
    expect(found).toBeTruthy();
    if (found) inviteId = found.id;
  });

  it("Valid invite token can be used to join → 200", async () => {
    if (!inviteToken) return; // skip if no invite was created
    // This test calls the join endpoint with a valid token.
    // If the caller is not authenticated (no token), the API returns
    // { ok: true, requires_auth: true, ... } with status 200.
    // If authenticated as a NEW user (TEST_NEW_USER_TOKEN), it should
    // successfully join the business.
    const tokenToUse = AUTH_TOKEN_NEW_USER || "";
    const { status, data } = await apiPost(`/business/join/${inviteToken}`, {}, tokenToUse || undefined);

    if (tokenToUse) {
      // Authenticated as a new user — expect success
      expect(status).toBe(200);
      expect(data.joined || data.already_member).toBe(true);
    } else {
      // Unauthenticated — expect requires_auth response
      expect(status).toBe(200);
      expect(data.requires_auth).toBe(true);
    }
  });

  it("Invalid invite token returns 404", async () => {
    const { status } = await apiPost("/business/join/invalid-token-does-not-exist-12345", {});
    expect(status).toBe(404);
  });

  it("Invite created without notification shows method", async () => {
    const { status, data } = await apiPost("/business/invite", {
      staff_name: "NoNotif Staff",
      phone_number: "922334455",
      role: "viewer",
    }, AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
    expect(data.notification_sent).toBeDefined();
    expect(data.notification_method).toBeDefined();
    if (data.invite_token) createdInviteTokens.push(data.invite_token);
  });
});

// ─────────────────────────────────────────────
// 3. Audit Log
// ─────────────────────────────────────────────
describe.runIf(AUTH_TOKEN_OWNER)("Audit Log", () => {
  it("Violations endpoint returns array", async () => {
    const { status, data } = await apiGet("/audit/violations", AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
    expect(Array.isArray(data.violations)).toBe(true);
  });

  it("Activity endpoint returns array", async () => {
    const { status, data } = await apiGet("/audit/activity", AUTH_TOKEN_OWNER);
    expect(status).toBe(200);
    expect(Array.isArray(data.activity)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Notes for CI integration
// ─────────────────────────────────────────────
// 
// TODO: The join flow test (line ~127) requires TEST_NEW_USER_TOKEN to be set
// to a JWT for a user who is NOT yet a member of any business.
// When running in CI, obtain this token by registering a test user or
// using a pre-provisioned test account.
//
// TODO: Cleanup ignores invites that were already accepted — they are left
// in the database intentionally. A production test suite should reset
// test data between runs (e.g. database truncation or dedicated test
// business accounts).