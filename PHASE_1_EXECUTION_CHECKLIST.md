# PHASE 1: DATA FOUNDATION — WORLD-CLASS EXECUTION CHECKLIST

**Goal**: Score 9+ on all 10 audit dimensions  
**Timeline**: 3 weeks  
**Definition of Done**: Every item below is ✅ with evidence

---

## WEEK 1: BUSINESS CONTEXT & PRODUCT NORMALIZATION

### 1.1 Business Identity Capture (2 days)

**Schema Changes:**
- [ ] Add `shopLocationText` to businesses table (text field)
- [ ] Add `marketArea` to businesses (enum: merkato, piassa, kality, addis_ketema, other)
- [ ] Add `tradeLicenseNumber` (optional text)
- [ ] Add `tinNumber` (optional text)
- [ ] Add `businessAddress` (text)
- [ ] Add `verificationType` (enum: basic, license_verified, tin_verified, bank_partner)
- [ ] Add `deviceFingerprint` to transactions (captures browser/device signature)

**UI Changes:**
- [ ] Add business profile screen in Settings
- [ ] Market area dropdown with Ethiopian cities/areas
- [ ] Trade license input with "Why add this?" explainer
- [ ] Verification badge display (if license provided)

**Evidence:**
- [ ] Migration file exists and tested
- [ ] UI screenshots show new fields
- [ ] Business profile saves correctly

---

### 1.2 Product Normalization (5 days)

**Algorithm:**
- [ ] Implement Levenshtein distance function
- [ ] Create fuzzy matching for item names (distance < 3)
- [ ] Build suggestion dropdown component
- [ ] Store past item names in IndexedDB for quick lookup

**UI:**
- [ ] TransactionForm shows suggestions as user types
- [ ] Clicking suggestion auto-fills item name
- [ ] "Add new item" option if no match
- [ ] Admin can view duplicate product candidates

**catalog_entries Integration:**
- [ ] When user saves transaction with new item name:
  - Check if fuzzy match exists in catalog
  - If yes: link to canonical catalog entry
  - If no: create new catalog entry
- [ ] Store aliases: canonical name + variations

**Testing:**
- [ ] Type "suger" → shows "Sugar"
- [ ] Type "suga" → shows "Sugar"
- [ ] Type "coffe" → shows "Coffee"
- [ ] New item "Laptop" → creates catalog entry

**Evidence:**
- [ ] Video demo of suggestion working
- [ ] catalog_entries table has canonical names
- [ ] Test coverage for fuzzy matching function

---

## WEEK 2: TRUST SCORING & ANALYTICS

### 2.1 Behavioral Trust Score (5 days)

**Algorithm Design:**
```typescript
function calculateTrustScore(transaction, shop, history): TrustScore {
  let score = 0;
  
  // Factor 1: Device consistency (20 points)
  if (sameDeviceAs90PercentOfHistory) score += 20;
  else if (recognizedDevice) score += 10;
  
  // Factor 2: Timing pattern (15 points)
  if (duringBusinessHours()) score += 15;
  else if (outsideHoursButConsistent()) score += 10;
  
  // Factor 3: Amount reasonable (20 points)
  const stdDev = calculateStdDev(history.amounts);
  if (amount < mean + 2*stdDev) score += 20;
  else if (amount < mean + 3*stdDev) score += 10;
  
  // Factor 4: Edit history (15 points)
  if (!transaction.wasEdited) score += 15;
  else if (editedOnce) score += 10;
  
  // Factor 5: Photo attached (10 points)
  if (transaction.photos?.length > 0) score += 10;
  
  // Factor 6: Supplier linked (10 points)
  if (transaction.supplierId) score += 10;
  
  // Factor 7: Actor clear (10 points)
  if (transaction.actorStaffMemberId) score += 10;
  
  return {
    overall: score,
    factors: { ... }
  };
}
```

**Implementation:**
- [ ] Create `utils/trustScore.ts`
- [ ] Calculate score on every transaction save
- [ ] Store score in `transactions.trust_score` field (new field)
- [ ] Add `trust_score_factors` JSONB field for breakdown

**Admin Dashboard View:**
- [ ] Shop-level average trust score
- [ ] Transaction-level score breakdown
- [ ] Flag transactions with score < 50

**Evidence:**
- [ ] Test cases for each factor
- [ ] Trust scores calculated for existing data
- [ ] Admin can see scores

---

### 2.2 Analytics Instrumentation (2 days)

**Events to Track:**

| Event | Properties | When |
|-------|-----------|------|
| `app_opened` | deviceId, timestamp | App launch |
| `transaction_created` | type, source, amount, trustScore | Save clicked |
| `voice_attempt` | success, confidence, duration | Voice used |
| `voice_fallback` | reason | Manual entry after voice fail |
| `customer_added` | hasPhone, hasTelegram | Customer saved |
| `staff_invited` | role | Invite sent |
| `feature_used` | featureName | Any feature clicked |
| `session_end` | duration, actionsCount | App closed |

**Implementation:**
- [ ] Create `utils/analytics.js`
- [ ] Add `trackEvent` function
- [ ] Batch events locally (max 20)
- [ ] Send batch to backend on app close or batch full
- [ ] Backend stores in `analytics_events` table

**Analytics Events Table:**
```typescript
{
  id, deviceId, businessId, eventName, 
  properties (JSONB), timestamp
}
```

**Evidence:**
- [ ] Events sent to backend
- [ ] Backend stores events
- [ ] Can query events in Postgres

---

## WEEK 3: ADMIN DASHBOARD & QA

### 3.1 Admin Operations Dashboard (4 days)

**Route:** `/admin` (owner-only, requires special permission)

**Page 1: Data Quality**
- [ ] **Duplicate Customers**
  - Group by phone number
  - Show merge candidates
  - "Merge" button (owner approval)
- [ ] **Duplicate Products**
  - Show fuzzy matches (distance < 3)
  - Group by canonical name
  - "Merge" button
- [ ] **Outlier Transactions**
  - Transactions with trustScore < 50
  - Amounts > 3 standard deviations
  - "Flag for review" button
- [ ] **Orphaned Records**
  - Customers with no transactions (30+ days)
  - Transactions with no actor

**Page 2: Shop Overview**
- [ ] Table: All registered shops
- [ ] Columns: Name, Phone, Market Area, Verification Tier, Trust Score Avg, Last Active, Total Transactions
- [ ] Filters: Active/Inactive, Verification Tier, Market Area
- [ ] Search by phone or shop name
- [ ] Click row → drill down to shop detail

**Page 3: Analytics**
- [ ] Daily active shops (line chart, 30 days)
- [ ] Transaction volume (bar chart, 7 days)
- [ ] Voice vs manual ratio (pie chart)
- [ ] Feature adoption (table: feature, usage count, unique users)
- [ ] Retention cohorts (table: week 0, week 1, week 2, week 3+)

**Page 4: Support Tools**
- [ ] Search by phone → show all data for that user
- [ ] View transaction history
- [ ] View audit log
- [ ] "Reset password" (send new OTP)
- [ ] "Deactivate shop" (soft delete)

**Evidence:**
- [ ] Screenshots of all 4 pages
- [ ] Demo video navigating dashboard
- [ ] Owner-only check enforced

---

### 3.2 Comprehensive QA (3 days)

**Test Matrix:**

| Test Area | Scenarios | Pass/Fail |
|-----------|-----------|-----------|
| **Voice** | Record → Save | [ ] |
| | Record → Fail → Manual | [ ] |
| | Re-record after mistake | [ ] |
| | Voice during poor network | [ ] |
| **Credit** | Add credit | [ ] |
| | Partial payment | [ ] |
| | Full payment → balance zero | [ ] |
| | Multiple payments same customer | [ ] |
| **Sync** | Owner + cashier edit same customer | [ ] |
| | Offline edit → online sync | [ ] |
| | Conflict resolution | [ ] |
| **Edge Cases** | Negative amount blocked | [ ] |
| | Future date blocked | [ ] |
| | Duplicate customer phone | [ ] |
| | localStorage full | [ ] |
| | API timeout → retry | [ ] |
| **Devices** | Android (low-end, 2GB RAM) | [ ] |
| | 2G network | [ ] |
| | 1000+ transactions loaded | [ ] |
| **Product Norm** | Type "suger" → shows "Sugar" | [ ] |
| | Accept suggestion → saves canonical | [ ] |
| **Trust Score** | Normal transaction → high score | [ ] |
| | Outlier amount → low score | [ ] |
| | Photo attached → +10 points | [ ] |
| **Admin** | View duplicate customers | [ ] |
| | Merge duplicates | [ ] |
| | View trust scores | [ ] |

**Evidence:**
- [ ] QA spreadsheet with all scenarios
- [ ] Every scenario marked pass/fail
- [ ] Top 10 bugs documented and prioritized

---

## WEEK 3 (BONUS): ONBOARDING & VALUE PROP

### 3.3 First-Time User Experience (2 days)

**3-Screen Onboarding:**

**Screen 1: Problem**
```
[Image: Paper notebook with crossed out lines]

"Tired of paper notebooks?"

• Lost or damaged notebooks
• Can't remember who owes what
• No idea if you're making profit

[Next]
```

**Screen 2: Solution**
```
[Image: Phone with voice waveform]

"Gebya is your digital notebook"

✓ Record sales by voice — faster than writing
✓ Track credit automatically — never forget
✓ Calculate profit — know your business

[Next]
```

**Screen 3: First Action**
```
[Image: Microphone button]

"Try it now — record your first sale"

Tap the microphone and say:
"I sold bread for 50 birr"

[🎤 Record My First Sale]
[Skip for now]
```

**Implementation:**
- [ ] OnboardingScreen.jsx updated
- [ ] Shown only once per device
- [ ] Skippable
- [ ] Localized (English + Amharic)

**Evidence:**
- [ ] Screenshots of all 3 screens
- [ ] Test: fresh install shows onboarding
- [ ] Test: returning user doesn't see it

---

### 3.4 Value Prop in App (1 day)

**Add context hints:**
- [ ] First voice record → tooltip: "Speak naturally, I'll detect the amount"
- [ ] After first sale → "Great! Now you can see your profit"
- [ ] Empty credit list → "Add customers here to track who owes you"
- [ ] Settings → "About Gebya" section with mission statement

**Evidence:**
- [ ] Tooltips visible in UI
- [ ] About page written

---

## DEFINITION OF DONE (World-Class)

Check ALL before declaring Phase 1 complete:

### Code Quality
- [ ] TypeScript strict mode enabled, zero errors
- [ ] All new functions have JSDoc comments
- [ ] Test coverage > 80% on new code
- [ ] No ESLint errors
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)

### Data Quality
- [ ] Product normalization working (demo video)
- [ ] Trust scores calculated for all transactions
- [ ] Business context captured (market area, address)
- [ ] No GPS required

### Analytics
- [ ] 20+ events instrumented
- [ ] Backend receiving events
- [ ] Admin can view event dashboard
- [ ] Daily active user count visible

### Admin Tools
- [ ] Dashboard has 4 pages (Quality, Overview, Analytics, Support)
- [ ] Duplicate detection working
- [ ] Trust score flagging working
- [ ] Owner-only access enforced

### QA
- [ ] Test matrix 100% complete
- [ ] Tested on Android (low-end device)
- [ ] Tested on 2G network
- [ ] Zero blocker bugs

### Documentation
- [ ] README updated with new features
- [ ] API endpoints documented
- [ ] Support runbook created (top 10 issues)
- [ ] Admin dashboard user guide

### Onboarding
- [ ] 3-screen onboarding implemented
- [ ] Value prop clear in <30 seconds
- [ ] Contextual help added

---

## PHASE 1 COMPLETION CRITERIA

**Before moving to Phase 2 (Controlled Launch), you must:**

1. **Demo to 3 non-technical friends**
   - They understand what Gebya does in <30 seconds
   - They can record a voice transaction without help
   - They understand the trust score concept

2. **Data Quality Audit Passes**
   - Product suggestions working (video evidence)
   - Trust scores calculated for 100% of transactions
   - Admin can flag outliers

3. **Technical Audit Passes**
   - Lighthouse score > 90
   - No TypeScript errors
   - Test coverage > 80%

4. **All 10 Audit Scores > 8**
   - Business Validation: 9/10 (onboarding + value prop clear)
   - User Journey: 8/10 (flows complete)
   - UX: 9/10 (accessibility tested)
   - Functional: 9/10 (QA matrix complete)
   - Data Quality: 9/10 (normalization + trust score)
   - Data Integrity: 8/10 (provenance complete)
   - Analytics: 9/10 (instrumented)
   - Operations: 9/10 (admin dashboard)
   - Technical: 9/10 (hardened)
   - Vision: 9/10 (trust system replaces GPS)

---

## EVIDENCE PACKAGE

Create a folder: `/phase1-evidence/`

Include:
- [ ] Screenshots of all new UIs
- [ ] Demo video (5 minutes): onboarding → voice → suggestion → trust score → admin
- [ ] QA test results spreadsheet
- [ ] Lighthouse report
- [ ] TypeScript compilation log (zero errors)
- [ ] Test coverage report
- [ ] Updated GEBYA_PLATFORM_DEEP_DIVE.md

**This is your "Phase 1 Complete" proof package.**

---

**End of Checklist**
