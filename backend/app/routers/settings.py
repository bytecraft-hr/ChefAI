from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db.models import UserSettings, User
from ..schemas.settings import SettingsData
from ..dependencies import get_db
from ..services.auth import get_current_active_user

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/", response_model=SettingsData)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    s = current_user.settings
    if not s:
        return SettingsData()
    return SettingsData(
        allergies=s.allergies,
        dislikes=s.dislikes,
        preferences=s.preferences,
        favorites=s.favorites,
    )

@router.put("/", status_code=status.HTTP_204_NO_CONTENT)
def update_settings(
    payload: SettingsData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.settings:
        current_user.settings = UserSettings(user_id=current_user.id)
    for field in ("allergies", "dislikes", "preferences", "favorites"):
        setattr(current_user.settings, field, getattr(payload, field))
    db.add(current_user.settings)
    db.commit()
