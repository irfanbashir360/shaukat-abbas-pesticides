# Credit Sales & Debtors Design

**Date:** 2026-05-05

## Summary

When a sale is made on credit, track money owed by customers in a Debtors module that mirrors the existing Creditors module. Sales can be cash or credit; credit sales auto-create a Debtor record.

## Data Model

### Sale (modified)
Add 3 new columns to the `sales` table:
- `payment_type` — enum `cash` / `credit`, default `cash`
- `amount_paid_upfront` — Float, default 0.0 (PKR paid at time of sale)
- `due_date` — DateTime, nullable (required when payment_type = credit)

### Debtor (new model)
Table: `debtors`
- `id` — primary key
- `sale_id` — ForeignKey → sales.id (unique, one debtor per credit sale)
- `customer_id` — ForeignKey → customers.id
- `amount_owed` — Float (= sale.total_amount - sale.amount_paid_upfront)
- `due_date` — DateTime
- `status` — enum: `outstanding` / `partially_paid` / `settled`, default `outstanding`
- Relationships: `customer`, `sale`, `payments`

### DebtorPayment (new model)
Table: `debtor_payments`
- `id` — primary key
- `debtor_id` — ForeignKey → debtors.id
- `date` — DateTime
- `amount_paid` — Float
- `notes` — Text

## Backend API

### Sales (modified)
- `POST /sales` — accepts `payment_type`, `amount_paid_upfront`, `due_date`; if credit, auto-creates Debtor record
- `PUT /sales/{id}` — same fields accepted; updates Debtor if exists

### Debtors (new router)
- `GET /debtors` — list all non-settled debtors with: customer name, amount_owed, total_paid, remaining, due_date, status
- `POST /debtors/{debtor_id}/payments` — record payment; auto-marks settled when total_paid >= amount_owed

## Frontend

### Sale Form (New + Edit)
- Payment type toggle: Cash / Credit
- When Credit selected, show:
  - Amount Paid Upfront (PKR, default 0)
  - Due Date (date picker, required)

### Sales List
- Credit sales show a "Credit" badge
- Remaining balance shown next to badge

### Debtors Page (new)
- Route: `/debtors`
- Sidebar link added
- Table columns: Customer, Total Owed, Paid, Remaining, Due Date, Status, Actions
- Overdue rows highlighted (due date passed, not settled)
- "Record Payment" button → modal with: amount, date, notes
- Settled debtors hidden from list

## Out of Scope
- No changes to Creditors module
- No customer ledger or statement view
- No debtor editing (payments only)
- Voiding a credit sale does not auto-settle the debtor (handle manually)
