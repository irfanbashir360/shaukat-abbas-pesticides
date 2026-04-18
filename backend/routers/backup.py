# backend/routers/backup.py
import os
import io
import zipfile
from datetime import date
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from database import get_data_dir, engine

router = APIRouter()

@router.get("/export")
def export_backup():
    data_dir = get_data_dir()
    db_path = os.path.join(data_dir, "inventory.db")
    logo_path = os.path.join(data_dir, "logo.png")

    if not os.path.exists(db_path):
        raise HTTPException(404, "No database found to backup")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(db_path, "inventory.db")
        if os.path.exists(logo_path):
            zf.write(logo_path, "logo.png")
    buf.seek(0)

    filename = f"sap-backup-{date.today().isoformat()}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/import")
async def import_backup(file: UploadFile = File(...)):
    data = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise HTTPException(400, "Invalid backup file — not a valid zip")

    names = zf.namelist()
    if "inventory.db" not in names:
        raise HTTPException(400, "Invalid backup file — missing inventory.db")

    data_dir = get_data_dir()
    db_path = os.path.join(data_dir, "inventory.db")
    logo_path = os.path.join(data_dir, "logo.png")

    # Close all DB connections before replacing the file
    engine.dispose()

    # Write new DB
    with open(db_path, "wb") as f:
        f.write(zf.read("inventory.db"))

    # Write logo if present
    if "logo.png" in names:
        with open(logo_path, "wb") as f:
            f.write(zf.read("logo.png"))

    return {"ok": True, "message": "Backup restored successfully"}
