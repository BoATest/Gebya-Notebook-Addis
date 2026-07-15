# 3-WEEK ROADMAP TO LAUNCH-READY

**Start Date**: July 3, 2026  
**Launch Date**: July 24, 2026 (controlled beta, 10 shops)  
**Goal**: Score 9+ on all 10 audit dimensions

---

## WEEK 1: DATA QUALITY FOUNDATION

### Monday (Day 1)
**Focus: Business Context (no GPS)**

**Morning:**
- [ ] Add schema fields to `businesses` table:
  - `marketArea` (enum)
  - `businessAddress` (text)
  - `tradeLicenseNumber` (optional text)
  - `tinNumber` (optional text)
  - `verificationType` (enum)
- [ ] Run migration

**Afternoon:**
- [ ] Build business profile UI in Settings
- [ ] Add market area dropdown (Merkato, Piassa, Kality, etc.)
- [ ] Add trade license input with tooltip: "Optional — unlock verified features"
- [ ] Test: Save profile → data persists

**Evening:**
- [ ] Add verification badge to shop name display
- [ ] Test end-to-end

**Done:** Business identity capture without GPS

---

### Tuesday (Day 2)
**Focus: Device Fingerprinting**

**All day:**
- [ ] Add `deviceFingerprint` field to transactions
- [ ] Implement fingerprint generation (browser + device info)
- [ ] Capture on every transaction
- [ ] Add to sync payload

**Done:** Device trust layer

---

### Wednesday-Thursday (Day 3-4)
**Focus: Product Normalization — Part 1**

**Wednesday:**
- [ ] Implement Levenshtein distance function
- [ ] Create fuzzy matching utility (`utils/fuzzyMatch.ts`)
- [ ] Test: `levenshtein("sugar", "suger")` → 1

**Thursday:**
- [ ] Build suggestion dropdown component
- [ ] Integrate into TransactionForm
- [ ] Load past item names from IndexedDB
- [ ] Test: Type "suger" → shows "Sugar" suggestion

**Done:** Smart suggestions working

---

### Friday (Day 5)
**Focus: Product Normalization — Part 2**

**Morning:**
- [ ] Update `catalog_entries` table:
  - Add `canonicalName` field
  - Add `aliases` JSON field
- [ ] Migration

**Afternoon:**
- [ ] On transaction save:
  - Check if item matches existing catalog
  - If fuzzy match: link to canonical
  - If new: create catalog entry
- [ ] Test: Save "suger" → stores as "Sugar"

**Done:** Canonical product names

---

### Saturday-Sunday (Day 6-7)
**Focus: Admin Product Merge UI**

**Saturday:**
- [ ] Admin dashboard: Data Quality page
- [ ] Query duplicate product candidates (Levenshtein < 3)
- [ ] Display in table with merge button
- [ ] Test query performance

**Sunday:**
- [ ] Implement merge function:
  - Update all transactions to canonical ID
  - Move aliases to canonical entry
  - Soft-delete duplicate
- [ ] Test: Merge "suger" into "Sugar" → all transactions now "Sugar"

**Done:** Product normalization complete ✅

---

## WEEK 2: TRUST & ANALYTICS

### Monday (Day 8)
**Focus: Trust Score Algorithm**

**Morning:**
- [ ] Create `utils/trustScore.ts`
- [ ] Implement factor calculations:
  - Device consistency
  - Timing pattern
  - Amount reasonableness
  - Edit frequency
  - Photo proof
  - Supplier linked
  - Actor attribution

**Afternoon:**
- [ ] Write unit tests for each factor
- [ ] Test edge cases

**Done:** Algorithm complete

---

### Tuesday (Day 9)
**Focus: Trust Score Integration**

**All day:**
- [ ] Add fields to transactions:
  - `trustScore` (number)
  - `trustScoreFactors` (JSONB)
- [ ] Calculate score on transaction save
- [ ] Store in database
- [ ] Test: Create transaction → score calculated

**Done:** Trust scoring live

---

### Wednesday (Day 10)
**Focus: Trust Score Admin UI**

**All day:**
- [ ] Admin dashboard: Trust score column in transactions
- [ ] Badge component (color-coded: green >80, yellow 50-80, red <50)
- [ ] Expandable detail showing factor breakdown
- [ ] Filter by trust score range
- [ ] Test: View transaction → see score + breakdown

**Done:** Trust scores visible to admin

---

### Thursday (Day 11)
**Focus: Analytics Instrumentation**

**Morning:**
- [ ] Create `utils/analytics.ts`
- [ ] Implement `trackEvent` function
- [ ] Add event batching (max 20)
- [ ] Add send on app close

**Afternoon:**
- [ ] Instrument key events:
  - `app_opened`, `transaction_created`, `voice_attempt`
  - `voice_success`, `voice_fallback`, `customer_added`
  - `staff_invited`, `feature_used`, `session_end`

**Done:** Events tracked

---

### Friday (Day 12)
**Focus: Analytics Backend**

**Morning:**
- [ ] Create `analytics_events` table
- [ ] Add indexes (event_name, business_id, timestamp)
- [ ] API endpoint: `POST /api/analytics/events`

**Afternoon:**
- [ ] Test: Send batch → events stored
- [ ] Write queries:
  - Daily active users
  - Voice success rate
  - Feature adoption
  - Retention cohorts

**Done:** Analytics backend ready

---

### Saturday-Sunday (Day 13-14)
**Focus: Analytics Admin Dashboard**

**Saturday:**
- [ ] Admin dashboard: Analytics page
- [ ] KPI cards: DAU, Total Transactions, Voice Success Rate
- [ ] Line chart: DAU over 30 days
- [ ] Pie chart: Voice vs Manual

**Sunday:**
- [ ] Table: Feature adoption
- [ ] Table: Retention cohorts
- [ ] Test: Real data displays correctly

**Done:** Analytics dashboard complete ✅

---

## WEEK 3: ADMIN TOOLS, QA, ONBOARDING

### Monday-Tuesday (Day 15-16)
**Focus: Admin Dashboard — Data Quality & Shop Overview**

**Monday:**
- [ ] Data Quality page complete:
  - Duplicate customers (group by phone)
  - Duplicate products (already done)
  - Outlier transactions (trust score < 50)
  - Orphaned records

**Tuesday:**
- [ ] Shop Overview page:
  - Table with all shops
  - Filters: Status, Tier, Market Area
  - Search by phone/name
  - Click row → shop detail

**Done:** 2 of 4 admin pages complete

---

### Wednesday (Day 17)
**Focus: Admin Dashboard — Support Tools**

**All day:**
- [ ] Support page:
  - Search by phone → load shop data
  - View transaction history
  - View audit log
  - Actions: Reset password, Deactivate shop
- [ ] Test: Search → view data → perform action

**Done:** Admin dashboard complete ✅

---

### Thursday (Day 18)
**Focus: Onboarding**

**Morning:**
- [ ] 3-screen onboarding:
  - Screen 1: Problem (paper notebook pain)
  - Screen 2: Solution (Gebya features)
  - Screen 3: First action (record sale)

**Afternoon:**
- [ ] Localize (English + Amharic)
- [ ] Show once per device
- [ ] Skippable
- [ ] Test: Fresh install → onboarding shows

**Done:** Onboarding complete ✅

---

### Friday (Day 19)
**Focus: Comprehensive QA — Part 1**

**All day:**
- [ ] Test matrix:
  - Voice recording flow (4 scenarios)
  - Credit management (4 scenarios)
  - Multi-device sync (3 scenarios)
  - Product normalization (3 scenarios)
  - Trust scoring (3 scenarios)
- [ ] Document bugs
- [ ] Prioritize top 10

**Done:** QA matrix 50% complete

---

### Saturday (Day 20)
**Focus: Comprehensive QA — Part 2**

**All day:**
- [ ] Continue test matrix:
  - Edge cases (8 scenarios)
  - Admin dashboard (6 scenarios)
  - Analytics (4 scenarios)
- [ ] Test on low-end Android (<2GB RAM)
- [ ] Test on 2G network
- [ ] Test with 1000+ transactions

**Done:** QA matrix 100% complete

---

### Sunday (Day 21)
**Focus: Bug Fixes + Final Audit**

**Morning:**
- [ ] Fix top 10 bugs from QA
- [ ] Re-test critical paths

**Afternoon:**
- [ ] Run Lighthouse audit (target: >90)
- [ ] Run TypeScript compile (zero errors)
- [ ] Run test suite (all passing)
- [ ] Check accessibility (axe DevTools)

**Evening:**
- [ ] Build evidence package:
  - Screenshots of all UIs
  - 5-minute demo video
  - QA results spreadsheet
  - Lighthouse report
  - Test coverage report

**Done:** Phase 1 complete ✅

---

## DAY 22-24: CONTROLLED BETA PREP

### Monday (Day 22)
**Focus: Beta Recruitment**

- [ ] Recruit 10 shop owners (personally)
- [ ] Explain beta program
- [ ] Get consent for daily check-ins
- [ ] Schedule onboarding calls

---

### Tuesday (Day 23)
**Focus: Support Runbook**

**All day:**
- [ ] Document top 10 support scenarios:
  - "I forgot my password" → Send OTP reset
  - "My data is gone" → Check sync status
  - "Voice isn't working" → Fallback to manual
  - "How do I add staff?" → Guide through invite
  - "How do I see my profit?" → Navigate to reports
  - "Customer balance is wrong" → Audit transaction history
  - "I want to verify my business" → Guide to trade license input
  - "Can I export data?" → CSV export
  - "How do I connect Telegram?" → QR code process
  - "I need to delete a transaction" → Admin assistance
- [ ] Create support template messages

**Done:** Support runbook ready

---

### Wednesday (Day 24)
**LAUNCH DAY — Controlled Beta**

**Morning:**
- [ ] Final smoke test
- [ ] Deploy to production
- [ ] Verify all endpoints healthy

**Afternoon:**
- [ ] Onboard first 5 shops (video calls)
- [ ] Watch first transactions happen
- [ ] Monitor admin dashboard

**Evening:**
- [ ] Onboard remaining 5 shops
- [ ] Send welcome message with support contact

**Done:** 10 shops live ✅

---

## WEEK 4+ (Post-Launch)

### Daily for 2 Weeks:
- [ ] Check admin dashboard (DAU, transactions, errors)
- [ ] Call 2 shop owners for feedback
- [ ] Fix any critical bugs immediately
- [ ] Document feature requests

### Week 4 End:
- [ ] Analyze trust scores (average across shops)
- [ ] Analyze voice success rate
- [ ] Analyze retention (day 7)
- [ ] Gather testimonials

### Week 5-6:
- [ ] Iterate based on feedback
- [ ] Prepare for 100-shop expansion

---

## DAILY CHECKLIST (FOR YOU)

Every day during 3 weeks:

**Morning:**
- [ ] Review yesterday's progress
- [ ] Prioritize today's 3 critical tasks
- [ ] Set focus block (4 hours, no interruptions)

**Afternoon:**
- [ ] Complete today's roadmap items
- [ ] Test what you built
- [ ] Document any blockers

**Evening:**
- [ ] Update progress tracker
- [ ] Commit code
- [ ] Prepare tomorrow's tasks

---

## SUCCESS METRICS (Track Daily)

**Development:**
- [ ] Lines of code written
- [ ] Tests passing
- [ ] Features completed

**Quality:**
- [ ] Bugs found
- [ ] Bugs fixed
- [ ] Test coverage %

**Launch Readiness:**
- [ ] Audit scores (update weekly)
- [ ] Evidence items collected

---

## WEEK-BY-WEEK MILESTONES

### Week 1 Done:
✅ Product normalization complete  
✅ Business context captured  
✅ Device fingerprinting  
✅ Audit score: Data Quality 4/10 → 9/10

### Week 2 Done:
✅ Trust scoring live  
✅ Analytics instrumented  
✅ Admin dashboard analytics page  
✅ Audit score: Analytics 3/10 → 9/10, Data Integrity 8/10 → 9/10

### Week 3 Done:
✅ Admin dashboard complete  
✅ Onboarding implemented  
✅ QA complete  
✅ Audit score: Operations 6/10 → 9/10, Business Validation 6/10 → 9/10

### Week 4:
✅ 10 shops using Gebya  
✅ Feedback gathered  
✅ Real-world validation  

---

## EMERGENCY ESCAPE PLAN

**If falling behind schedule:**

**Priority 1 (Must Have for Beta):**
- Product normalization
- Trust scoring
- Analytics (basic)
- Admin shop search
- Onboarding

**Priority 2 (Nice to Have):**
- Admin duplicate merge UI
- Advanced analytics charts
- Comprehensive QA

**Priority 3 (Can Launch Without):**
- Perfect accessibility
- All edge cases tested
- Supplier verification

**Decision rule:** If >3 days behind, drop Priority 3, focus on Priority 1.

---

## TOOLS & RESOURCES

**Development:**
- VS Code + TypeScript
- PostgreSQL (Supabase/Neon)
- Vercel (deploy preview per commit)

**Testing:**
- Playwright (E2E)
- Vitest (unit tests)
- Lighthouse (audit)
- axe DevTools (accessibility)

**Monitoring:**
- Sentry (errors)
- Admin dashboard (usage)
- PostgreSQL logs (performance)

**Communication:**
- Phone + WhatsApp (beta users)
- GitHub Issues (bug tracking)
- Google Sheets (QA matrix, progress tracker)

---

## YOU'RE READY

This roadmap is:
- ✅ Specific (every task defined)
- ✅ Measurable (clear done criteria)
- ✅ Achievable (3 weeks, 8 hours/day = 168 hours)
- ✅ Realistic (no impossible tasks)
- ✅ Time-bound (every task has a day)

**Follow it. Check off boxes. Build evidence. Launch.**

**On July 24, you'll have 10 shops using a world-class product.**
