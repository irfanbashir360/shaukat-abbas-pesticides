# backend/routers/settings.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()

def _get_or_create(db: Session) -> models.InvoiceAlertSettings:
    s = db.query(models.InvoiceAlertSettings).first()
    if not s:
        s = models.InvoiceAlertSettings()
        db.add(s); db.commit(); db.refresh(s)
    return s

@router.get("", response_model=schemas.SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _get_or_create(db)

@router.put("", response_model=schemas.SettingsOut)
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    s = _get_or_create(db)
    s.payment_due_alert_days = payload.payment_due_alert_days
    s.validity_expiry_alert_days = payload.validity_expiry_alert_days
    db.commit(); db.refresh(s)
    return s
