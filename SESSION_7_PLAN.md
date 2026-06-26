# Session 7 Plan — Closing the Gaps for Real Deployment

## Honest Status

**90% of the architecture is done.** The RBAC, audit trail, owner dashboard, permission controls, invite flow, and staff accept screen all exist. They compile. They work end to end in a testing environment.

**But "ready to be used by a real shop" requires 3 things we don't have yet:**

---

## Gap 1 — No Notification Fallback (BLOCKER)

**The problem:** When an owner invites a new staff member who doesn't have Telegram linked, the invite goes into "Notification Pending" and nothing happens. The owner has no way to communicate the invite to the staff. The staff has no way to discover they were invited.

**The fix (small, ~30 minutes):**
- Show the invite code (the token) on the pending invite card in the owner's team list
- The owner can read the code to the staff member verbally
- Add a text input on the staff's login screen where they can paste/enter the invite code
- When entered, it behaves the same as if they clicked "Accept & Join"

**Why this matters:** This removes Telegram as a dependency. Every staff member can join, regardless of whether they have Telegram.

---

## Gap 2 — Owner Cannot See the Code (EASY)

**The fix (15 minutes):**
- In `TeamPage.jsx`, under the pending invite card, add a line showing the invite code/token
- Style it like a coupon code — big font, easy to read aloud
- Copy button included

---

## Gap 3 — No Invite Code Entry on Staff Side (EASY)

**The fix (20 minutes):**
- In `AuthGate.jsx` or a standalone screen, add a text input: "Enter invite code from your owner"
- On submit, call `POST /business/join/<code>` 
- On success, link the user to the business

---

## Gap 4 — No Automated Tests (MEDIUM)

**Before real deployment, you need at minimum:**
- One test that an owner can successfully invite and a staff can accept
- One test that a cashier gets 403 on blocked endpoints
- One test that a blocked attempt creates an audit log entry

**Without these, you risk deploying a regression that breaks RBAC silently.**

---

## Gap 5 — No Conflict Resolution UI (LOW PRIORITY)

The backend returns conflicts when two staff edit the same record offline. The owner has no way to see or resolve them. This can wait until after first deployment — it won't prevent day-1 usage.

---

## Readiness Decision

| Question | Answer |
|----------|--------|
| Can a real shop owner invite a real sales staff today? | ❌ No — if the staff doesn't have Telegram, they can't get the invite |
| Can a real sales staff join and start recording sales? | ✅ Yes, once they receive the invite somehow |
| Can the owner see what staff are doing? | ✅ Yes — activity dashboard + audit feed |
| Can the owner control what staff can and can't do? | ✅ Yes — permission toggles per staff member |
| Can the owner see blocked attempts? | ✅ Yes — blocked actions section |

**Verdict:** Not ready today. One missing feature (invite code visibility + manual entry) blocks the entire onboarding flow. That's a 1-hour fix, not a week of work.

---

## Proposed Plan

**Fix 1: Show invite code to owner** — 1 file change (TeamPage.jsx)
**Fix 2: Allow staff to enter invite code manually** — 1 new input in AuthGate or StaffInviteAcceptScreen
**Fix 3: Once those are done** — deploy to one real shop, sit with them, watch what breaks

**That's it.** Three small changes and you're ready to test with real users. No big architecture work left.