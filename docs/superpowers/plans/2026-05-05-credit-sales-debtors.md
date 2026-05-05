# Credit Sales & Debtors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track credit sales to customers in a Debtors module, mirroring the existing Creditors module.

**Architecture:** Add `payment_type`, `amount_paid_upfront`, `due_date` to the `Sale` model. When a credit sale is created, a `Debtor` record is auto-created. A new `/debtors` router and page let users record payments until the debt is settled. SQLite column migration runs at startup for existing databases.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, React, Axios

---

### Task 1: Add Debtor models and migrate Sale table

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Add DebtorStatus enum and new models to models.py**

Open `backend/models.py`. After the `CreditorStatus` enum (line 17), add:

```python
class DebtorStatus(str, enum.Enum):
    outstanding = "outstanding"
    partially_paid = "partially_paid"
    settled = "settled"
```

After the `Sale` model class (around line 90), add 3 new columns to `Sale`:

```python
class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    notes = Column(Text, default="")
    is_voided = Column(Boolean, default=False)
    void_reason = Column(String, default="")
    payment_type = Column(Enum(PaymentType), nullable=False, default=PaymentType.cash)
    amount_paid_upfront = Column(Float, nullable=False, default=0.0)
    due_date = Column(DateTime, nullable=True)
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="sale", uselist=False)
    debtor = relationship("Debtor", back_populates="sale", uselist=False)
```

After `CreditorPayment` model (end of file), add:

```python
class Debtor(Base):
    __tablename__ = "debtors"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, unique=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount_owed = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(DebtorStatus), default=DebtorStatus.outstanding)
    customer = relationship("Customer")
    sale = relationship("Sale", back_populates="debtor")
    payments = relationship("DebtorPayment", back_populates="debtor", cascade="all, delete-orphan")

class DebtorPayment(Base):
    __tablename__ = "debtor_payments"
    id = Column(Integer, primary_key=True, index=True)
    debtor_id = Column(Integer, ForeignKey("debtors.id"), nullable=False)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    amount_paid = Column(Float, nullable=False)
    notes = Column(Text, default="")
    debtor = relationship("Debtor", back_populates="payments")
```

- [ ] **Step 2: Add SQLite column migration to main.py lifespan**

The `sales` table already exists in production databases. SQLAlchemy `create_all` won't add new columns to existing tables. Add a migration step.

In `backend/main.py`, add this import at the top:

```python
from sqlalchemy import text
```

Update the `lifespan` function:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        # Migrate: add new columns to sales table if they don't exist
        with engine.connect() as conn:
            for sql in [
                "ALTER TABLE sales ADD COLUMN payment_type VARCHAR DEFAULT 'cash'",
                "ALTER TABLE sales ADD COLUMN amount_paid_upfront FLOAT DEFAULT 0.0",
                "ALTER TABLE sales ADD COLUMN due_date DATETIME",
            ]:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                except Exception:
                    pass  # Column already exists
        units.seed_units(db)
    finally:
        db.close()
    yield
```

- [ ] **Step 3: Commit**

```bash
cd /path/to/shaukat-abbas-pesticides
git add backend/models.py backend/main.py
git commit -m "feat: add Debtor/DebtorPayment models, migrate sales table"
```

---

### Task 2: Update schemas

**Files:**
- Modify: `backend/schemas.py`

- [ ] **Step 1: Update the import line at top of schemas.py**

```python
from models import ProductCategory, PaymentType, CreditorStatus, DebtorStatus
```

- [ ] **Step 2: Update SaleCreate to include credit fields**

Replace the existing `SaleCreate` class:

```python
class SaleCreate(BaseModel):
    date: datetime
    customer_id: int
    notes: str = ""
    items: List[SaleItemCreate]
    payment_type: PaymentType = PaymentType.cash
    amount_paid_upfront: float = 0.0
    due_date: Optional[datetime] = None  # required when payment_type == credit
```

- [ ] **Step 3: Update SaleOut to include credit fields**

Replace the existing `SaleOut` class:

```python
class SaleOut(BaseModel):
    id: int
    date: datetime
    customer_id: int
    total_amount: float
    notes: str
    is_voided: bool
    void_reason: str
    payment_type: PaymentType
    amount_paid_upfront: float
    due_date: Optional[datetime] = None
    items: List[SaleItemOut]
    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Add Debtor schemas after CreditorPaymentCreate**

```python
# --- Debtor ---
class DebtorOut(BaseModel):
    id: int
    sale_id: int
    customer_id: int
    amount_owed: float
    due_date: datetime
    status: DebtorStatus
    customer_name: str
    total_paid: float

class DebtorPaymentCreate(BaseModel):
    date: datetime
    amount_paid: float
    notes: str = ""
```

- [ ] **Step 5: Commit**

```bash
git add backend/schemas.py
git commit -m "feat: update Sale schemas, add Debtor schemas"
```

---

### Task 3: Create debtors router

**Files:**
- Create: `backend/routers/debtors.py`

- [ ] **Step 1: Create the file**

```python
# backend/routers/debtors.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

@router.get("", response_model=List[schemas.DebtorOut])
def list_debtors(db: Session = Depends(get_db)):
    debtors = db.query(models.Debtor).filter(
        models.Debtor.status != models.DebtorStatus.settled
    ).all()
    return [schemas.DebtorOut(
        id=d.id, sale_id=d.sale_id, customer_id=d.customer_id,
        amount_owed=d.amount_owed, due_date=d.due_date, status=d.status,
        customer_name=d.customer.name,
        total_paid=sum(p.amount_paid for p in d.payments),
    ) for d in debtors]

@router.post("/{debtor_id}/payments", response_model=schemas.DebtorOut)
def record_payment(debtor_id: int, payload: schemas.DebtorPaymentCreate, db: Session = Depends(get_db)):
    debtor = db.query(models.Debtor).filter(models.Debtor.id == debtor_id).first()
    if not debtor: raise HTTPException(404, "Debtor not found")
    if debtor.status == models.DebtorStatus.settled:
        raise HTTPException(400, "Already settled")

    db.add(models.DebtorPayment(
        debtor_id=debtor_id, date=payload.date,
        amount_paid=payload.amount_paid, notes=payload.notes,
    ))
    db.flush()

    total_paid = sum(p.amount_paid for p in debtor.payments)
    debtor.status = (models.DebtorStatus.settled if total_paid >= debtor.amount_owed
                     else models.DebtorStatus.partially_paid)
    db.commit(); db.refresh(debtor)

    return schemas.DebtorOut(
        id=debtor.id, sale_id=debtor.sale_id, customer_id=debtor.customer_id,
        amount_owed=debtor.amount_owed, due_date=debtor.due_date, status=debtor.status,
        customer_name=debtor.customer.name,
        total_paid=sum(p.amount_paid for p in debtor.payments),
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/debtors.py
git commit -m "feat: add debtors router"
```

---

### Task 4: Update sales router to auto-create Debtor

**Files:**
- Modify: `backend/routers/sales.py`

- [ ] **Step 1: Update create_sale to handle credit**

In `backend/routers/sales.py`, replace the `create_sale` function:

```python
@router.post("", response_model=schemas.SaleOut, status_code=201)
def create_sale(payload: schemas.SaleCreate, db: Session = Depends(get_db)):
    if payload.payment_type == models.PaymentType.credit and not payload.due_date:
        raise HTTPException(400, "due_date is required for credit sales")

    # Validate all stock BEFORE making any changes
    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        if product.current_stock < item_data.quantity:
            raise HTTPException(400,
                f"Insufficient stock for {product.name}: "
                f"available {product.current_stock}, requested {item_data.quantity}")

    total = sum(i.quantity * i.unit_price for i in payload.items)
    sale = models.Sale(
        date=payload.date, customer_id=payload.customer_id,
        total_amount=total, notes=payload.notes,
        payment_type=payload.payment_type,
        amount_paid_upfront=payload.amount_paid_upfront,
        due_date=payload.due_date,
    )
    db.add(sale); db.flush()

    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        db.add(models.SaleItem(
            sale_id=sale.id, product_id=item_data.product_id,
            quantity=item_data.quantity, unit_price=item_data.unit_price,
        ))
        product.current_stock -= item_data.quantity
        db.add(models.StockMovement(
            product_id=item_data.product_id, date=payload.date,
            movement_type=models.MovementType.sale, quantity_change=-item_data.quantity,
            reference_id=sale.id, reference_type="sale",
        ))

    # Auto-create Debtor for credit sales
    if payload.payment_type == models.PaymentType.credit:
        amount_owed = total - payload.amount_paid_upfront
        db.add(models.Debtor(
            sale_id=sale.id, customer_id=payload.customer_id,
            amount_owed=amount_owed, due_date=payload.due_date,
            status=models.DebtorStatus.outstanding,
        ))

    db.commit(); db.refresh(sale)
    return sale
```

- [ ] **Step 2: Update update_sale to handle credit**

Replace the `update_sale` function:

```python
@router.put("/{sale_id}", response_model=schemas.SaleOut)
def update_sale(sale_id: int, payload: schemas.SaleCreate, db: Session = Depends(get_db)):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale: raise HTTPException(404, "Sale not found")
    if sale.is_voided: raise HTTPException(400, "Cannot edit a voided sale")
    if payload.payment_type == models.PaymentType.credit and not payload.due_date:
        raise HTTPException(400, "due_date is required for credit sales")

    # Restore stock from old items
    for item in sale.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.current_stock += item.quantity

    # Validate new items have enough stock (after restoration)
    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        if product.current_stock < item_data.quantity:
            raise HTTPException(400,
                f"Insufficient stock for {product.name}: "
                f"available {product.current_stock}, requested {item_data.quantity}")

    # Remove old items and their stock movements
    for item in list(sale.items):
        db.delete(item)
    db.query(models.StockMovement).filter(
        models.StockMovement.reference_id == sale_id,
        models.StockMovement.reference_type == "sale",
        models.StockMovement.movement_type == models.MovementType.sale,
    ).delete()

    # Update sale header
    sale.date = payload.date
    sale.customer_id = payload.customer_id
    sale.notes = payload.notes
    sale.payment_type = payload.payment_type
    sale.amount_paid_upfront = payload.amount_paid_upfront
    sale.due_date = payload.due_date
    sale.total_amount = sum(i.quantity * i.unit_price for i in payload.items)
    db.flush()

    # Add new items and deduct stock
    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        db.add(models.SaleItem(
            sale_id=sale.id, product_id=item_data.product_id,
            quantity=item_data.quantity, unit_price=item_data.unit_price,
        ))
        product.current_stock -= item_data.quantity
        db.add(models.StockMovement(
            product_id=item_data.product_id, date=payload.date,
            movement_type=models.MovementType.sale, quantity_change=-item_data.quantity,
            reference_id=sale.id, reference_type="sale",
        ))

    # Update or create Debtor record
    if payload.payment_type == models.PaymentType.credit:
        amount_owed = sale.total_amount - payload.amount_paid_upfront
        if sale.debtor:
            sale.debtor.customer_id = payload.customer_id
            sale.debtor.amount_owed = amount_owed
            sale.debtor.due_date = payload.due_date
        else:
            db.add(models.Debtor(
                sale_id=sale.id, customer_id=payload.customer_id,
                amount_owed=amount_owed, due_date=payload.due_date,
                status=models.DebtorStatus.outstanding,
            ))
    else:
        # Changed from credit to cash — remove debtor if no payments yet
        if sale.debtor and not sale.debtor.payments:
            db.delete(sale.debtor)

    db.commit(); db.refresh(sale)
    return sale
```

- [ ] **Step 3: Commit**

```bash
git add backend/routers/sales.py
git commit -m "feat: auto-create Debtor on credit sales"
```

---

### Task 5: Register debtors router in main.py

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add debtors import and router registration**

Update the import line:

```python
from routers import (products, suppliers, customers, purchases,
                     sales, invoices, creditors, debtors, dashboard, reports, settings,
                     units, backup)
```

Add after the creditors router line:

```python
app.include_router(debtors.router,    prefix="/api/debtors",    tags=["debtors"])
```

- [ ] **Step 2: Commit**

```bash
git add backend/main.py
git commit -m "feat: register debtors router"
```

---

### Task 6: Write backend tests

**Files:**
- Create: `backend/tests/test_debtors.py`

- [ ] **Step 1: Write the test file**

```python
# backend/tests/test_debtors.py
from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc).isoformat()
DUE = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()

def _credit_sale(client, product, customer, upfront=0.0):
    return client.post("/api/sales", json={
        "date": NOW,
        "customer_id": customer["id"],
        "payment_type": "credit",
        "amount_paid_upfront": upfront,
        "due_date": DUE,
        "items": [{"product_id": product["id"], "quantity": 10.0, "unit_price": 100.0}],
    }).json()

def _cash_sale(client, product, customer):
    return client.post("/api/sales", json={
        "date": NOW,
        "customer_id": customer["id"],
        "payment_type": "cash",
        "items": [{"product_id": product["id"], "quantity": 5.0, "unit_price": 100.0}],
    }).json()

def test_credit_sale_creates_debtor(client, product, customer):
    _credit_sale(client, product, customer)
    r = client.get("/api/debtors")
    assert r.status_code == 200
    debtors = r.json()
    assert len(debtors) == 1
    assert debtors[0]["amount_owed"] == 1000.0
    assert debtors[0]["customer_name"] == customer["name"]
    assert debtors[0]["status"] == "outstanding"

def test_credit_sale_with_upfront_reduces_amount_owed(client, product, customer):
    _credit_sale(client, product, customer, upfront=300.0)
    r = client.get("/api/debtors")
    assert r.json()[0]["amount_owed"] == 700.0

def test_cash_sale_does_not_create_debtor(client, product, customer):
    _cash_sale(client, product, customer)
    r = client.get("/api/debtors")
    assert r.json() == []

def test_credit_sale_requires_due_date(client, product, customer):
    r = client.post("/api/sales", json={
        "date": NOW,
        "customer_id": customer["id"],
        "payment_type": "credit",
        "items": [{"product_id": product["id"], "quantity": 1.0, "unit_price": 100.0}],
    })
    assert r.status_code == 400

def test_record_partial_payment(client, product, customer):
    sale = _credit_sale(client, product, customer)
    debtors = client.get("/api/debtors").json()
    debtor_id = debtors[0]["id"]

    r = client.post(f"/api/debtors/{debtor_id}/payments", json={
        "date": NOW, "amount_paid": 400.0, "notes": "partial",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "partially_paid"
    assert data["total_paid"] == 400.0

def test_record_full_payment_settles_debtor(client, product, customer):
    _credit_sale(client, product, customer)
    debtors = client.get("/api/debtors").json()
    debtor_id = debtors[0]["id"]

    client.post(f"/api/debtors/{debtor_id}/payments", json={
        "date": NOW, "amount_paid": 1000.0, "notes": "",
    })
    # Settled debtors are excluded from list
    assert client.get("/api/debtors").json() == []

def test_settled_debtor_cannot_accept_payment(client, product, customer):
    _credit_sale(client, product, customer)
    debtors = client.get("/api/debtors").json()
    debtor_id = debtors[0]["id"]
    client.post(f"/api/debtors/{debtor_id}/payments", json={"date": NOW, "amount_paid": 1000.0, "notes": ""})
    r = client.post(f"/api/debtors/{debtor_id}/payments", json={"date": NOW, "amount_paid": 1.0, "notes": ""})
    assert r.status_code == 400
```

- [ ] **Step 2: Run tests**

```bash
cd backend
pytest tests/test_debtors.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_debtors.py
git commit -m "test: add debtors tests"
```

---

### Task 7: Add API client functions

**Files:**
- Modify: `frontend/src/api/client.js`

- [ ] **Step 1: Add debtor functions after the Creditors section**

```js
// Debtors
export const getDebtors = () => api.get('/debtors').then(r => r.data)
export const recordDebtorPayment = (id, data) => api.post(`/debtors/${id}/payments`, data).then(r => r.data)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.js
git commit -m "feat: add debtors API client functions"
```

---

### Task 8: Update Sales.jsx

**Files:**
- Modify: `frontend/src/pages/Sales.jsx`

- [ ] **Step 1: Update imports to include getDebtors (not needed here but add credit fields to form state)**

In `Sales.jsx`, update the form initial state and `openEdit`:

Replace the `form` state initialization (currently line 21):
```js
const [form, setForm] = useState({
  date: today(), customer_id: '', walkin_name: '', notes: '',
  payment_type: 'cash', amount_paid_upfront: 0, due_date: '',
  items: [{ ...EMPTY_ITEM }]
})
```

Update `openEdit` to include credit fields:
```js
const openEdit = (sale) => {
  setEditingSale(sale)
  setForm({
    date: new Date(sale.date).toISOString().slice(0, 16),
    customer_id: String(sale.customer_id),
    walkin_name: '',
    notes: sale.notes || '',
    payment_type: sale.payment_type || 'cash',
    amount_paid_upfront: sale.amount_paid_upfront || 0,
    due_date: sale.due_date ? new Date(sale.due_date).toISOString().slice(0, 10) : '',
    items: sale.items.map(i => ({
      product_id: String(i.product_id),
      quantity: i.quantity,
      unit_price: i.unit_price,
    }))
  })
  setError('')
  setShowForm(true)
}
```

Update `closeForm` to reset credit fields:
```js
const closeForm = () => {
  setShowForm(false)
  setEditingSale(null)
  setForm({ date: today(), customer_id: '', walkin_name: '', notes: '', payment_type: 'cash', amount_paid_upfront: 0, due_date: '', items: [{ ...EMPTY_ITEM }] })
  setError('')
}
```

- [ ] **Step 2: Add credit validation and payload fields to handleSubmit**

In `handleSubmit`, add validation before the try block:
```js
if (form.payment_type === 'credit' && !form.due_date) return setError('Please enter a due date for credit sale')
```

Update the `payload` object:
```js
const payload = {
  date: new Date(form.date).toISOString(),
  customer_id: customerId,
  notes: form.notes,
  payment_type: form.payment_type,
  amount_paid_upfront: form.payment_type === 'credit' ? parseFloat(form.amount_paid_upfront) || 0 : 0,
  due_date: form.payment_type === 'credit' ? new Date(form.due_date).toISOString() : null,
  items: form.items.map(i => ({ product_id: parseInt(i.product_id), quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) }))
}
```

- [ ] **Step 3: Add credit fields to the form UI**

After the Customer field `<div>` (after the walkin_name input block) and before `<LineItemsTable>`, add a new grid row:

```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
  <div>
    <label className="sap-label">Payment Type</label>
    <select className="sap-input" value={form.payment_type}
      onChange={e => setForm(f => ({ ...f, payment_type: e.target.value, amount_paid_upfront: 0, due_date: '' }))}>
      <option value="cash">Cash</option>
      <option value="credit">Credit</option>
    </select>
  </div>
  {form.payment_type === 'credit' && (
    <>
      <div>
        <label className="sap-label">Paid Upfront (PKR)</label>
        <input className="sap-input" type="number" min="0" step="0.01"
          value={form.amount_paid_upfront}
          onChange={e => setForm(f => ({ ...f, amount_paid_upfront: e.target.value }))} />
      </div>
      <div>
        <label className="sap-label">Due Date</label>
        <input className="sap-input" type="date" value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
      </div>
    </>
  )}
</div>
```

- [ ] **Step 4: Add Credit badge in the sales list**

In the sales table body, import `StatusBadge` is already there. Update the Status column cell to show credit info:

Replace the `<td>{s.is_voided ? ... : ...}</td>` status cell:
```jsx
<td>
  {s.is_voided
    ? <StatusBadge status="overdue" label="Voided" />
    : s.payment_type === 'credit'
      ? <StatusBadge status="partially_paid" label="Credit" />
      : <StatusBadge status="ok" label="Cash" />
  }
</td>
```

Also update the table header to show Payment column. Replace `<thead>` row:
```jsx
<thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th></th></tr></thead>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Sales.jsx
git commit -m "feat: add credit fields to Sales form and list"
```

---

### Task 9: Create Debtors.jsx page

**Files:**
- Create: `frontend/src/pages/Debtors.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useEffect, useState } from 'react'
import { getDebtors, recordDebtorPayment } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'

export default function Debtors() {
  const [debtors, setDebtors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = () => getDebtors().then(setDebtors)
  useEffect(() => { load() }, [])

  const handlePay = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return setError('Please enter a valid amount')
    try {
      setError(''); setSaving(true)
      await recordDebtorPayment(payModal.id, {
        date: new Date().toISOString(),
        amount_paid: amt,
        notes,
      })
      setPayModal(null); setAmount(''); setNotes('')
      load()
      toast('Payment recorded')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error recording payment')
    } finally { setSaving(false) }
  }

  const now = new Date()
  const total = debtors.reduce((s, d) => s + (d.amount_owed - d.total_paid), 0)

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 className="sap-h1">Debtors</h1>

      <div style={{
        background: 'var(--white)', border: '1px solid rgba(37,99,235,0.20)',
        borderLeft: '4px solid var(--sky)',
        borderRadius: 'var(--r)', padding: '18px 24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="sap-section-title" style={{ marginBottom: '6px' }}>Total Receivable</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--sky)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontSize: '15px', fontWeight: 600, marginRight: '4px', opacity: 0.7 }}>PKR</span>
            {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="sap-badge badge-info">{debtors.length} active</div>
      </div>

      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead>
            <tr><th>Customer</th><th>Owed</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {debtors.map(d => {
              const isOverdue = new Date(d.due_date) < now && d.status !== 'settled'
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.customer_name}</td>
                  <td>PKR {Number(d.amount_owed).toLocaleString()}</td>
                  <td style={{ color: 'var(--success)' }}>PKR {Number(d.total_paid).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>PKR {(d.amount_owed - d.total_paid).toLocaleString()}</td>
                  <td>{new Date(d.due_date).toLocaleDateString()}</td>
                  <td>{isOverdue ? <StatusBadge status="overdue" label="Overdue" /> : <StatusBadge status={d.status} />}</td>
                  <td style={{ textAlign: 'right' }}>
                    {d.status !== 'settled' && (
                      <button className="sap-btn-link" onClick={() => { setPayModal(d); setAmount(''); setNotes(''); setError('') }}>
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {debtors.length === 0 && <tr><td colSpan={7} className="sap-empty">No outstanding debtors.</td></tr>}
          </tbody>
        </table>
      </div>

      {payModal && (
        <Modal title="Record Payment" onClose={() => setPayModal(null)}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Customer: <strong style={{ color: 'var(--text)' }}>{payModal.customer_name}</strong>
          </p>
          <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--sky)', fontWeight: 600 }}>
            Balance due: PKR {(payModal.amount_owed - payModal.total_paid).toLocaleString()}
          </p>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Amount Paid (PKR)</label>
            <input className="sap-input" type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Notes (optional)</label>
            <textarea className="sap-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handlePay} disabled={saving}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Debtors.jsx
git commit -m "feat: add Debtors page"
```

---

### Task 10: Wire up routing and navigation

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Add Debtors route to App.jsx**

Add the import at the top with other page imports:
```js
import Debtors from './pages/Debtors'
```

Add the route after the creditors route:
```jsx
<Route path="debtors" element={<Debtors />} />
```

- [ ] **Step 2: Add Debtors nav link to Layout.jsx**

Add after the Creditors entry in the `NAV` array:
```js
{ to: '/debtors',   label: 'Debtors'   },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Layout.jsx
git commit -m "feat: add Debtors route and nav link"
```

---

### Task 11: Build frontend and push

**Files:** None (build step)

- [ ] **Step 1: Build frontend**

```bash
cd frontend
npm run build
rm -rf ../backend/static
cp -r dist ../backend/static
cd ..
```

- [ ] **Step 2: Run all backend tests to verify nothing broken**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 3: Push**

```bash
git push origin main
```
