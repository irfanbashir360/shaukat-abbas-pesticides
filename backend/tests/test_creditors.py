# backend/tests/test_creditors.py
from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc).isoformat()
FUTURE = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

def _make_credit_purchase(client, product, supplier, amount=1000.0):
    qty = amount / 50.0
    return client.post("/api/purchases", json={
        "date": NOW, "supplier_id": supplier["id"],
        "payment_type": "credit", "due_date": FUTURE,
        "items": [{"product_id": product["id"], "quantity": qty, "unit_price": 50.0}]
    }).json()

def test_creditor_listed_after_credit_purchase(client, product, supplier):
    _make_credit_purchase(client, product, supplier, 1000.0)
    r = client.get("/api/creditors")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["amount_owed"] == 1000.0
    assert r.json()[0]["status"] == "outstanding"

def test_partial_payment_sets_partially_paid(client, product, supplier):
    _make_credit_purchase(client, product, supplier, 1000.0)
    creditor_id = client.get("/api/creditors").json()[0]["id"]
    r = client.post(f"/api/creditors/{creditor_id}/payments",
                    json={"date": NOW, "amount_paid": 400.0, "notes": "partial"})
    assert r.status_code == 200
    assert r.json()["status"] == "partially_paid"
    assert r.json()["total_paid"] == 400.0

def test_full_payment_sets_settled(client, product, supplier):
    _make_credit_purchase(client, product, supplier, 1000.0)
    creditor_id = client.get("/api/creditors").json()[0]["id"]
    client.post(f"/api/creditors/{creditor_id}/payments",
                json={"date": NOW, "amount_paid": 1000.0, "notes": "full"})
    r = client.get("/api/creditors")
    assert len(r.json()) == 0
