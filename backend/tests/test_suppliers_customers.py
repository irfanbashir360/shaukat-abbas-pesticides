# backend/tests/test_suppliers_customers.py
def test_create_supplier(client):
    r = client.post("/api/suppliers", json={"name": "Ali Traders", "phone": "0300-111"})
    assert r.status_code == 201
    assert r.json()["name"] == "Ali Traders"

def test_update_supplier(client, supplier):
    r = client.put(f"/api/suppliers/{supplier['id']}", json={"name": "New Name", "phone": "0300-999", "address": ""})
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"

def test_create_customer(client):
    r = client.post("/api/customers", json={"name": "Ahmad Farm", "phone": "0311-222"})
    assert r.status_code == 201
    assert r.json()["name"] == "Ahmad Farm"

def test_list_customers(client, customer):
    r = client.get("/api/customers")
    assert r.status_code == 200
    assert len(r.json()) == 1
