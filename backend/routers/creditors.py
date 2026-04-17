# backend/routers/creditors.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

@router.get("", response_model=List[schemas.CreditorOut])
def list_creditors(db: Session = Depends(get_db)):
    creditors = db.query(models.Creditor).filter(
        models.Creditor.status != models.CreditorStatus.settled
    ).all()
    return [schemas.CreditorOut(
        id=c.id, supplier_id=c.supplier_id, purchase_id=c.purchase_id,
        amount_owed=c.amount_owed, due_date=c.due_date, status=c.status,
        supplier_name=c.supplier.name,
        total_paid=sum(p.amount_paid for p in c.payments),
    ) for c in creditors]

@router.post("/{creditor_id}/payments", response_model=schemas.CreditorOut)
def record_payment(creditor_id: int, payload: schemas.CreditorPaymentCreate, db: Session = Depends(get_db)):
    creditor = db.query(models.Creditor).filter(models.Creditor.id == creditor_id).first()
    if not creditor: raise HTTPException(404, "Creditor not found")
    if creditor.status == models.CreditorStatus.settled:
        raise HTTPException(400, "Already settled")

    db.add(models.CreditorPayment(
        creditor_id=creditor_id, date=payload.date,
        amount_paid=payload.amount_paid, notes=payload.notes,
    ))
    db.flush()

    total_paid = sum(p.amount_paid for p in creditor.payments)
    creditor.status = (models.CreditorStatus.settled if total_paid >= creditor.amount_owed
                       else models.CreditorStatus.partially_paid)
    db.commit(); db.refresh(creditor)

    return schemas.CreditorOut(
        id=creditor.id, supplier_id=creditor.supplier_id, purchase_id=creditor.purchase_id,
        amount_owed=creditor.amount_owed, due_date=creditor.due_date, status=creditor.status,
        supplier_name=creditor.supplier.name,
        total_paid=sum(p.amount_paid for p in creditor.payments),
    )
