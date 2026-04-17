# backend/routers/reports.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from database import get_db
import models

router = APIRouter()

@router.get("/sales")
def sales_report(date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
                 category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Sale).filter(models.Sale.is_voided == False)
    if date_from: q = q.filter(models.Sale.date >= date_from)
    if date_to:   q = q.filter(models.Sale.date <= date_to)
    result = []
    for sale in q.all():
        for item in sale.items:
            if category and item.product.category.value != category:
                continue
            result.append({
                "date": sale.date.isoformat(), "customer": sale.customer.name,
                "product": item.product.name, "category": item.product.category.value,
                "quantity": item.quantity, "unit_price": item.unit_price,
                "total": item.quantity * item.unit_price,
            })
    return result

@router.get("/purchases")
def purchases_report(date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
                     supplier_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Purchase).filter(models.Purchase.is_voided == False)
    if date_from:   q = q.filter(models.Purchase.date >= date_from)
    if date_to:     q = q.filter(models.Purchase.date <= date_to)
    if supplier_id: q = q.filter(models.Purchase.supplier_id == supplier_id)
    result = []
    for purchase in q.all():
        for item in purchase.items:
            result.append({
                "date": purchase.date.isoformat(), "supplier": purchase.supplier.name,
                "product": item.product.name, "category": item.product.category.value,
                "quantity": item.quantity, "unit_price": item.unit_price,
                "total": item.quantity * item.unit_price,
                "payment_type": purchase.payment_type.value,
            })
    return result

@router.get("/stock")
def stock_report(db: Session = Depends(get_db)):
    return [{"id": p.id, "name": p.name, "category": p.category.value, "unit": p.unit,
             "current_stock": p.current_stock, "low_stock_threshold": p.low_stock_threshold,
             "is_low": p.current_stock <= p.low_stock_threshold, "price_per_unit": p.price_per_unit}
            for p in db.query(models.Product).all()]

@router.get("/creditors")
def creditors_report(db: Session = Depends(get_db)):
    return [{"supplier": c.supplier.name, "amount_owed": c.amount_owed,
             "total_paid": sum(p.amount_paid for p in c.payments),
             "balance": c.amount_owed - sum(p.amount_paid for p in c.payments),
             "due_date": c.due_date.isoformat(), "status": c.status.value}
            for c in db.query(models.Creditor).all()]
