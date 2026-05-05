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
    today_end   = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)

    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    if today.month == 1:
        prev_month_start = datetime(today.year - 1, 12, 1, tzinfo=timezone.utc)
        prev_month_end   = datetime(today.year, 1, 1, tzinfo=timezone.utc)
    else:
        prev_month_start = datetime(today.year, today.month - 1, 1, tzinfo=timezone.utc)
        prev_month_end   = month_start

    today_sales = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= today_start, models.Sale.date <= today_end,
        models.Sale.is_voided == False).scalar() or 0.0

    month_sales = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= month_start, models.Sale.is_voided == False).scalar() or 0.0

    monthly_sales_prev = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= prev_month_start,
        models.Sale.date < prev_month_end,
        models.Sale.is_voided == False).scalar() or 0.0

    month_purchases = db.query(func.sum(models.Purchase.total_amount)).filter(
        models.Purchase.date >= month_start,
        models.Purchase.is_voided == False).scalar() or 0.0

    # Products
    product_count = db.query(func.count(models.Product.id)).scalar() or 0
    low_stock = db.query(models.Product).filter(
        models.Product.current_stock <= models.Product.low_stock_threshold).all()

    # Creditors
    creditors = db.query(models.Creditor).filter(
        models.Creditor.status != models.CreditorStatus.settled).all()
    cred_paid = sum(sum(p.amount_paid for p in c.payments) for c in creditors)
    cred_owed = max(0.0, sum(c.amount_owed for c in creditors) - cred_paid)
    now_naive = datetime.now()
    overdue_count = sum(1 for c in creditors if c.due_date and c.due_date < now_naive)

    # Debtors
    debtors = db.query(models.Debtor).filter(
        models.Debtor.status != models.DebtorStatus.settled).all()
    debt_paid = sum(sum(p.amount_paid for p in d.payments) for d in debtors)
    debt_owed = max(0.0, sum(d.amount_owed for d in debtors) - debt_paid)

    # Invoice alerts
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

    # Daily sales — last 30 calendar days (including today)
    thirty_days_ago = datetime.combine(today - timedelta(days=29), datetime.min.time()).replace(tzinfo=timezone.utc)
    sales_in_range = db.query(models.Sale).filter(
        models.Sale.date >= thirty_days_ago,
        models.Sale.is_voided == False,
    ).all()

    # Build a dict keyed by date string
    daily_map: dict = {}
    for sale in sales_in_range:
        sale_date = sale.date
        if sale_date.tzinfo is None:
            sale_date = sale_date.replace(tzinfo=timezone.utc)
        key = sale_date.astimezone(timezone.utc).strftime("%Y-%m-%d")
        daily_map[key] = daily_map.get(key, 0.0) + sale.total_amount

    daily_sales = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        daily_sales.append(schemas.DailySalesPoint(date=key, total=daily_map.get(key, 0.0)))

    return schemas.DashboardSummary(
        today_sales=today_sales,
        month_sales=month_sales,
        monthly_sales_prev=monthly_sales_prev,
        month_purchases=month_purchases,
        net_profit=month_sales - month_purchases,
        product_count=product_count,
        low_stock_products=[schemas.ProductOut.model_validate(p) for p in low_stock],
        creditors_total_owed=cred_owed,
        creditors_overdue_count=overdue_count,
        debtors_total_owed=debt_owed,
        payment_due_alerts=[schemas.InvoiceOut.model_validate(i) for i in payment_alerts],
        validity_expiry_alerts=[schemas.InvoiceOut.model_validate(i) for i in validity_alerts],
        daily_sales=daily_sales,
    )
