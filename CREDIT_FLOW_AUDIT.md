# Gebya (ገበያ) Beta Build: End-to-End Credit Flow Audit & UI/UX Critique

This audit report evaluates the end-to-end **Credit Flow & Management** of the Gebya Retail Notebook system. This document serves as a comprehensive visual, functional, and user experience (UX) assessment of the credit tabs, customer entry paths, staff/ledger reconciliation flows, and report metrics pages.

---

## 🗺️ Part 1: End-to-End Credit Flow Evaluation

The core workflow of the credit tracking module is organized into five operational stages. Each stage is mapped below along with its current implementation status.

```
[Onboarding / Shop Setup] ──> [Create Customer] ──> [Add Credit / Record Payment] ──> [Chasing / Overdue Flags / Promises] ──> [Staff & Report Page Summary]
```

### 1. Onboarding & Shop Setup
* **Current UI Behavior:**
  - On launch, if no store profile exists, the merchant is guided through a clean onboarding screen (`OnboardingScreen.jsx`) prompting them for a `Shop Name` and `Language Preference` (Amharic vs. English).
  - Key settings (`intro_seen`, `shop_name`, `shop_phone`, `shop_telegram`) are set in IndexedDB via Dexie under the `settings` table.
* **Status:** **BUILT** (Highly functional and extremely lightweight).

---

### 2. Customer Management (Creation, Searching, Details)
* **Current UI Behavior:**
  - **Minimal Form Fields:** Add Customer (`CustomerForm.jsx`) requires only a single field—`Name` (e.g. "Tigist" or "Baby's mother"). Advanced details are grouped flat without hidden toggles.
  - **Ethiopian Phone Field:** Explicit country code block `+251` pre-rendered with strict subscriber validation (starts with 9 or 7, exactly 9 digits).
  - **Photo Capture (Optional):** Merchants can snap a direct product/customer photo using a rear camera stream compressed to sub-80KB in JPG. An automated 📷 badge prompts retroactive photo additions if empty.
  - **Detail Dashboard (`CustomerDetail.jsx`):** Displays "Owes Me" amounts, transaction frequency, average pay durations, overdue timelines, and a static reassurance line: *"🔒 Backed up securely. Amounts auto-hide for privacy."*
* **Status:** **BUILT / EXCELLENT** (Clean and mobile-friendly touch targets. Note that there is no visual trust score rendering inside `CustomerDetail.jsx`—the trust line is a static privacy guarantee).

---

### 3. Credit Additions & Payments
* **Current UI Behavior:**
  - **Hero Amounts:** Large typography inputs pre-formatted for Ethiopian Birr (`fmtInput`, `parseInput`) to prevent input syntax errors.
  - **Add Credit Flow:** Optional itemized due dates, description fields, catalog quick-chips, and a **Basket (Multi-Item Breakdown)** sub-sheet.
  - **Record Payment Flow:** Captures partial payments, maps payment methods (Cash 💵, Telebirr/E-Wallets 📱, CBE/Bank 🏦), and automatically triggers FIFO payment-to-credit ledger matching (`fifoAllocatePayment`).
  - **Overpayment Validation:** The system enforces strict balance validations. Overpaying a customer's total outstanding balance triggers a block.
  - **Mark Fully Paid:** One-click automated payout calculation button inside the customer's balance block.
* **Status:** **BUILT / ROBUST** (Backed by offline IndexedDB synchronicity and Vitest suite validation).

---

### 4. Overdue Tracking, Promises, and Chasing Alerts
* **Current UI Behavior:**
  - **Overdue Flags:** Red status pills (`customer.overdue_days`) displayed directly on the card header and main customer list.
  - **Promises-to-Pay:** Ability to log promised pay dates with descriptive notes. Highlights "Missed Promises" in red warning styles.
  - **Telegram Connect Flow (`CustomerTelegramConnectSheet.jsx`):** Features automated link token generation, expandable in-person QR codes, clipboard copy, and real-time polling updates.
* **Status:** **PARTIALLY BUILT**
  - *Note on Infrastructure Limitations:* Automatic Telegram QR link polling requires a webhook/session receiver. There is an unconfirmed hypothesis that stateless Vercel environments without durable session databases soft-gate QR bot sessions to manual Telegram fallback entries; this remains to be verified in the `api-server` repository code.

---

### 5. Staff Ledger and Report Summaries
* **Current UI Behavior:**
  - **Staff Section (`StaffSection.jsx`):** Tracks sales volumes, logs transaction credits per staff member (`staff.records` and `staff.sold`), and balances drawer assets without gamified competitive rankings.
  - **Credit Summary Report (`CreditSection.jsx`):** Interactive "Who owes you?" chapter containing total overdue headcounts, cumulative sums, and quick triggers for "Bulk Remind".
  - **Sales Report (`SalesSection.jsx`):** Provides operational insights (Top Items, Average sales size, and Payment channel splits).
* **Status:** **BUILT** (Highly useful, exports cleanly to CSV and PDF formats).

---

## 📊 Summary of Credit Flow Features

| Page Element / Flow Stage | Status | Notes / Limitations |
| :--- | :--- | :--- |
| **Onboarding Form** | **Built** | Fully client-side; offline-first. |
| **Customer Creation** | **Built** | Compact and doesn't require complex billing files. |
| **Dube (Credit) Entries** | **Built** | Supports line-item breakdown + photo proof attachment. |
| **Payment Ledger & FIFO** | **Built** | Distributes payments across credit records chronologically. |
| **"Mark Fully Paid" Trigger**| **Built** | Single-tap pre-fill on balance block. |
| **Ethiopian Calendar integration**| **Built** | Formats dates correctly via local Ethiopian calendars. |
| **Overdue Flags & Badges** | **Built** | Highlights overdue debt in bright red status elements. |
| **Promise to Pay Tracking** | **Built** | Logs promise dates and displays missed dates in amber alerts. |
| **CSV / PDF Export Actions** | **Built** | Generates lightweight files on-device instantly. |
| **Staff Attribution & Drawer** | **Built** | Aggregates logs per worker without tracking competitive rank. |
| **Tabular Numbers (Alignment)** | **Built** | dec-alignment already styled on `CustomerList.jsx` balances. |
| **Telegram Bot Link (QR Code)** | **Partial** | Polling & manual fallback connected; stateless limitations unconfirmed. |
| **Reminders (SMS & WhatsApp)** | **Partial** | Fully manual triggers; unverified if background automation is planned. |

---

## 🎨 Part 2: UI/UX Critique & Refinement Ideas

While the current Gebya application is incredibly responsive, fast, and optimized for mobile devices, a close visual critique reveals opportunities for visual polish and copy alignment.

### 🔍 Critique Area 1: Usability & Form Factor
* **The Long-Form Scroll on Small Devices (320px viewport):**
  - *Current Problem:* Adding a credit transaction with a line-item basket, photo captures, custom due-dates, and quick catalog chips stretches the viewport vertically. On popular low-end Android models in Ethiopia (e.g. Infinix, Tecno), merchants have to scroll extensively with one hand while holding items.
  - *Concrete Solution:* Implement sticky secondary tabs for "Quick Chips" vs. "Basket Editor", minimizing vertical grid overlap.
* **Visual Discoverability of Interactive Elements:**
  - *Current Problem:* Adding photos retroactively inside the customer detail view is represented by a small dotted circle around the initials avatar. It lacks a strong call to action, and many merchants do not realize it is clickable.
  - *Concrete Solution:* Put a small text link saying "Add customer photo" directly under the customer's phone number.

### 🎨 Critique Area 2: Spacing & Color Palette Consistency
* **Warning States Wording:**
  - *Current Problem:* Standard validation messages on overpayments can feel slightly technical ("Amount cannot exceed what is owed").
  - *Concrete Solution:* Keep the hard block on overpayments but make the user-facing text softer: *"Cannot receive extra payment over outstanding balance. Enter up to {amount} Birr."*
* **Visual Hierarchy of Overdue Alerts:**
  - *Current Problem:* High-priority overdue accounts use the same color family (standard red/amber accents) as normal credit entries. This dilutes the urgency of accounts that are significantly overdue (e.g., 60+ days).
  - *Concrete Solution:* Apply an extra dark-red warning border and an icon badge (⚠️) to customers whose trust score has dropped or who are more than 30 days overdue.

### 📝 Critique Area 3: Typography & Language Gaps
* **Missing Amharic Translations (Gaps):**
  - *Current Problem:* While the main buttons are localized, newer elements such as "Basket Item Breakdown", "Overdue Customer Flags", and the "Overpayment Warning" still have English fallbacks when the language toggle is set to Amharic (`አማ`).
  - *Concrete Solution:* Audit and translate all newer error states, dialog buttons, and overdue subtitles into Amharic in `LangContext.jsx`.

### 📱 Critique Area 4: Touch Targets & Daily Operation
* **Touch Targets (Mobile Fitts's Law):**
  - *Current Problem:* The `CSV` and `PDF` export buttons on the top right of the Credit Tab are compact and have a height of less than 32px. Shopkeepers with larger thumbs will accidentally miss-tap.
  - *Concrete Solution:* Increase touch target paddings for the PDF/CSV buttons to a minimum of 44px by 44px to meet mobile accessibility standards.

---

## 🚀 Concrete Recommendations Checklist for Your Team

To make this product feel like a world-class, premium app ready for thousands of shopkeepers, prioritize these low-effort, high-impact refinements:

1. **[ ] Mobile Touch Targets:** Enlarge the CSV and PDF export trigger pads to `44px` height with broader spacing.
2. **[ ] Translation Audit:** Populate the Amharic translation keys in `LangContext.jsx` for all overdue status labels and warning sheets.
3. **[ ] Soften Validation Copy:** Refine validation notices like "Amount cannot exceed what is owed" to friendly, local language styling.
4. **[ ] Visual Clues for Photos:** Change the dotted circle around customer initials to a clear "Add photo" label so merchants find it easily.
