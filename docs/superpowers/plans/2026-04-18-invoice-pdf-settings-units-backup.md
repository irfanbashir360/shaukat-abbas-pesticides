# Invoice PDF, Settings, Units & Backup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a professional PDF invoice, expanded Settings page (business info + logo + units + backup), and unit dropdown on the Products page.

**Architecture:** New `BusinessSettings` and `Unit` DB models extend the existing SQLAlchemy stack. Three new FastAPI routers (`units`, `backup`, extended `settings`) are added to `main.py`. The PDF generator is fully rewritten using WeasyPrint with a modern green band layout. The React Settings page gets four tabs; Products unit field becomes a dropdown.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, WeasyPrint, React 18, Vite, Axios

---

## File Map

| File | Change |
|------|--------|
| `backend/models.py` | Add `BusinessSettings`, `Unit` models |
| `backend/schemas.py` | Add `CombinedSettingsOut`, `CombinedSettingsUpdate`, `UnitOut`, `UnitCreate` |
| `backend/database.py` | Add `get_data_dir()` helper |
| `backend/routers/settings.py` | Rewrite — merge business settings + alert days + logo endpoints |
| `backend/routers/units.py` | Create — CRUD for units |
| `backend/routers/backup.py` | Create — export zip, import zip |
| `backend/pdf_generator.py` | Rewrite — modern band layout, pulls from DB |
| `backend/main.py` | Register new routers, add startup seed for units |
| `frontend/src/api/client.js` | Add 8 new API functions |
| `frontend/src/pages/Settings.jsx` | Rewrite — 4 tabs |
| `frontend/src/pages/Products.jsx` | Unit field → dropdown from Units API |

---

## Task 1: Backend — Add `get_data_dir()` to `database.py` and new models

**Files:**
- Modify: `backend/database.py`
- Modify: `backend/models.py`

- [ ] **Step 1: Add `get_data_dir()` to `database.py`**

Open `backend/database.py` and add after the `get_db_path()` function:

```python
def get_data_dir() -> str:
    if hasattr(sys, '_MEIPASS'):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    data_dir = os.path.join(base_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)
    return data_dir
```

- [ ] **Step 2: Add `BusinessSettings` and `Unit` models to `backend/models.py`**

Append at the bottom of `backend/models.py` (after the existing `InvoiceAlertSettings` class):

```python
class BusinessSettings(Base):
    __tablename__ = "business_settings"
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, default="Your Business Name")
    tagline = Column(String, default="")
    address = Column(String, default="")
    phone = Column(String, default="")
    email = Column(String, default="")
    ntn = Column(String, default="")
    strn = Column(String, default="")
    bank_name = Column(String, default="")
    bank_account = Column(String, default="")
    bank_iban = Column(String, default="")
    footer_note = Column(String, default="Thank you for your business!")
    logo_filename = Column(String, nullable=True)

class Unit(Base):
    __tablename__ = "units"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
```

- [ ] **Step 3: Verify tables are created**

```bash
cd backend && source venv/bin/activate
python -c "from database import engine; import models; models.Base.metadata.create_all(bind=engine); print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/database.py backend/models.py
git commit -m "feat: add BusinessSettings and Unit models, get_data_dir helper"
```

---

## Task 2: Backend — Add new schemas

**Files:**
- Modify: `backend/schemas.py`

- [ ] **Step 1: Add schemas to `backend/schemas.py`**

Append at the bottom of `backend/schemas.py`:

```python
# --- Business Settings ---
class BusinessSettingsFields(BaseModel):
    business_name: str = "Your Business Name"
    tagline: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    ntn: str = ""
    strn: str = ""
    bank_name: str = ""
    bank_account: str = ""
    bank_iban: str = ""
    footer_note: str = "Thank you for your business!"

class CombinedSettingsUpdate(BusinessSettingsFields):
    payment_due_alert_days: int = 3
    validity_expiry_alert_days: int = 7

class CombinedSettingsOut(BusinessSettingsFields):
    id: int
    logo_filename: Optional[str] = None
    payment_due_alert_days: int
    validity_expiry_alert_days: int
    model_config = {"from_attributes": True}

# --- Units ---
class UnitCreate(BaseModel):
    name: str

class UnitOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Verify no import errors**

```bash
cd backend && source venv/bin/activate
python -c "import schemas; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas.py
git commit -m "feat: add CombinedSettings and Unit schemas"
```

---

## Task 3: Backend — Rewrite settings router

**Files:**
- Modify: `backend/routers/settings.py`

The new settings router merges `BusinessSettings` + `InvoiceAlertSettings` into one GET/PUT, and adds logo upload/serve.

- [ ] **Step 1: Rewrite `backend/routers/settings.py` completely**

```python
# backend/routers/settings.py
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db, get_data_dir
import models, schemas

router = APIRouter()

MAX_LOGO_BYTES = 5 * 1024 * 1024  # 5 MB

def _get_biz(db: Session) -> models.BusinessSettings:
    s = db.query(models.BusinessSettings).first()
    if not s:
        s = models.BusinessSettings()
        db.add(s); db.commit(); db.refresh(s)
    return s

def _get_alerts(db: Session) -> models.InvoiceAlertSettings:
    s = db.query(models.InvoiceAlertSettings).first()
    if not s:
        s = models.InvoiceAlertSettings()
        db.add(s); db.commit(); db.refresh(s)
    return s

def _combined_out(biz: models.BusinessSettings, alerts: models.InvoiceAlertSettings) -> dict:
    return {
        "id": biz.id,
        "business_name": biz.business_name,
        "tagline": biz.tagline,
        "address": biz.address,
        "phone": biz.phone,
        "email": biz.email,
        "ntn": biz.ntn,
        "strn": biz.strn,
        "bank_name": biz.bank_name,
        "bank_account": biz.bank_account,
        "bank_iban": biz.bank_iban,
        "footer_note": biz.footer_note,
        "logo_filename": biz.logo_filename,
        "payment_due_alert_days": alerts.payment_due_alert_days,
        "validity_expiry_alert_days": alerts.validity_expiry_alert_days,
    }

@router.get("", response_model=schemas.CombinedSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _combined_out(_get_biz(db), _get_alerts(db))

@router.put("", response_model=schemas.CombinedSettingsOut)
def update_settings(payload: schemas.CombinedSettingsUpdate, db: Session = Depends(get_db)):
    biz = _get_biz(db)
    alerts = _get_alerts(db)
    for field in ["business_name", "tagline", "address", "phone", "email",
                  "ntn", "strn", "bank_name", "bank_account", "bank_iban", "footer_note"]:
        setattr(biz, field, getattr(payload, field))
    alerts.payment_due_alert_days = payload.payment_due_alert_days
    alerts.validity_expiry_alert_days = payload.validity_expiry_alert_days
    db.commit(); db.refresh(biz); db.refresh(alerts)
    return _combined_out(biz, alerts)

@router.post("/logo")
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(400, "Logo file must be under 5MB")
    logo_path = os.path.join(get_data_dir(), "logo.png")
    with open(logo_path, "wb") as f:
        f.write(data)
    biz = _get_biz(db)
    biz.logo_filename = "logo.png"
    db.commit()
    return {"ok": True}

@router.delete("/logo")
def delete_logo(db: Session = Depends(get_db)):
    logo_path = os.path.join(get_data_dir(), "logo.png")
    if os.path.exists(logo_path):
        os.remove(logo_path)
    biz = _get_biz(db)
    biz.logo_filename = None
    db.commit()
    return {"ok": True}

@router.get("/logo")
def get_logo():
    logo_path = os.path.join(get_data_dir(), "logo.png")
    if not os.path.exists(logo_path):
        raise HTTPException(404, "No logo uploaded")
    return FileResponse(logo_path, media_type="image/png")
```

- [ ] **Step 2: Verify it loads**

```bash
cd backend && source venv/bin/activate
python -c "from routers import settings; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/routers/settings.py
git commit -m "feat: rewrite settings router with business info and logo endpoints"
```

---

## Task 4: Backend — Units router

**Files:**
- Create: `backend/routers/units.py`

- [ ] **Step 1: Create `backend/routers/units.py`**

```python
# backend/routers/units.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

DEFAULT_UNITS = ["kg", "gram", "litre", "ml", "bag", "bottle", "dozen", "piece", "ton", "box"]

def seed_units(db: Session):
    existing = {u.name for u in db.query(models.Unit).all()}
    for name in DEFAULT_UNITS:
        if name not in existing:
            db.add(models.Unit(name=name))
    db.commit()

@router.get("", response_model=List[schemas.UnitOut])
def list_units(db: Session = Depends(get_db)):
    return db.query(models.Unit).order_by(models.Unit.name).all()

@router.post("", response_model=schemas.UnitOut, status_code=201)
def create_unit(payload: schemas.UnitCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Unit name cannot be empty")
    existing = db.query(models.Unit).filter(models.Unit.name == name).first()
    if existing:
        raise HTTPException(400, f"Unit '{name}' already exists")
    u = models.Unit(name=name)
    db.add(u); db.commit(); db.refresh(u)
    return u

@router.delete("/{unit_id}", status_code=204)
def delete_unit(unit_id: int, db: Session = Depends(get_db)):
    u = db.query(models.Unit).filter(models.Unit.id == unit_id).first()
    if not u:
        raise HTTPException(404, "Unit not found")
    count = db.query(models.Product).filter(models.Product.unit == u.name).count()
    if count > 0:
        raise HTTPException(400, f"Unit '{u.name}' is in use by {count} product(s)")
    db.delete(u); db.commit()
```

- [ ] **Step 2: Verify**

```bash
cd backend && source venv/bin/activate
python -c "from routers import units; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/routers/units.py
git commit -m "feat: add units router with CRUD and default seeding"
```

---

## Task 5: Backend — Backup router

**Files:**
- Create: `backend/routers/backup.py`

- [ ] **Step 1: Create `backend/routers/backup.py`**

```python
# backend/routers/backup.py
import os
import io
import zipfile
import shutil
from datetime import date
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from database import get_data_dir, engine

router = APIRouter()

@router.get("/export")
def export_backup():
    data_dir = get_data_dir()
    db_path = os.path.join(data_dir, "inventory.db")
    logo_path = os.path.join(data_dir, "logo.png")

    if not os.path.exists(db_path):
        raise HTTPException(404, "No database found to backup")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(db_path, "inventory.db")
        if os.path.exists(logo_path):
            zf.write(logo_path, "logo.png")
    buf.seek(0)

    filename = f"sap-backup-{date.today().isoformat()}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/import")
async def import_backup(file: UploadFile = File(...)):
    data = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise HTTPException(400, "Invalid backup file — not a valid zip")

    names = zf.namelist()
    if "inventory.db" not in names:
        raise HTTPException(400, "Invalid backup file — missing inventory.db")

    data_dir = get_data_dir()
    db_path = os.path.join(data_dir, "inventory.db")
    logo_path = os.path.join(data_dir, "logo.png")

    # Close all DB connections before replacing the file
    engine.dispose()

    # Write new DB
    with open(db_path, "wb") as f:
        f.write(zf.read("inventory.db"))

    # Write logo if present
    if "logo.png" in names:
        with open(logo_path, "wb") as f:
            f.write(zf.read("logo.png"))

    return {"ok": True, "message": "Backup restored successfully"}
```

- [ ] **Step 2: Verify**

```bash
cd backend && source venv/bin/activate
python -c "from routers import backup; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/routers/backup.py
git commit -m "feat: add backup export/import router"
```

---

## Task 6: Backend — Wire new routers in `main.py` and seed units on startup

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Update `backend/main.py`**

Replace the entire file with:

```python
# backend/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, SessionLocal
import models
from routers import (products, suppliers, customers, purchases,
                     sales, invoices, creditors, dashboard, reports, settings)
from routers.units import router as units_router, seed_units
from routers.backup import router as backup_router

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default units on startup
    db = SessionLocal()
    try:
        seed_units(db)
    finally:
        db.close()
    yield

app = FastAPI(title="Shaukat Abbas Pesticides Inventory", lifespan=lifespan)

app.include_router(products.router,   prefix="/api/products",   tags=["products"])
app.include_router(suppliers.router,  prefix="/api/suppliers",  tags=["suppliers"])
app.include_router(customers.router,  prefix="/api/customers",  tags=["customers"])
app.include_router(purchases.router,  prefix="/api/purchases",  tags=["purchases"])
app.include_router(sales.router,      prefix="/api/sales",      tags=["sales"])
app.include_router(invoices.router,   prefix="/api/invoices",   tags=["invoices"])
app.include_router(creditors.router,  prefix="/api/creditors",  tags=["creditors"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["dashboard"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["reports"])
app.include_router(settings.router,   prefix="/api/settings",   tags=["settings"])
app.include_router(units_router,      prefix="/api/units",      tags=["units"])
app.include_router(backup_router,     prefix="/api/backup",     tags=["backup"])

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
```

- [ ] **Step 2: Restart the backend and verify all endpoints load**

```bash
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000 &
sleep 3
curl -s http://localhost:8000/api/units | python3 -m json.tool
```
Expected: JSON array with 10 units (kg, gram, litre, ml, bag, bottle, dozen, piece, ton, box)

```bash
curl -s http://localhost:8000/api/settings | python3 -m json.tool
```
Expected: JSON with `business_name`, `tagline`, `payment_due_alert_days`, etc.

- [ ] **Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: wire units and backup routers, seed default units on startup"
```

---

## Task 7: Backend — Rewrite PDF generator

**Files:**
- Modify: `backend/pdf_generator.py`

The PDF pulls `BusinessSettings` from DB, encodes logo as base64, and renders a modern green band layout via WeasyPrint.

- [ ] **Step 1: Rewrite `backend/pdf_generator.py` completely**

```python
# backend/pdf_generator.py
import os
import base64
from database import SessionLocal, get_data_dir
import models

def _get_logo_b64() -> str:
    logo_path = os.path.join(get_data_dir(), "logo.png")
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return ""

def _get_biz() -> models.BusinessSettings:
    db = SessionLocal()
    try:
        biz = db.query(models.BusinessSettings).first()
        if not biz:
            biz = models.BusinessSettings()
        return biz
    finally:
        db.close()

def generate_invoice_pdf(invoice) -> bytes:
    from weasyprint import HTML
    sale = invoice.sale
    customer = sale.customer
    biz = _get_biz()
    logo_b64 = _get_logo_b64()

    logo_html = (
        f'<img src="data:image/png;base64,{logo_b64}" '
        f'style="height:56px;max-width:160px;object-fit:contain;" />'
        if logo_b64 else
        f'<div style="font-size:22px;font-weight:900;color:#22c55e;letter-spacing:-0.02em;">'
        f'{biz.business_name}</div>'
    )

    rows = "".join(f"""
        <tr>
          <td>{i+1}</td>
          <td>{item.product.name}</td>
          <td style="color:#4b7a5e">{item.product.category.value.title()}</td>
          <td>{item.quantity} {item.product.unit}</td>
          <td style="text-align:right">PKR {item.unit_price:,.2f}</td>
          <td style="text-align:right;font-weight:600">PKR {item.quantity * item.unit_price:,.2f}</td>
        </tr>""" for i, item in enumerate(sale.items))

    bank_line = " &nbsp;|&nbsp; ".join(filter(None, [
        biz.bank_name,
        f"Acc: {biz.bank_account}" if biz.bank_account else "",
        f"IBAN: {biz.bank_iban}" if biz.bank_iban else "",
    ]))

    ntn_line = " &nbsp;|&nbsp; ".join(filter(None, [
        f"NTN: {biz.ntn}" if biz.ntn else "",
        f"STRN: {biz.strn}" if biz.strn else "",
    ]))

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #052e16; background: #fff; }}

  /* ── Header band ── */
  .header {{
    background: #0a1f14;
    color: #fff;
    padding: 28px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
  .header-left {{ display: flex; align-items: center; gap: 18px; }}
  .biz-name {{ font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }}
  .biz-tagline {{ font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; letter-spacing: 0.06em; text-transform: uppercase; }}
  .header-right {{ text-align: right; font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.7; }}
  .header-right strong {{ color: #fff; }}

  /* ── Invoice title strip ── */
  .title-strip {{
    background: #16a34a;
    padding: 10px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
  .title-strip h1 {{ font-size: 15px; font-weight: 700; color: #fff; letter-spacing: 0.04em; text-transform: uppercase; }}
  .title-strip .inv-num {{ font-size: 15px; font-weight: 800; color: #fff; }}

  /* ── Info block ── */
  .info-block {{
    display: flex;
    padding: 24px 36px;
    gap: 0;
    border-bottom: 1.5px solid #d1fae5;
  }}
  .info-col {{ flex: 1; }}
  .info-col + .info-col {{ border-left: 1.5px solid #d1fae5; padding-left: 28px; }}
  .info-label {{ font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4b7a5e; margin-bottom: 6px; }}
  .info-value {{ font-size: 13px; color: #052e16; line-height: 1.6; }}
  .info-value strong {{ font-size: 15px; font-weight: 700; }}

  /* ── Table ── */
  .items-wrap {{ padding: 0 36px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
  thead th {{
    background: #052e16;
    color: #fff;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
  }}
  thead th:last-child, thead th:nth-last-child(2) {{ text-align: right; }}
  tbody td {{ padding: 11px 12px; border-bottom: 1px solid #d1fae5; font-size: 13px; vertical-align: middle; }}
  tbody tr:last-child td {{ border-bottom: none; }}
  tbody tr:nth-child(even) {{ background: #f0fdf4; }}

  /* ── Total box ── */
  .total-wrap {{ padding: 16px 36px; display: flex; justify-content: flex-end; border-top: 1.5px solid #d1fae5; }}
  .total-box {{
    background: #052e16;
    color: #fff;
    padding: 14px 24px;
    border-radius: 8px;
    text-align: right;
    min-width: 220px;
  }}
  .total-box .total-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); margin-bottom: 4px; }}
  .total-box .total-amount {{ font-size: 22px; font-weight: 800; color: #22c55e; }}

  /* ── Footer band ── */
  .footer {{
    background: #f0fdf4;
    border-top: 1.5px solid #d1fae5;
    padding: 16px 36px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .footer-bank {{ font-size: 11px; color: #4b7a5e; line-height: 1.7; }}
  .footer-note {{ font-size: 11px; color: #4b7a5e; font-style: italic; text-align: right; }}

  /* ── Status pill ── */
  .paid-pill {{
    display: inline-block;
    background: #16a34a;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 20px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    vertical-align: middle;
    margin-left: 8px;
  }}
</style>
</head><body>

<!-- Header band -->
<div class="header">
  <div class="header-left">
    {logo_html}
    <div>
      <div class="biz-name">{biz.business_name}</div>
      {f'<div class="biz-tagline">{biz.tagline}</div>' if biz.tagline else ''}
    </div>
  </div>
  <div class="header-right">
    {f'<div>{biz.address}</div>' if biz.address else ''}
    {f'<div>{biz.phone}</div>' if biz.phone else ''}
    {f'<div>{ntn_line}</div>' if ntn_line else ''}
  </div>
</div>

<!-- Title strip -->
<div class="title-strip">
  <h1>Tax Invoice {f'<span class="paid-pill">Paid</span>' if invoice.is_paid else ''}</h1>
  <div class="inv-num">{invoice.invoice_number}</div>
</div>

<!-- Info block: Bill To | Invoice Details -->
<div class="info-block">
  <div class="info-col">
    <div class="info-label">Bill To</div>
    <div class="info-value">
      <strong>{customer.name}</strong><br>
      {f'{customer.phone}<br>' if customer.phone else ''}
      {f'{customer.address}' if customer.address else ''}
    </div>
  </div>
  <div class="info-col">
    <div class="info-label">Invoice Details</div>
    <div class="info-value">
      <strong>{invoice.invoice_number}</strong><br>
      Issued: {invoice.issued_date.strftime('%d %b %Y')}<br>
      Payment Due: {invoice.payment_due_date.strftime('%d %b %Y')}<br>
      Valid Until: {invoice.validity_expiry_date.strftime('%d %b %Y')}
    </div>
  </div>
</div>

<!-- Line items -->
<div class="items-wrap">
  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Product</th>
        <th>Category</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
</div>

<!-- Total -->
<div class="total-wrap">
  <div class="total-box">
    <div class="total-label">Grand Total</div>
    <div class="total-amount">PKR {sale.total_amount:,.2f}</div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-bank">
    {f'<strong>Bank:</strong> {bank_line}' if bank_line else '&nbsp;'}
  </div>
  <div class="footer-note">{biz.footer_note}</div>
</div>

</body></html>"""

    return HTML(string=html).write_pdf()
```

- [ ] **Step 2: Test PDF generation manually**

```bash
cd backend && source venv/bin/activate
python -c "
from database import SessionLocal, engine
import models
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Check invoice exists
inv = db.query(models.Invoice).first()
if inv:
    from pdf_generator import generate_invoice_pdf
    pdf = generate_invoice_pdf(inv)
    open('/tmp/test_invoice.pdf', 'wb').write(pdf)
    print(f'PDF written: {len(pdf)} bytes')
else:
    print('No invoices yet — create one via the app first')
db.close()
"
```
Expected: `PDF written: XXXXX bytes` (if an invoice exists) or the "no invoices" message

- [ ] **Step 3: Commit**

```bash
git add backend/pdf_generator.py
git commit -m "feat: rewrite PDF generator with modern green band layout"
```

---

## Task 8: Frontend — API client additions

**Files:**
- Modify: `frontend/src/api/client.js`

- [ ] **Step 1: Add new functions to `frontend/src/api/client.js`**

Replace the existing `// Settings` section and add new sections. The full updated file:

```js
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Products
export const getProducts = (category) => api.get('/products', { params: { category } }).then(r => r.data)
export const createProduct = (data) => api.post('/products', data).then(r => r.data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then(r => r.data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)

// Suppliers
export const getSuppliers = () => api.get('/suppliers').then(r => r.data)
export const createSupplier = (data) => api.post('/suppliers', data).then(r => r.data)
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data)
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`)

// Customers
export const getCustomers = () => api.get('/customers').then(r => r.data)
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then(r => r.data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`)

// Purchases
export const getPurchases = () => api.get('/purchases').then(r => r.data)
export const createPurchase = (data) => api.post('/purchases', data).then(r => r.data)
export const voidPurchase = (id, reason) => api.post(`/purchases/${id}/void`, { void_reason: reason }).then(r => r.data)

// Sales
export const getSales = () => api.get('/sales').then(r => r.data)
export const createSale = (data) => api.post('/sales', data).then(r => r.data)
export const updateSale = (id, data) => api.put(`/sales/${id}`, data).then(r => r.data)
export const voidSale = (id, reason) => api.post(`/sales/${id}/void`, { void_reason: reason }).then(r => r.data)

// Invoices
export const getInvoices = () => api.get('/invoices').then(r => r.data)
export const getInvoice = (id) => api.get(`/invoices/${id}`).then(r => r.data)
export const createInvoice = (data) => api.post('/invoices', data).then(r => r.data)
export const markInvoicePaid = (id) => api.post(`/invoices/${id}/mark-paid`).then(r => r.data)
export const dismissPaymentAlert = (id) => api.post(`/invoices/${id}/dismiss-payment-alert`).then(r => r.data)
export const dismissValidityAlert = (id) => api.post(`/invoices/${id}/dismiss-validity-alert`).then(r => r.data)
export const getInvoicePdfUrl = (id) => `/api/invoices/${id}/pdf`

// Creditors
export const getCreditors = () => api.get('/creditors').then(r => r.data)
export const recordCreditorPayment = (id, data) => api.post(`/creditors/${id}/payments`, data).then(r => r.data)

// Dashboard
export const getDashboard = () => api.get('/dashboard').then(r => r.data)

// Reports
export const getSalesReport = (params) => api.get('/reports/sales', { params }).then(r => r.data)
export const getPurchasesReport = (params) => api.get('/reports/purchases', { params }).then(r => r.data)
export const getStockReport = () => api.get('/reports/stock').then(r => r.data)
export const getCreditorsReport = () => api.get('/reports/creditors').then(r => r.data)

// Settings (combined: business info + alert days)
export const getSettings = () => api.get('/settings').then(r => r.data)
export const updateSettings = (data) => api.put('/settings', data).then(r => r.data)
export const uploadLogo = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/settings/logo', fd).then(r => r.data)
}
export const deleteLogo = () => api.delete('/settings/logo').then(r => r.data)
export const getLogoUrl = () => `/api/settings/logo?t=${Date.now()}`

// Units
export const getUnits = () => api.get('/units').then(r => r.data)
export const createUnit = (name) => api.post('/units', { name }).then(r => r.data)
export const deleteUnit = (id) => api.delete(`/units/${id}`)

// Backup
export const exportBackup = () => { window.location.href = '/api/backup/export' }
export const importBackup = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/backup/import', fd).then(r => r.data)
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd frontend && node -e "import('./src/api/client.js').then(() => console.log('OK')).catch(e => console.error(e))" 2>/dev/null || echo "check in browser dev tools"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/client.js
git commit -m "feat: add settings, units, logo, backup API client functions"
```

---

## Task 9: Frontend — Rewrite Settings page (4 tabs)

**Files:**
- Modify: `frontend/src/pages/Settings.jsx`

- [ ] **Step 1: Rewrite `frontend/src/pages/Settings.jsx` completely**

```jsx
import { useEffect, useState, useRef } from 'react'
import { getSettings, updateSettings, uploadLogo, deleteLogo, getLogoUrl,
         getUnits, createUnit, deleteUnit,
         exportBackup, importBackup } from '../api/client'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'

const TABS = ['Business Info', 'Invoice Alerts', 'Units', 'Backup']

const FIELD_ROWS = [
  ['business_name', 'Business Name', 'text'],
  ['tagline', 'Tagline / Slogan', 'text'],
  ['address', 'Address', 'textarea'],
  ['phone', 'Phone Number', 'text'],
  ['email', 'Email', 'text'],
  ['ntn', 'NTN (Tax Number)', 'text'],
  ['strn', 'STRN', 'text'],
  ['bank_name', 'Bank Name', 'text'],
  ['bank_account', 'Bank Account Number', 'text'],
  ['bank_iban', 'IBAN', 'text'],
  ['footer_note', 'Invoice Footer Note', 'textarea'],
]

const EMPTY_SETTINGS = {
  business_name: '', tagline: '', address: '', phone: '', email: '',
  ntn: '', strn: '', bank_name: '', bank_account: '', bank_iban: '',
  footer_note: 'Thank you for your business!',
  payment_due_alert_days: 3, validity_expiry_alert_days: 7,
}

export default function Settings() {
  const [tab, setTab] = useState('Business Info')
  const [form, setForm] = useState(EMPTY_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [units, setUnits] = useState([])
  const [newUnit, setNewUnit] = useState('')
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [restored, setRestored] = useState(false)
  const logoInputRef = useRef()
  const restoreInputRef = useRef()
  const toast = useToast()
  const { confirm } = useConfirm()

  const loadSettings = () => getSettings().then(data => setForm(f => ({ ...f, ...data })))
  const loadUnits = () => getUnits().then(setUnits)

  useEffect(() => {
    loadSettings()
    loadUnits()
    // Check if logo exists
    fetch('/api/settings/logo').then(r => {
      if (r.ok) setLogoUrl(getLogoUrl())
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateSettings(form)
      toast('Settings saved')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to save settings', 'error')
    } finally { setSaving(false) }
  }

  const handleLogoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setLogoPreview(preview)
    try {
      await uploadLogo(file)
      setLogoUrl(getLogoUrl())
      toast('Logo uploaded')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to upload logo', 'error')
      setLogoPreview(null)
    }
  }

  const handleDeleteLogo = async () => {
    const yes = await confirm('Remove the logo from invoices?')
    if (!yes) return
    try {
      await deleteLogo()
      setLogoUrl(null)
      setLogoPreview(null)
      toast('Logo removed')
    } catch (e) { toast('Failed to remove logo', 'error') }
  }

  const handleAddUnit = async () => {
    const name = newUnit.trim()
    if (!name) return
    try {
      await createUnit(name)
      setNewUnit('')
      loadUnits()
      toast(`Unit "${name}" added`)
    } catch (e) { toast(e.response?.data?.detail || 'Failed to add unit', 'error') }
  }

  const handleDeleteUnit = async (u) => {
    try {
      await deleteUnit(u.id)
      loadUnits()
      toast(`Unit "${u.name}" deleted`)
    } catch (e) { toast(e.response?.data?.detail || 'Cannot delete unit', 'error') }
  }

  const handleExport = () => exportBackup()

  const handleRestore = async () => {
    if (!restoreFile) return toast('Please select a backup file first', 'error')
    const yes = await confirm('This will replace ALL current data and cannot be undone. Are you sure?')
    if (!yes) return
    try {
      setRestoring(true)
      await importBackup(restoreFile)
      setRestored(true)
      toast('Backup restored successfully')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to restore backup', 'error')
    } finally { setRestoring(false) }
  }

  const field = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 className="sap-h1">Settings</h1>

      <div className="sap-tabs">
        {TABS.map(t => (
          <button key={t} className={`sap-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── Tab 1: Business Info ── */}
      {tab === 'Business Info' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div className="sap-card" style={{ padding: '28px', flex: 1, maxWidth: '560px' }}>
            {FIELD_ROWS.map(([key, label, type]) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label className="sap-label">{label}</label>
                {type === 'textarea'
                  ? <textarea className="sap-input" rows={3} value={form[key] || ''} onChange={field(key)} />
                  : <input className="sap-input" type="text" value={form[key] || ''} onChange={field(key)} />
                }
              </div>
            ))}
            <button className="sap-btn sap-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: '140px' }}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          {/* Logo panel */}
          <div className="sap-card" style={{ padding: '24px', minWidth: '220px' }}>
            <div className="sap-h2" style={{ marginBottom: '16px' }}>Company Logo</div>
            <div style={{
              width: '160px', height: '100px', borderRadius: '10px',
              border: '2px dashed var(--border-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', marginBottom: '14px', overflow: 'hidden',
            }}>
              {(logoPreview || logoUrl)
                ? <img src={logoPreview || logoUrl} alt="Logo"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : <span style={{ fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center', padding: '8px' }}>No logo</span>
              }
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoSelect} />
            <button className="sap-btn sap-btn-ghost" style={{ width: '100%', marginBottom: '8px' }}
              onClick={() => logoInputRef.current.click()}>
              Upload Logo
            </button>
            {(logoUrl || logoPreview) && (
              <button className="sap-btn sap-btn-danger" style={{ width: '100%', fontSize: '12px' }}
                onClick={handleDeleteLogo}>Remove Logo</button>
            )}
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '10px' }}>Max 5MB. PNG recommended.</div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Invoice Alerts ── */}
      {tab === 'Invoice Alerts' && (
        <div className="sap-card" style={{ padding: '28px', maxWidth: '480px' }}>
          <div className="sap-h2" style={{ marginBottom: '20px' }}>Invoice Alert Thresholds</div>
          <div style={{ marginBottom: '18px' }}>
            <label className="sap-label">Days before payment due date to alert</label>
            <input className="sap-input" type="number" min="1" max="90"
              value={form.payment_due_alert_days}
              onChange={e => setForm(f => ({ ...f, payment_due_alert_days: parseInt(e.target.value) || 3 }))} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label className="sap-label">Days before validity expiry to alert</label>
            <input className="sap-input" type="number" min="1" max="90"
              value={form.validity_expiry_alert_days}
              onChange={e => setForm(f => ({ ...f, validity_expiry_alert_days: parseInt(e.target.value) || 7 }))} />
          </div>
          <button className="sap-btn sap-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {/* ── Tab 3: Units ── */}
      {tab === 'Units' && (
        <div className="sap-card" style={{ padding: '28px', maxWidth: '520px' }}>
          <div className="sap-h2" style={{ marginBottom: '6px' }}>Product Units</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            These units appear in the product form. You cannot delete a unit that is in use.
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <input className="sap-input" style={{ flex: 1 }} placeholder="New unit name…"
              value={newUnit} onChange={e => setNewUnit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUnit()} />
            <button className="sap-btn sap-btn-primary" onClick={handleAddUnit}>Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {units.map(u => (
              <div key={u.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg)', border: '1.5px solid var(--border)',
                borderRadius: '20px', padding: '5px 12px 5px 14px',
                fontSize: '13px', fontWeight: 500, color: 'var(--text)',
              }}>
                {u.name}
                <button onClick={() => handleDeleteUnit(u)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-faint)', fontSize: '16px', lineHeight: 1,
                  padding: '0 2px', fontWeight: 700,
                }}>×</button>
              </div>
            ))}
            {units.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: '13px' }}>No units yet. Add one above.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 4: Backup ── */}
      {tab === 'Backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
          <div className="sap-card" style={{ padding: '28px' }}>
            <div className="sap-h2" style={{ marginBottom: '8px' }}>Export Backup</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Downloads a zip file containing your full database and logo. Keep this safe.
            </div>
            <button className="sap-btn sap-btn-primary" onClick={handleExport}>
              Download Backup
            </button>
          </div>

          <div className="sap-card" style={{ padding: '28px' }}>
            <div className="sap-h2" style={{ marginBottom: '8px' }}>Restore Backup</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Upload a previously exported zip file to restore your data. This replaces all current data.
            </div>
            {restored ? (
              <div style={{ background: 'var(--success-subtle)', border: '1px solid var(--success)', borderRadius: '8px', padding: '14px 18px' }}>
                <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '10px' }}>
                  Backup restored successfully.
                </div>
                <button className="sap-btn sap-btn-primary" onClick={() => window.location.reload()}>
                  Refresh Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input ref={restoreInputRef} type="file" accept=".zip" style={{ display: 'none' }}
                  onChange={e => setRestoreFile(e.target.files[0])} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="sap-btn sap-btn-ghost" onClick={() => restoreInputRef.current.click()}>
                    Choose File
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {restoreFile ? restoreFile.name : 'No file selected'}
                  </span>
                </div>
                <button className="sap-btn sap-btn-danger" onClick={handleRestore} disabled={!restoreFile || restoring}
                  style={{ alignSelf: 'flex-start', padding: '8px 20px', fontSize: '14px' }}>
                  {restoring ? 'Restoring…' : 'Restore Backup'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify page loads in browser**

Visit `http://localhost:5174/settings`. You should see 4 tabs. Click each tab and confirm they render without errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Settings.jsx
git commit -m "feat: rewrite Settings page with 4 tabs (business, alerts, units, backup)"
```

---

## Task 10: Frontend — Products page unit dropdown

**Files:**
- Modify: `frontend/src/pages/Products.jsx`

- [ ] **Step 1: Update `frontend/src/pages/Products.jsx`**

Make the following targeted changes:

**Change 1** — Add `getUnits` to the import line (line 2):
```jsx
import { getProducts, createProduct, updateProduct, deleteProduct, getUnits } from '../api/client'
```

**Change 2** — Add `units` state and load it on mount. After the existing state declarations (after line 19 `const { confirm } = useConfirm()`):
```jsx
const [units, setUnits] = useState([])
```

**Change 3** — Load units in `useEffect`. Change the existing:
```jsx
const load = () => getProducts(tab).then(setProducts)
useEffect(() => { load() }, [tab])
```
To:
```jsx
const load = () => getProducts(tab).then(setProducts)
useEffect(() => { load() }, [tab])
useEffect(() => { getUnits().then(setUnits) }, [])
```

**Change 4** — In the modal, replace the unit input row. Remove this block inside the `.map()`:
```jsx
['unit', 'Unit (kg / bag / litre)', 'text'],
```
And add a dedicated unit dropdown after the `.map()` loop (before the category select):
```jsx
<div style={{ marginBottom: '14px' }}>
  <label className="sap-label">Unit</label>
  <select className="sap-input" value={form.unit}
    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
    <option value="">Select unit…</option>
    {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
    {units.length === 0 && <option disabled>No units — add in Settings</option>}
  </select>
</div>
```

- [ ] **Step 2: Verify**

Visit `http://localhost:5174/products`, click **+ Add Product**, confirm the Unit field is a dropdown showing the 10 default units.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Products.jsx
git commit -m "feat: replace unit text input with dropdown from Units API"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| `BusinessSettings` model | Task 1 |
| `Unit` model + seeding | Task 1, Task 4, Task 6 |
| `GET/PUT /api/settings` merged | Task 3 |
| `POST/GET/DELETE /api/settings/logo` | Task 3 |
| `GET/POST/DELETE /api/units` | Task 4 |
| `GET /api/backup/export` | Task 5 |
| `POST /api/backup/import` | Task 5 |
| Wire routers in main.py + lifespan seed | Task 6 |
| PDF rewrite — modern band layout | Task 7 |
| API client additions | Task 8 |
| Settings page — 4 tabs | Task 9 |
| Products unit dropdown | Task 10 |
| Logo > 5MB rejected | Task 3 (`MAX_LOGO_BYTES`) |
| Unit delete blocked if in use | Task 4 |
| Backup restore confirm dialog | Task 9 |
| Refresh button after restore | Task 9 |

All spec requirements covered. No placeholders. Types consistent across tasks.
