# backend/routers/sales.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

@router.post("", response_model=schemas.SaleOut, status_code=201)
def create_sale(payload: schemas.SaleCreate, db: Session = Depends(get_db)):
    # Validate all stock BEFORE making any changes
    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        if product.current_stock < item_data.quantity:
            raise HTTPException(400,
                f"Insufficient stock for {product.name}: "
                f"available {product.current_stock}, requested {item_data.quantity}")

    total = sum(i.quantity * i.unit_price for i in payload.items)
    sale = models.Sale(
        date=payload.date, customer_id=payload.customer_id,
        total_amount=total, notes=payload.notes,
    )
    db.add(sale); db.flush()

    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        db.add(models.SaleItem(
            sale_id=sale.id, product_id=item_data.product_id,
            quantity=item_data.quantity, unit_price=item_data.unit_price,
        ))
        product.current_stock -= item_data.quantity
        db.add(models.StockMovement(
            product_id=item_data.product_id, date=payload.date,
            movement_type=models.MovementType.sale, quantity_change=-item_data.quantity,
            reference_id=sale.id, reference_type="sale",
        ))

    db.commit(); db.refresh(sale)
    return sale

@router.put("/{sale_id}", response_model=schemas.SaleOut)
def update_sale(sale_id: int, payload: schemas.SaleCreate, db: Session = Depends(get_db)):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale: raise HTTPException(404, "Sale not found")
    if sale.is_voided: raise HTTPException(400, "Cannot edit a voided sale")

    # Restore stock from old items
    for item in sale.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.current_stock += item.quantity

    # Validate new items have enough stock (after restoration)
    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        if product.current_stock < item_data.quantity:
            raise HTTPException(400,
                f"Insufficient stock for {product.name}: "
                f"available {product.current_stock}, requested {item_data.quantity}")

    # Remove old items and their stock movements
    for item in list(sale.items):
        db.delete(item)
    db.query(models.StockMovement).filter(
        models.StockMovement.reference_id == sale_id,
        models.StockMovement.reference_type == "sale",
        models.StockMovement.movement_type == models.MovementType.sale,
    ).delete()

    # Update sale header
    sale.date = payload.date
    sale.customer_id = payload.customer_id
    sale.notes = payload.notes
    sale.total_amount = sum(i.quantity * i.unit_price for i in payload.items)
    db.flush()

    # Add new items and deduct stock
    for item_data in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
        db.add(models.SaleItem(
            sale_id=sale.id, product_id=item_data.product_id,
            quantity=item_data.quantity, unit_price=item_data.unit_price,
        ))
        product.current_stock -= item_data.quantity
        db.add(models.StockMovement(
            product_id=item_data.product_id, date=payload.date,
            movement_type=models.MovementType.sale, quantity_change=-item_data.quantity,
            reference_id=sale.id, reference_type="sale",
        ))

    db.commit(); db.refresh(sale)
    return sale

@router.get("", response_model=List[schemas.SaleOut])
def list_sales(db: Session = Depends(get_db)):
    return db.query(models.Sale).order_by(models.Sale.date.desc()).all()

@router.post("/{sale_id}/void", response_model=schemas.SaleOut)
def void_sale(sale_id: int, payload: schemas.VoidRequest, db: Session = Depends(get_db)):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale: raise HTTPException(404, "Sale not found")
    if sale.is_voided: raise HTTPException(400, "Already voided")

    sale.is_voided = True
    sale.void_reason = payload.void_reason

    for item in sale.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        product.current_stock += item.quantity
        db.add(models.StockMovement(
            product_id=item.product_id, date=datetime.now(timezone.utc),
            movement_type=models.MovementType.void_sale, quantity_change=item.quantity,
            reference_id=sale.id, reference_type="sale",
        ))

    db.commit(); db.refresh(sale)
    return sale
