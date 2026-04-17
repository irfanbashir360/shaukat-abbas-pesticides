# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from main import app

TEST_URL = "sqlite://"   # in-memory, wiped between tests
engine = create_engine(
    TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    def override():
        db = TestingSession()
        try:
            yield db
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def product(client):
    """Create a fertilizer product with 100 units of stock."""
    r = client.post("/api/products", json={
        "name": "Urea", "category": "fertilizer",
        "unit": "kg", "price_per_unit": 50.0,
        "current_stock": 100.0, "low_stock_threshold": 10.0
    })
    return r.json()

@pytest.fixture
def supplier(client):
    r = client.post("/api/suppliers", json={"name": "Ali Traders", "phone": "0300-1234567", "address": "Lahore"})
    return r.json()

@pytest.fixture
def customer(client):
    r = client.post("/api/customers", json={"name": "Ahmad Farm", "phone": "0311-9876543", "address": "Multan"})
    return r.json()
