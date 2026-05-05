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
    _credit_sale(client, product, customer)
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
