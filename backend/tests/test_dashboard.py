# backend/tests/test_dashboard.py
from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc).isoformat()

def test_dashboard_month_sales(client, product, customer):
    client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 10.0, "unit_price": 70.0}]
    })
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    assert r.json()["month_sales"] == 700.0
    assert r.json()["net_profit"] == 700.0

def test_dashboard_low_stock_alert(client):
    client.post("/api/products", json={
        "name": "Low Stock Item", "category": "seed",
        "unit": "kg", "price_per_unit": 10.0,
        "current_stock": 5.0, "low_stock_threshold": 5.0
    })
    r = client.get("/api/dashboard")
    assert len(r.json()["low_stock_products"]) == 1

def test_dashboard_invoice_payment_alert(client, product, customer):
    sale = client.post("/api/sales", json={
        "date": NOW, "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 5.0, "unit_price": 70.0}]
    }).json()
    due_soon = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    valid = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    client.post("/api/invoices", json={"sale_id": sale["id"], "payment_due_date": due_soon, "validity_expiry_date": valid})
    r = client.get("/api/dashboard")
    assert len(r.json()["payment_due_alerts"]) == 1

def test_dashboard_has_daily_sales(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "daily_sales" in data
    assert isinstance(data["daily_sales"], list)
    assert len(data["daily_sales"]) == 30
    first = data["daily_sales"][0]
    assert "date" in first
    assert "total" in first

def test_dashboard_has_monthly_sales_prev(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "monthly_sales_prev" in data
    assert isinstance(data["monthly_sales_prev"], float)

def test_dashboard_has_debtors_total(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "debtors_total_owed" in data

def test_dashboard_has_product_count(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "product_count" in data
    assert isinstance(data["product_count"], int)
