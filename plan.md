# Implementation Plan

## Goal
Implement a simple, trustworthy digital notebook for retailer credit tracking with optional Telegram-based customer visibility.

## Scope
This task covers only:
- customer records with flexible identifiers
- credit and payment transaction ledger
- auto-calculated balance
- customer detail screen
- optional Telegram connection and post-transaction alerting

This task does not cover:
- full inventory
- POS
- tax reporting
- advanced analytics
- complex reminder automation
- WhatsApp integration

## Milestones

### Milestone 1: Codebase Review
- inspect current models, routes, screens, services, and messaging flows
- identify reusable components and affected files
- identify risks and assumptions
- propose smallest safe implementation

### Milestone 2: Data Model Updates
- add or update Customer fields
- add or update Transaction ledger model
- ensure balance can be computed from transactions
- preserve existing data if applicable

### Milestone 3: Customer Flows
- improve customer list
- improve add customer form
- allow minimal required input
- add optional "More" section

### Milestone 4: Transaction Flows
- implement Add Credit
- implement Record Payment
- update customer detail page with balance and history
- ensure fast mobile-first flow

### Milestone 5: Telegram Connection
- add optional Telegram connect UI
- support QR-based connect flow
- support share-link flow
- support manual Telegram username fallback

### Milestone 6: Telegram Notifications
- send simple transaction alert after save if linked
- keep transaction save non-blocking if message fails
- add basic logging/error handling

### Milestone 7: Validation and Cleanup
- run lint/typecheck/tests/build if available
- verify acceptance criteria
- summarize changes, risks, and follow-ups

## QR Code Note
Use a standard library to generate QR codes.
Do not build a custom QR engine.

Recommended libraries:
- react-qr-code
- qrcode
- qrcode.js

The QR should encode a Telegram bot deep link such as:
t.me/YourBot?start=...

If a customer-specific token or identifier is needed, append it safely to the start parameter.

## Definition of Done
- core customer and transaction flows work
- balance calculation is correct
- Telegram is optional
- Telegram failures do not block transaction saving
- UI stays simple and low-friction
