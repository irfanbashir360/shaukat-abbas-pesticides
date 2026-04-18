# backend/routers/settings.py
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db, get_data_dir
import models, schemas

router = APIRouter()

MAX_LOGO_BYTES = 5 * 1024 * 1024  # 5 MB

def _get_biz(db: Session) -> models.BusinessSettings:
    s = db.query(models.BusinessSettings).first()
    if not s:
        s = models.BusinessSettings()
        db.add(s); db.commit(); db.refresh(s)
    return s

def _get_alerts(db: Session) -> models.InvoiceAlertSettings:
    s = db.query(models.InvoiceAlertSettings).first()
    if not s:
        s = models.InvoiceAlertSettings()
        db.add(s); db.commit(); db.refresh(s)
    return s

def _combined_out(biz: models.BusinessSettings, alerts: models.InvoiceAlertSettings) -> dict:
    return {
        "id": biz.id,
        "business_name": biz.business_name,
        "tagline": biz.tagline,
        "address": biz.address,
        "phone": biz.phone,
        "email": biz.email,
        "ntn": biz.ntn,
        "strn": biz.strn,
        "bank_name": biz.bank_name,
        "bank_account": biz.bank_account,
        "bank_iban": biz.bank_iban,
        "footer_note": biz.footer_note,
        "logo_filename": biz.logo_filename,
        "payment_due_alert_days": alerts.payment_due_alert_days,
        "validity_expiry_alert_days": alerts.validity_expiry_alert_days,
    }

@router.get("", response_model=schemas.CombinedSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _combined_out(_get_biz(db), _get_alerts(db))

@router.put("", response_model=schemas.CombinedSettingsOut)
def update_settings(payload: schemas.CombinedSettingsUpdate, db: Session = Depends(get_db)):
    biz = _get_biz(db)
    alerts = _get_alerts(db)
    for field in ["business_name", "tagline", "address", "phone", "email",
                  "ntn", "strn", "bank_name", "bank_account", "bank_iban", "footer_note"]:
        setattr(biz, field, getattr(payload, field))
    alerts.payment_due_alert_days = payload.payment_due_alert_days
    alerts.validity_expiry_alert_days = payload.validity_expiry_alert_days
    db.commit(); db.refresh(biz); db.refresh(alerts)
    return _combined_out(biz, alerts)

@router.post("/logo")
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(400, "Logo file must be under 5MB")
    logo_path = os.path.join(get_data_dir(), "logo.png")
    with open(logo_path, "wb") as f:
        f.write(data)
    biz = _get_biz(db)
    biz.logo_filename = "logo.png"
    db.commit()
    return {"ok": True}

@router.delete("/logo")
def delete_logo(db: Session = Depends(get_db)):
    logo_path = os.path.join(get_data_dir(), "logo.png")
    if os.path.exists(logo_path):
        os.remove(logo_path)
    biz = _get_biz(db)
    biz.logo_filename = None
    db.commit()
    return {"ok": True}

@router.get("/logo")
def get_logo():
    logo_path = os.path.join(get_data_dir(), "logo.png")
    if not os.path.exists(logo_path):
        raise HTTPException(404, "No logo uploaded")
    return FileResponse(logo_path, media_type="image/png")
