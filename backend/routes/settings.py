"""Settings routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.models import get_db, Settings
from backend.models.schemas import SettingsOut, SettingsBulkUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=List[SettingsOut])
def get_settings(db: Session = Depends(get_db)):
    return db.query(Settings).all()


@router.post("")
def update_settings(payload: SettingsBulkUpdate, db: Session = Depends(get_db)):
    for k, v in payload.settings.items():
        s = db.query(Settings).filter_by(key=k).first()
        if s:
            s.value = str(v)
        else:
            db.add(Settings(key=k, value=str(v)))
    db.commit()
    return {"status": "ok"}
