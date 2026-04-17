# backend/tests/test_products.py
def test_create_product(client):
    r = client.post("/api/products", json={
        "name": "Urea", "category": "fertilizer",
        "unit": "kg", "price_per_unit": 50.0,
        "current_stock": 100.0, "low_stock_threshold": 10.0
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Urea"
    assert r.json()["category"] == "fertilizer"

def test_list_products_by_category(client, product):
    r = client.get("/api/products?category=fertilizer")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["category"] == "fertilizer"

def test_update_product(client, product):
    r = client.put(f"/api/products/{product['id']}", json={"price_per_unit": 60.0})
    assert r.status_code == 200
    assert r.json()["price_per_unit"] == 60.0

def test_delete_product(client, product):
    r = client.delete(f"/api/products/{product['id']}")
    assert r.status_code == 204
    r2 = client.get(f"/api/products/{product['id']}")
    assert r2.status_code == 404
