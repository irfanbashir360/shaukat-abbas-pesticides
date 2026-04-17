# backend/tests/test_invoices.py
from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc).isoformat()
DUE = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
VALID = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

def _make_sale(client, product, customer):
    return client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 10.0, "unit_price": 70.0}]
    }).json()

def test_create_invoice_auto_numbers(client, product, customer):
    sale = _make_sale(client, product, customer)
    r = client.post("/api/invoices", json={
        "sale_id": sale["id"],
        "payment_due_date": DUE,
        "validity_expiry_date": VALID,
    })
    assert r.status_code == 201
    year = datetime.now(timezone.utc).year
    assert r.json()["invoice_number"] == f"SAP-{year}-0001"

def test_invoice_numbers_increment(client, product, customer):
    sale1 = _make_sale(client, product, customer)
    sale2 = _make_sale(client, product, customer)
    client.post("/api/invoices", json={"sale_id": sale1["id"], "payment_due_date": DUE, "validity_expiry_date": VALID})
    r = client.post("/api/invoices", json={"sale_id": sale2["id"], "payment_due_date": DUE, "validity_expiry_date": VALID})
    year = datetime.now(timezone.utc).year
    assert r.json()["invoice_number"] == f"SAP-{year}-0002"

def test_cannot_create_duplicate_invoice_for_sale(client, product, customer):
    sale = _make_sale(client, product, customer)
    client.post("/api/invoices", json={"sale_id": sale["id"], "payment_due_date": DUE, "validity_expiry_date": VALID})
    r = client.post("/api/invoices", json={"sale_id": sale["id"], "payment_due_date": DUE, "validity_expiry_date": VALID})
    assert r.status_code == 400

def test_mark_invoice_paid(client, product, customer):
    sale = _make_sale(client, product, customer)
    inv = client.post("/api/invoices", json={"sale_id": sale["id"], "payment_due_date": DUE, "validity_expiry_date": VALID}).json()
    r = client.post(f"/api/invoices/{inv['id']}/mark-paid")
    assert r.status_code == 200
    assert r.json()["is_paid"] is True

def test_dismiss_payment_alert(client, product, customer):
    sale = _make_sale(client, product, customer)
    inv = client.post("/api/invoices", json={"sale_id": sale["id"], "payment_due_date": DUE, "validity_expiry_date": VALID}).json()
    r = client.post(f"/api/invoices/{inv['id']}/dismiss-payment-alert")
    assert r.json()["payment_alert_dismissed"] is True
