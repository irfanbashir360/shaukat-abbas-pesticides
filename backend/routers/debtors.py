# backend/routers/debtors.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

@router.get("", response_model=List[schemas.DebtorOut])
def list_debtors(db: Session = Depends(get_db)):
    debtors = db.query(models.Debtor).filter(
        models.Debtor.status != models.DebtorStatus.settled
    ).all()
    return [schemas.DebtorOut(
        id=d.id, sale_id=d.sale_id, customer_id=d.customer_id,
        amount_owed=d.amount_owed, due_date=d.due_date, status=d.status,
        customer_name=d.customer.name,
        total_paid=sum(p.amount_paid for p in d.payments),
    ) for d in debtors]

@router.post("/{debtor_id}/payments", response_model=schemas.DebtorOut)
def record_payment(debtor_id: int, payload: schemas.DebtorPaymentCreate, db: Session = Depends(get_db)):
    debtor = db.query(models.Debtor).filter(models.Debtor.id == debtor_id).first()
    if not debtor: raise HTTPException(404, "Debtor not found")
    if debtor.status == models.DebtorStatus.settled:
        raise HTTPException(400, "Already settled")

    db.add(models.DebtorPayment(
        debtor_id=debtor_id, date=payload.date,
        amount_paid=payload.amount_paid, notes=payload.notes,
    ))
    db.flush()

    total_paid = sum(p.amount_paid for p in debtor.payments)
    debtor.status = (models.DebtorStatus.settled if total_paid >= debtor.amount_owed
                     else models.DebtorStatus.partially_paid)
    db.commit(); db.refresh(debtor)

    return schemas.DebtorOut(
        id=debtor.id, sale_id=debtor.sale_id, customer_id=debtor.customer_id,
        amount_owed=debtor.amount_owed, due_date=debtor.due_date, status=debtor.status,
        customer_name=debtor.customer.name,
        total_paid=sum(p.amount_paid for p in debtor.payments),
    )
