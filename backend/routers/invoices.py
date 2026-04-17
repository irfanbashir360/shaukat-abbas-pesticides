# backend/routers/invoices.py
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

def _next_invoice_number(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"SAP-{year}-"
    last = (db.query(models.Invoice)
            .filter(models.Invoice.invoice_number.like(f"{prefix}%"))
            .order_by(models.Invoice.id.desc()).first())
    seq = (int(last.invoice_number.split("-")[-1]) + 1) if last else 1
    return f"{prefix}{seq:04d}"

@router.post("", response_model=schemas.InvoiceOut, status_code=201)
def create_invoice(payload: schemas.InvoiceCreate, db: Session = Depends(get_db)):
    sale = db.query(models.Sale).filter(models.Sale.id == payload.sale_id).first()
    if not sale: raise HTTPException(404, "Sale not found")
    if sale.invoice: raise HTTPException(400, "Invoice already exists for this sale")
    inv = models.Invoice(
        sale_id=payload.sale_id,
        invoice_number=_next_invoice_number(db),
        issued_date=datetime.now(timezone.utc),
        payment_due_date=payload.payment_due_date,
        validity_expiry_date=payload.validity_expiry_date,
    )
    db.add(inv); db.commit(); db.refresh(inv)
    return inv

@router.get("", response_model=List[schemas.InvoiceOut])
def list_invoices(db: Session = Depends(get_db)):
    return db.query(models.Invoice).order_by(models.Invoice.issued_date.desc()).all()

@router.get("/{invoice_id}", response_model=schemas.InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    return inv

@router.post("/{invoice_id}/mark-paid", response_model=schemas.InvoiceOut)
def mark_paid(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    inv.is_paid = True; db.commit(); db.refresh(inv)
    return inv

@router.post("/{invoice_id}/dismiss-payment-alert", response_model=schemas.InvoiceOut)
def dismiss_payment_alert(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    inv.payment_alert_dismissed = True; db.commit(); db.refresh(inv)
    return inv

@router.post("/{invoice_id}/dismiss-validity-alert", response_model=schemas.InvoiceOut)
def dismiss_validity_alert(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    inv.validity_alert_dismissed = True; db.commit(); db.refresh(inv)
    return inv

@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    # pdf_generator imported here to avoid WeasyPrint import errors during testing
    from pdf_generator import generate_invoice_pdf
    pdf_bytes = generate_invoice_pdf(inv)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={inv.invoice_number}.pdf"})
