# backend/tests/test_purchases.py
from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc).isoformat()
FUTURE = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

def test_cash_purchase_increases_stock(client, product, supplier):
    r = client.post("/api/purchases", json={
        "date": NOW, "supplier_id": supplier["id"],
        "payment_type": "cash", "notes": "",
        "items": [{"product_id": product["id"], "quantity": 50.0, "unit_price": 45.0}]
    })
    assert r.status_code == 201
    assert r.json()["total_amount"] == 2250.0
    p = client.get(f"/api/products/{product['id']}").json()
    assert p["current_stock"] == 150.0

def test_credit_purchase_creates_creditor(client, product, supplier):
    r = client.post("/api/purchases", json={
        "date": NOW, "supplier_id": supplier["id"],
        "payment_type": "credit", "notes": "",
        "due_date": FUTURE,
        "items": [{"product_id": product["id"], "quantity": 20.0, "unit_price": 50.0}]
    })
    assert r.status_code == 201
    creditors = client.get("/api/creditors").json()
    assert len(creditors) == 1
    assert creditors[0]["amount_owed"] == 1000.0
    assert creditors[0]["status"] == "outstanding"

def test_credit_purchase_without_due_date_fails(client, product, supplier):
    r = client.post("/api/purchases", json={
        "date": NOW, "supplier_id": supplier["id"],
        "payment_type": "credit",
        "items": [{"product_id": product["id"], "quantity": 10.0, "unit_price": 50.0}]
    })
    assert r.status_code == 400

def test_void_purchase_reverses_stock(client, product, supplier):
    p = client.post("/api/purchases", json={
        "date": NOW, "supplier_id": supplier["id"],
        "payment_type": "cash",
        "items": [{"product_id": product["id"], "quantity": 50.0, "unit_price": 45.0}]
    }).json()
    client.post(f"/api/purchases/{p['id']}/void", json={"void_reason": "mistake"})
    updated = client.get(f"/api/products/{product['id']}").json()
    assert updated["current_stock"] == 100.0
