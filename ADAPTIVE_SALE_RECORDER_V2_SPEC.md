# Adaptive Sale Recorder V2 — Product Specification

## 1. Product Philosophy

### 1.1 Adaptive Sales Recorder

This is not just a Sales Page. It is an **Adaptive Sales Recorder**.

Every action the merchant takes improves tomorrow's experience. The system learns from usage patterns, preferences, and habits to reduce friction over time.

**Example adaptation journey:**

- **Day 1**: Merchant types everything: `Sugar` + `40`
- **Day 20**: Merchant types `Su` → sees `Sugar • 40 ETB` → one tap
- **Day 100**: Merchant doesn't type at all. Quick Items already shows `Sugar • 40` → one tap

This adaptive journey drives every UX decision.

### 1.2 Notebook First, Inventory Never

The page should **never** drift toward inventory management.

- The item is recorded because **"I want to remember what I sold."**
- NOT because **"I want to reduce stock."**

This distinction shapes the entire feature set: no stock tracking, no inventory alerts, no SKU management.

### 1.3 Merchant-Led Customization

The application should not assume payment providers. The merchant owns those.

- **Default**: Cash + CBE (as a sensible default)
- **Merchant adds**: Their own banks, wallets, credit customers
- Everything else belongs to the merchant

---

## 2. Learning Engine

### 2.1 Unified Learning System

There is **one** learning engine. Not separate systems.

It learns simultaneously:

- Items and item names
- Customer names and patterns
- Prices (typical, recent, min/max)
- Payment providers (per type: bank, wallet, cash)
- Spelling corrections
- Quick items ranking
- Autocomplete suggestions

This prevents code fragmentation and ensures consistent behavior.

### 2.2 Offline-First Learning

Everything works offline:

- Learning happens offline
- Undo works offline
- Suggestions work offline
- Sync happens later

The merchant should never think about internet connectivity.

### 2.3 Smart Reset

After a sale is saved, the form resets **but preserves learned context**.

Example:

- Merchant sells `Sugar` ten times
- Next sale opens → Quick Items still contains `Sugar`
- Only the transaction form resets, not the learning

---

## 3. Input Philosophy

### 3.1 One Input, Many Behaviors

The item field is special. It simultaneously supports:

- **Typing**: free-text entry
- **Searching**: matching against catalog
- **Creating**: new items on-the-fly
- **Learning**: capturing new patterns
- **Autocompleting**: suggesting matches

The merchant does not choose modes. The field adapts contextually.

### 3.2 Smart Parsing

The input parser should be extensible, not hardcoded.

Supported patterns:

- `Sugar 40` → item + unit price
- `Sugar 40 ETB` → item + unit price with currency
- `5x Sugar` → quantity + item
- `5 sacks of sugar` → descriptive quantity

Future patterns should be addable without rewriting core logic.

### 3.3 Draft Item Behavior (New)

Instead of immediately adding an item while typing, keep it as a **temporary draft** until the merchant taps **Add Item**.

This allows:

- Correction before commitment
- Autocomplete acceptance
- Predictable interaction

Prevents accidental item additions from partial input.

---

## 4. Quick Items Philosophy

### 4.1 Quick Items are NOT Recent Items

This deserves explicit emphasis.

**Quick Items are NOT:**

- `Recent Items`
- `Most Sold`
- `Last Used`

**Quick Items ARE:**

- `Most Helpful Right Now`

The ranking considers:

- Frequency
- Recency
- Confidence (context relevance)
- Remembered price

The merchant shouldn't know the algorithm. They should just feel: **"The app understands me."**

### 4.2 Adaptive Ranking

The algorithm balances multiple signals:

1. **Use count**: How many times used
2. **Recency**: Last used timestamp
3. **Context**: Current time of day, payment type, customer
4. **Price memory**: Typical, recent, min/max prices

These combine into a score that determines chip order.

---

## 5. Customer Philosophy

### 5.1 No CRM, No Chips

We explicitly decided against:

- Recent Customers chips
- Customer CRM
- Customer list in the recorder

Instead:

```
Type customer...
```

↓

Suggestions appear

↓

"+ Add Customer" (inline)

Clean, minimal, focused.

### 5.2 Customer as Context

Customers provide context, not navigation.

- Credit sales require a customer
- Customer history and balance are visible in Credit tab
- Sales page never shows customer list

---

## 6. Provider Philosophy

### 6.1 Merchant-Owned Providers

**Fixed (never scroll):**

- Cash
- Credit

**Scrollable (merchant-configured):**

- Banks (CBE, Dashen, Awash, etc.)
- Wallets (telebirr, CBE Birr, etc.)

The application does not assume provider names. The shop configures them in Settings.

### 6.2 Payment Row Behavior

```
Cash  →  [scrollable providers...]  →  Credit
```

- Cash and Credit are fixed anchors
- Only banks/wallets scroll horizontally
- This creates a predictable, consistent layout

---

## 7. Photo Philosophy

### 7.1 Photo is NOT Evidence

The photo is:

- NOT legal evidence
- NOT inventory tracking
- NOT OCR / AI recognition
- NOT barcode scanning

It exists because:

**Ethiopian merchants already take screenshots and photos to remember things.**

We are simply digitizing an existing habit.

### 7.2 Photo as Memory Aid

- Base64 stored on transaction record
- Non-indexed, no schema migration needed
- Max 3 photos per transaction
- Compressed automatically
- Viewable in transaction detail

---

## 8. Editing Philosophy

### 8.1 Seamless Editing

Editing a sale should **not** open a different workflow.

Merchant taps a sale → everything is prefilled:

- Amount
- Items
- Customer
- Payment
- Photo

Exactly the same recorder. Same fields, same layout.

Save → Done.

**No edit mode. No special editor.**

### 8.2 Atomic Updates

Edit operations are atomic:

- All or nothing
- Timestamp updated
- Audit log entry created
- Learning updated

---

## 9. Save Button Philosophy

### 9.1 Outcome-Explanatory Buttons

The button should explain the outcome, not just the action.

Examples:

- `Save Sale`
- `Save Expense`
- `Save Credit` (400 received, 600 remaining)

This removes ambiguity. The merchant knows exactly what will happen.

### 9.2 Smart Labels

Labels adapt to context:

- No amount → `Add amount to save photo sale`
- Multi-item → `Save 3 items • 450 ETB`
- Credit with customer → `Save Credit • 1000 ETB`
- Photo attached → `Save photo sale • 450 ETB`

---

## 10. Merchant Keypad Philosophy

### 10.1 Amount Recorder, Not Calculator

We intentionally rejected the Android Calculator pattern.

Our keypad is:

- An **amount recorder** with lightweight math
- NOT a full calculator

It supports:

- Digit entry
- Running total (additive)
- Subtract (undo last entry)
- Backspace
- Done → commits to amount field

It does NOT need:

- Multiplication
- Division
- Complex expressions
- Scientific functions

### 10.2 Running Total Model

Keypad accumulates values:

- Tap `+` → adds current display to running total
- Tap `−` → removes last entry
- Running total shown in header
- `Done` commits final total to amount field

This matches how merchants naturally think: "50 + 100 + 200 = 350"

---

## 11. Undo Philosophy

### 11.1 True Undo

Undo is **not** "hide the card."

Undo means: **pretend the sale never happened.**

Everything rolls back:

- Transaction deleted
- Customer balance restored
- Credit schedule adjusted
- Learning preserved (the data still teaches)
- Photo deleted

### 11.2 Time-Bounded Undo

- Undo available for 4 seconds after save
- Toast shows: "Sale saved" + "UNDO" button
- After 4 seconds → undo window closes
- Merchant can still delete from history manually

---

## 12. Offline-First Philosophy

### 12.1 Always Available

Everything should work offline:

- Recording sales
- Learning
- Undo
- Suggestions
- History

The merchant should never see a "no internet" error preventing work.

### 12.2 Background Sync

Sync happens automatically:

- Queued when offline
- Sent when online
- Retried on failure
- Non-blocking (never interrupts Save)

---

## 13. Empty State Philosophy

### 13.1 Zero History

New merchant. Zero transactions.

What happens:

- Quick Items: empty state message ("No items yet. Saved items will appear after you use them.")
- Suggestions: hidden
- Autocomplete: empty
- UI still feels complete

No onboarding required. No tutorial. Just start using it.

### 13.2 After Five Sales

After the merchant has ~5 sales:

- Quick Items begins showing learned items
- Autocomplete becomes active
- Suggestions appear

Learning begins immediately, invisibly.

---

## 14. Success Metrics

### 14.1 Behavioral Outcomes

A successful recorder lets a merchant:

1. **Record a simple cash sale in under 5 seconds**
2. **Record a credit sale in under 10 seconds**
3. **Reach common items with 1 tap** after the system has learned
4. **Avoid repetitive typing** because the app adapts over time

These are measurable outcomes, not just feature lists.

### 14.2 Week-Over-Week Improvement

- Week 1: ~15 seconds per sale (typing everything)
- Week 4: ~8 seconds per sale (some quick items)
- Week 12: ~3 seconds per sale (mostly taps)

This progression indicates the adaptive layer is working.

---

## 15. Technical Constraints

### 15.1 Performance

- Initial render: < 2 seconds on mid-range Android
- Save operation: < 500ms (optimistic UI)
- Bundle size: < 200KB gzipped
- Images: compressed to < 100KB each

### 15.2 Offline Storage

- Dexie.js (IndexedDB wrapper)
- All data local-first
- Cloud sync asynchronously
- Conflict resolution: last-write-wins with timestamp

### 15.3 Compatibility

- Mobile-first (Android Chrome, iOS Safari)
- Tablet-aware (max-width layout)
- Works on 3G connections
- Works offline indefinitely

---

## 16. UI Sections Reference

### 16.1 Header

- Shop name (tap → Settings)
- Actor label ("Recording as Owner • Owner")
- Language toggle (EN / አማ)
- Settings gear

### 16.2 Action Bar (Today tab only)

Three fixed buttons:

- Sale (green)
- Expense (red)
- Credit (blue)

Conditional:

- Repeat (amber) — appears if there's a sale today

### 16.3 Sale Form

**Top to bottom:**

1. Header: ← Back + Sale label + actor chip
2. Total amount (large, green)
3. Amount input (keypad-activated)
4. Quick-pick chips (50, 100, 200, 500, 1k)
5. Item input + Add Item button
6. Quick Items chips (learned)
7. Items in this sale (breakdown)
8. Payment chips: Cash → [providers] → Credit
9. More options (qty, cost price)
10. Save button

### 16.4 Credit Form

- Direction picker (They owe me / I owe them)
- Phone input (optional, +251 prefix)
- Due date picker (Today, Tomorrow, Next week, Custom)
- Item/Name (required as customer name)
- Save Credit button

### 16.5 Expense Form

- Recurring expenses quick-fill
- Amount input
- Item/Note input
- Save Expense button

---

## 17. Workflows

### 17.1 Simple Cash Sale

1. Tap Sale button
2. Type `Sugar` (or select from Quick Items)
3. Tap amount field, keypad `40`, Done
4. Tap `Save Sale`

Time: ~3-5 seconds for learned merchant

### 17.2 Credit Sale with Customer

1. Tap Sale button
2. Enter amount
3. Add items (optional)
4. Tap Credit chip
5. Type customer name → select or create
6. Set due date
7. Tap `Save Credit`

Time: ~8-10 seconds

### 17.3 Edit Sale

1. Tap entry in Today list
2. Everything prefills
3. Adjust fields
4. Tap Save

Time: ~5 seconds for simple edits

---

## 18. Edge Cases

### 18.1 Payments

- Overpayment: refused with toast "Payment is more than remaining balance"
- Partial payment: allowed, updates customer balance
- Exact balance: allowed, triggers "fully paid" state

### 18.2 Credits

- Customer must exist before credit can be saved
- Balance calculation: sum of all credit adds minus sum of all payments
- Negative balance: possible (overpaid), no reminders sent

### 18.3 Duplicate Detection

- Same item name (case-insensitive) → merges quantities
- Same customer (name match) → links to existing record
- Same transaction within 1 minute → deduplication

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Adaptive Recorder | Sales input that learns and improves over time |
| Quick Items | Context-aware item chips ranked by helpfulness |
| Enabled Providers | Banks/wallets the shop has configured |
| Credit | Money owed (customer owes shop OR shop owes supplier) |
| Learning Engine | Unified system that learns items, prices, customers, providers |
| Draft Item | Temporary item state before "Add Item" is tapped |
| Running Total | Keypad accumulation model (additive amounts) |
| True Undo | Deletes transaction and reverses all side effects |

---

## Appendix B: Design Principles

1. **Adaptive over static**: The system improves with use
2. **Notebook over inventory**: Memory, not stock tracking
3. **One engine, one learning**: No fragmented systems
4. **Merchant owns data**: Providers, customers, items are their choices
5. **Offline-first**: Always works, syncs later
6. **Behavior over features**: Success measured by merchant speed and confidence
7. **Invisible learning**: No settings, no toggles, no explanations needed
8. **Predictable interactions**: Draft → Add → Save, not accidental commits