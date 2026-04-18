# backend/routers/units.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()

DEFAULT_UNITS = ["kg", "gram", "litre", "ml", "bag", "bottle", "dozen", "piece", "ton", "box"]

def seed_units(db: Session):
    existing = {u.name for u in db.query(models.Unit).all()}
    for name in DEFAULT_UNITS:
        if name not in existing:
            db.add(models.Unit(name=name))
    db.commit()

@router.get("", response_model=List[schemas.UnitOut])
def list_units(db: Session = Depends(get_db)):
    return db.query(models.Unit).order_by(models.Unit.name).all()

@router.post("", response_model=schemas.UnitOut, status_code=201)
def create_unit(payload: schemas.UnitCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Unit name cannot be empty")
    existing = db.query(models.Unit).filter(models.Unit.name == name).first()
    if existing:
        raise HTTPException(400, f"Unit '{name}' already exists")
    u = models.Unit(name=name)
    db.add(u); db.commit(); db.refresh(u)
    return u

@router.delete("/{unit_id}", status_code=204)
def delete_unit(unit_id: int, db: Session = Depends(get_db)):
    u = db.query(models.Unit).filter(models.Unit.id == unit_id).first()
    if not u:
        raise HTTPException(404, "Unit not found")
    count = db.query(models.Product).filter(models.Product.unit == u.name).count()
    if count > 0:
        raise HTTPException(400, f"Unit '{u.name}' is in use by {count} product(s)")
    db.delete(u); db.commit()
