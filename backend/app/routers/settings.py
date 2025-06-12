from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm.attributes import flag_modified

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

@router.put("/", response_model=SettingsData)
def update_settings(
    payload: SettingsData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        print(">>> PUT /settings pozvan")
        print("Primljeni payload:", payload.dict())

        if not current_user.settings:
            print(">>> Kreiram nove postavke za korisnika:", current_user.id)

            settings_obj = UserSettings(
                user_id=current_user.id,
                allergies=payload.allergies,
                dislikes=payload.dislikes,
                preferences=payload.preferences,
                favorites=payload.favorites
            )

            # Ne koristimo current_user.settings = settings_obj zbog session konflikta
            merged = db.merge(settings_obj)
            db.commit()
            db.refresh(merged)

            print("→ Nakon spremanja:", merged.dislikes)
            return payload

        else:
            print(">>> Ažuriram postojeće postavke")

            # Eksplicitno dohvaćamo settings iz baze
            settings_obj = db.query(UserSettings).filter_by(user_id=current_user.id).first()
            if not settings_obj:
                raise HTTPException(status_code=404, detail="Postavke nisu pronađene.")

            for field in ("allergies", "dislikes", "preferences", "favorites"):
                new_value = getattr(payload, field)
                setattr(settings_obj, field, new_value)
                flag_modified(settings_obj, field)
                print(f"→ Postavljam {field} = {new_value}")

            print("→ Prije commit: ", settings_obj.dislikes)
            db.commit()
            db.refresh(settings_obj)
            print("→ Nakon commit: ", settings_obj.dislikes)

            return payload

    except SQLAlchemyError as e:
        print(f"[GREŠKA SQLAlchemy]: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Greška u bazi prilikom spremanja postavki.")
    except Exception as e:
        print(f"[GREŠKA @update_settings]: {e}")
        raise HTTPException(status_code=500, detail="Greška prilikom spremanja postavki.")
