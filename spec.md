# Retail Credit Tracker with Optional Telegram Alerts

## Product Context
This is one module inside the GBA platform. It is not the whole platform.

The module is for small retailers who give goods on credit and record repayments. Many users may be elders, low-literacy users, or people who fear complex technology. The UI must feel like a simple digital notebook, not accounting software.

## Real User Behavior
Retailers do not always know formal customer details. They identify customers using any recognizable label, such as:
- real name
- nickname
- relation like "baby's mother"
- appearance note
- house/location clue
- car type or plate number

When a customer takes goods on credit, the retailer records:
- customer identifier
- amount (mandatory)
- optional item note or item list
- optional promised repayment date

Later, if the customer takes more goods, the retailer adds more credit to the same customer.
If the customer pays partially, the retailer records a payment and the system reduces the balance.

The goal is to track:
- who the person is
- how much they owe now
- what they took before
- what they have already paid

## Core MVP Workflow
1. Add customer with only one required field:
   - customer name or identifier (free text)

2. Optional extra fields hidden under "More":
   - note
   - phone
   - Telegram username or Telegram link if available

3. Record transaction with only two primary actions:
   - Add Credit
   - Record Payment

4. For Add Credit:
   - amount required
   - item note optional
   - due date optional

5. For Record Payment:
   - amount required
   - note optional

6. Customer detail page must show:
   - customer identifier
   - notes
   - current balance
   - transaction history in time order

7. Balance must be auto-calculated from transactions, not manually edited.

8. After saving a transaction, show optional action:
   - "Notify customer on Telegram?"

9. If Telegram is connected, send a simple Telegram message with:
   - transaction type
   - amount
   - current balance

10. If Telegram is not connected, save transaction normally and do not block the user.

## Customer Telegram Flow
We are focusing on Telegram first, not WhatsApp.

The Telegram flow must be optional and lightweight.

Preferred connection methods:
1. QR code to open Telegram bot
2. share bot link
3. manual Telegram username entry as fallback

Once linked, customer can receive:
- new credit alerts
- payment confirmation alerts

Do not build complex reminder logic yet unless already easy to support cleanly.
If reminder support is added, keep it disabled by default.

## UX Principles
- must be mobile-first
- must be extremely fast to use
- must avoid accounting jargon
- must avoid tax-like language
- must feel private and safe
- must work for low-confidence users
- must not force phone number or Telegram
- must not require itemized entry every time
- total amount entry must always be supported

## Important Design Rules
- required fields should be minimal
- advanced fields should be progressively disclosed
- Telegram is optional, never mandatory
- do not overbuild dashboards
- do not build full inventory or full POS in this task
- do not build tax/reporting complexity
- do not create a heavy onboarding flow

## Suggested Data Model

### Customer
- id
- display_name
- note
- phone_number nullable
- telegram_username nullable
- telegram_chat_id nullable
- created_at
- updated_at

### Transaction
- id
- customer_id
- type enum: credit_add, payment
- amount
- item_note nullable
- due_date nullable
- created_at
- updated_at

## System Behavior
- current balance = sum(credit_add) - sum(payment)
- transaction history must remain visible
- no destructive overwrite of financial history
- support search by display_name and note

## Screens To Build or Improve
1. Customer list
2. Add customer form
3. Customer detail
4. Add credit modal/form
5. Record payment modal/form
6. Optional Telegram connect flow
7. Telegram message templates

## Acceptance Criteria
- retailer can create a customer in under 10 seconds
- retailer can record credit in under 10 seconds
- retailer can record payment in under 10 seconds
- customer balance updates correctly after every transaction
- transaction history is preserved
- Telegram notification is optional and non-blocking
- if Telegram is linked, message sends after save
- if Telegram is not linked, transaction still saves successfully
- UI remains simple and understandable
