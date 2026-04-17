# backend/tests/test_sales.py
from datetime import datetime, timezone

NOW = datetime.now(timezone.utc).isoformat()

def test_sale_decreases_stock(client, product, customer):
    r = client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"], "notes": "",
        "items": [{"product_id": product["id"], "quantity": 30.0, "unit_price": 70.0}]
    })
    assert r.status_code == 201
    assert r.json()["total_amount"] == 2100.0
    p = client.get(f"/api/products/{product['id']}").json()
    assert p["current_stock"] == 70.0

def test_sale_blocked_when_insufficient_stock(client, product, customer):
    r = client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 200.0, "unit_price": 70.0}]
    })
    assert r.status_code == 400
    assert "Insufficient stock" in r.json()["detail"]

def test_void_sale_restores_stock(client, product, customer):
    sale = client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 30.0, "unit_price": 70.0}]
    }).json()
    client.post(f"/api/sales/{sale['id']}/void", json={"void_reason": "returned"})
    p = client.get(f"/api/products/{product['id']}").json()
    assert p["current_stock"] == 100.0

def test_cannot_void_twice(client, product, customer):
    sale = client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 10.0, "unit_price": 70.0}]
    }).json()
    client.post(f"/api/sales/{sale['id']}/void", json={"void_reason": "first"})
    r2 = client.post(f"/api/sales/{sale['id']}/void", json={"void_reason": "second"})
    assert r2.status_code == 400
