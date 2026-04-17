# backend/tests/test_settings.py
def test_get_settings_returns_defaults(client):
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert r.json()["payment_due_alert_days"] == 3
    assert r.json()["validity_expiry_alert_days"] == 7

def test_update_settings(client):
    r = client.put("/api/settings", json={"payment_due_alert_days": 5, "validity_expiry_alert_days": 14})
    assert r.status_code == 200
    assert r.json()["payment_due_alert_days"] == 5
