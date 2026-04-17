# backend/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
from database import get_db
import models, schemas

router = APIRouter()

@router.get("", response_model=schemas.DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

    today_sales = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= today_start, models.Sale.date <= today_end,
        models.Sale.is_voided == False).scalar() or 0.0

    month_sales = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= month_start, models.Sale.is_voided == False).scalar() or 0.0

    month_purchases = db.query(func.sum(models.Purchase.total_amount)).filter(
        models.Purchase.date >= month_start, models.Purchase.is_voided == False).scalar() or 0.0

    low_stock = db.query(models.Product).filter(
        models.Product.current_stock <= models.Product.low_stock_threshold).all()

    creditors = db.query(models.Creditor).filter(
        models.Creditor.status != models.CreditorStatus.settled).all()
    total_paid_all = sum(sum(p.amount_paid for p in c.payments) for c in creditors)
    total_owed = max(0.0, sum(c.amount_owed for c in creditors) - total_paid_all)
    overdue_count = sum(1 for c in creditors if c.due_date < datetime.now(timezone.utc))

    settings = db.query(models.InvoiceAlertSettings).first()
    pay_days = settings.payment_due_alert_days if settings else 3
    val_days = settings.validity_expiry_alert_days if settings else 7
    now = datetime.now(timezone.utc)

    payment_alerts = db.query(models.Invoice).filter(
        models.Invoice.is_paid == False,
        models.Invoice.payment_alert_dismissed == False,
        models.Invoice.payment_due_date <= now + timedelta(days=pay_days),
    ).all()

    validity_alerts = db.query(models.Invoice).filter(
        models.Invoice.validity_alert_dismissed == False,
        models.Invoice.validity_expiry_date <= now + timedelta(days=val_days),
    ).all()

    return schemas.DashboardSummary(
        today_sales=today_sales, month_sales=month_sales,
        month_purchases=month_purchases, net_profit=month_sales - month_purchases,
        low_stock_products=[schemas.ProductOut.model_validate(p) for p in low_stock],
        creditors_total_owed=total_owed, creditors_overdue_count=overdue_count,
        payment_due_alerts=[schemas.InvoiceOut.model_validate(i) for i in payment_alerts],
        validity_expiry_alerts=[schemas.InvoiceOut.model_validate(i) for i in validity_alerts],
    )
