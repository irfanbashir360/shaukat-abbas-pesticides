# backend/routers/purchases.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

@router.post("", response_model=schemas.PurchaseOut, status_code=201)
def create_purchase(payload: schemas.PurchaseCreate, db: Session = Depends(get_db)):
    if payload.payment_type == models.PaymentType.credit and not payload.due_date:
        raise HTTPException(400, "due_date required for credit purchases")

    total = sum(i.quantity * i.unit_price for i in payload.items)
    purchase = models.Purchase(
        date=payload.date, supplier_id=payload.supplier_id,
        payment_type=payload.payment_type, total_amount=total, notes=payload.notes,
    )
    db.add(purchase); db.flush()

    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        db.add(models.PurchaseItem(
            purchase_id=purchase.id, product_id=item_data.product_id,
            quantity=item_data.quantity, unit_price=item_data.unit_price,
        ))
        product.current_stock += item_data.quantity
        db.add(models.StockMovement(
            product_id=item_data.product_id, date=payload.date,
            movement_type=models.MovementType.purchase, quantity_change=item_data.quantity,
            reference_id=purchase.id, reference_type="purchase",
        ))

    if payload.payment_type == models.PaymentType.credit:
        db.add(models.Creditor(
            supplier_id=payload.supplier_id, purchase_id=purchase.id,
            amount_owed=total, due_date=payload.due_date,
            status=models.CreditorStatus.outstanding,
        ))

    db.commit(); db.refresh(purchase)
    return purchase

@router.get("", response_model=List[schemas.PurchaseOut])
def list_purchases(db: Session = Depends(get_db)):
    return db.query(models.Purchase).order_by(models.Purchase.date.desc()).all()

@router.post("/{purchase_id}/void", response_model=schemas.PurchaseOut)
def void_purchase(purchase_id: int, payload: schemas.VoidRequest, db: Session = Depends(get_db)):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if not purchase: raise HTTPException(404, "Purchase not found")
    if purchase.is_voided: raise HTTPException(400, "Already voided")

    purchase.is_voided = True
    purchase.void_reason = payload.void_reason

    for item in purchase.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        product.current_stock -= item.quantity
        db.add(models.StockMovement(
            product_id=item.product_id, date=datetime.now(timezone.utc),
            movement_type=models.MovementType.void_purchase, quantity_change=-item.quantity,
            reference_id=purchase.id, reference_type="purchase",
        ))

    if purchase.creditor:
        purchase.creditor.status = models.CreditorStatus.settled

    db.commit(); db.refresh(purchase)
    return purchase
