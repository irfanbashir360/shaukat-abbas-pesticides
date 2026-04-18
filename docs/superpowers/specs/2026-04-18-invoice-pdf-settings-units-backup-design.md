# Invoice PDF, Settings Expansion, Custom Units & Backup — Design Spec

**Date:** 2026-04-18  
**Status:** Approved

---

## Goal

Replace the plain PDF invoice with a professional modern document. Expand Settings to manage business identity (logo, company info, invoice branding), custom product units, and database backup/restore. Product unit field becomes a dropdown driven by the Units API.

---

## Color Scheme

Deep forest green theme applied across the app:
- Sidebar: `#0a1f14`
- Accent / buttons: `#16a34a`
- Active nav highlight: `rgba(34,197,94,0.12)` + `#22c55e` left border
- Background: `#f0fdf4`
- Card border: `#d1fae5`
- Text: `#052e16`, muted: `#4b7a5e`

---

## Architecture

### Backend — New Models

**`BusinessSettings`** (single row, get-or-create):
```
id, business_name, tagline, address, phone, email, ntn, strn,
bank_name, bank_account, bank_iban, footer_note,
logo_filename (string, nullable)
```

**`Unit`** (lookup table):
```
id, name (unique, e.g. "kg", "litre", "bag")
```
Seeded on first run with: `kg`, `gram`, `litre`, `ml`, `bag`, `bottle`, `dozen`, `piece`, `ton`, `box`

### Backend — New/Extended Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/settings` | Returns business settings + alert days (merged) |
| `PUT` | `/api/settings` | Updates business settings + alert days |
| `POST` | `/api/settings/logo` | Multipart upload, saves to `data/logo.png` |
| `GET` | `/api/settings/logo` | Serves logo file (404 if none) |
| `GET` | `/api/units` | List all units |
| `POST` | `/api/units` | Create unit (`{name}`) |
| `DELETE` | `/api/units/{id}` | Delete unit (blocked if any product uses it) |
| `GET` | `/api/backup/export` | Streams `sap-backup-YYYY-MM-DD.zip` |
| `POST` | `/api/backup/import` | Accepts zip, validates, replaces DB + logo |

### Backend — PDF Generator

Rewritten `pdf_generator.py`. Pulls `BusinessSettings` from DB and logo from `data/logo.png`.

**Layout (Modern Band — Option B):**
```
┌─────────────────────────────────────────────────┐
│  [LOGO]   Business Name          Address         │  ← dark green header band
│           Tagline                Phone / NTN     │
├──────────────────────────┬──────────────────────┤
│  Bill To                 │  Invoice Details      │  ← two-column info block
│  Customer name           │  Invoice #            │
│  Phone / Address         │  Issued / Due / Valid │
├──────────────────────────┴──────────────────────┤
│  # │ Product │ Category │ Qty │ Unit Price │ Total│  ← line items table
│    │         │          │     │            │      │     green header row
├─────────────────────────────────────────────────┤
│                              Grand Total: PKR X  │  ← total box, right-aligned
├─────────────────────────────────────────────────┤
│  Bank: Name | Account | IBAN      Footer note    │  ← footer band
└─────────────────────────────────────────────────┘
```

Uses WeasyPrint (already installed). Fonts: Arial/sans-serif. Colors match app green theme.

---

## Frontend — Settings Page (4 Tabs)

### Tab 1 — Business Info
Fields: Business Name, Tagline, Address, Phone, Email, NTN, STRN, Bank Name, Account Number, IBAN, Footer Note (textarea)  
Logo: file input with preview thumbnail, "Remove Logo" button if one exists  
Save button calls `PUT /api/settings`  
Logo upload is a separate action on file select (calls `POST /api/settings/logo` immediately)

### Tab 2 — Invoice Alerts
Existing: payment due alert days, validity expiry alert days (unchanged logic, moved here)

### Tab 3 — Units
List of all units as pills/chips with a delete (×) button on each  
"Add Unit" input + button at top  
If a unit is in use by any product, delete is blocked with a toast error from backend  
Default units seeded automatically on first startup

### Tab 4 — Backup
**Export:** "Download Backup" button → calls `GET /api/backup/export` → browser downloads zip  
**Restore:** File input (accepts `.zip` only), "Restore Backup" button  
On restore click: show confirm dialog "This will replace ALL current data and cannot be undone. Are you sure?"  
On confirm: `POST /api/backup/import`, success → toast "Backup restored. Please refresh the page." + show a "Refresh Now" button

---

## Frontend — Products Page

Unit field changes from `<input type="text">` to `<select>` populated from `GET /api/units`.  
Units loaded alongside products on page mount.  
If no units exist yet, dropdown shows "No units — add in Settings".

---

## Frontend — API Client additions

```js
// Settings
export const getBusinessSettings = () => api.get('/settings').then(r => r.data)
export const updateBusinessSettings = (data) => api.put('/settings', data).then(r => r.data)
export const uploadLogo = (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/settings/logo', fd).then(r => r.data) }
export const getLogoUrl = () => `/api/settings/logo`

// Units
export const getUnits = () => api.get('/units').then(r => r.data)
export const createUnit = (name) => api.post('/units', { name }).then(r => r.data)
export const deleteUnit = (id) => api.delete(`/units/${id}`)

// Backup
export const exportBackup = () => window.location.href = '/api/backup/export'
export const importBackup = (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/backup/import', fd).then(r => r.data) }
```

---

## Data Flow — Backup Export

1. Frontend calls `GET /api/backup/export`
2. Backend creates in-memory zip: adds `data/inventory.db` + `data/logo.png` (if exists)
3. Returns as `application/zip` with `Content-Disposition: attachment; filename=sap-backup-YYYY-MM-DD.zip`

## Data Flow — Backup Import

1. Frontend shows confirm dialog
2. On confirm: `POST /api/backup/import` with zip file
3. Backend validates zip contains `inventory.db`
4. Closes current DB connection, replaces `data/inventory.db`, replaces `data/logo.png` if present
5. Reconnects DB engine
6. Returns `{success: true}`
7. Frontend shows "Restored — please refresh" + Refresh button

---

## Error Handling

- Logo upload > 5MB: rejected by backend with 400
- Unit delete when in use: backend returns 400 "Unit is in use by N product(s)"
- Backup import with invalid zip or missing `inventory.db`: 400 "Invalid backup file"
- PDF generation when no settings exist: uses safe defaults ("Your Business Name", no logo)

---

## What Does NOT Change

- Invoice creation flow (sale → invoice modal → dates)
- Creditors, Purchases, Sales logic
- Auth (none — local app)
- Existing `InvoiceAlertSettings` table (merged into new settings response, both updated by same PUT endpoint)
