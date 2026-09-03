// featureFlags.js — runtime kill-switches for in-flight redesigns.
//
// SALE_WORKSPACE_V1 — unified sale capture (Today capture strip + full-screen
// Sale Workspace replacing the legacy two-button sale flow). Default ON.
// Kill-switch: set localStorage 'gebya_sale_workspace_v1' = 'off' to restore
// the legacy path (TransactionForm sale branch + ItemizedSaleView) for one
// release, per the rollout plan.
export const SALE_WORKSPACE_FLAG = 'gebya_sale_workspace_v1';

export function isSaleWorkspaceEnabled() {
  try {
    return localStorage.getItem(SALE_WORKSPACE_FLAG) !== 'off';
  } catch {
    return true; // storage blocked → new experience stays on
  }
}
