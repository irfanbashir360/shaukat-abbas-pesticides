# backend/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from database import engine, SessionLocal
import models

from routers import (products, suppliers, customers, purchases,
                     sales, invoices, creditors, debtors, dashboard, reports, settings,
                     units, backup)

models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        # Migrate: add new columns to sales table if they don't exist
        with engine.connect() as conn:
            for sql in [
                "ALTER TABLE sales ADD COLUMN payment_type VARCHAR DEFAULT 'cash'",
                "ALTER TABLE sales ADD COLUMN amount_paid_upfront FLOAT DEFAULT 0.0",
                "ALTER TABLE sales ADD COLUMN due_date DATETIME",
            ]:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                except OperationalError:
                    pass  # Column already exists
        units.seed_units(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Shaukat Abbas Pesticides Inventory", lifespan=lifespan)

app.include_router(products.router,   prefix="/api/products",   tags=["products"])
app.include_router(suppliers.router,  prefix="/api/suppliers",  tags=["suppliers"])
app.include_router(customers.router,  prefix="/api/customers",  tags=["customers"])
app.include_router(purchases.router,  prefix="/api/purchases",  tags=["purchases"])
app.include_router(sales.router,      prefix="/api/sales",      tags=["sales"])
app.include_router(invoices.router,   prefix="/api/invoices",   tags=["invoices"])
app.include_router(creditors.router,  prefix="/api/creditors",  tags=["creditors"])
app.include_router(debtors.router,    prefix="/api/debtors",    tags=["debtors"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["dashboard"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["reports"])
app.include_router(settings.router,   prefix="/api/settings",   tags=["settings"])
app.include_router(units.router,      prefix="/api/units",      tags=["units"])
app.include_router(backup.router,     prefix="/api/backup",     tags=["backup"])

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
