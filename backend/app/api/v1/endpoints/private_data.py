from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.private_data import UserPrivateData
from backend.app.models.user import User
from backend.app.schemas.private_data import PrivateDataSync

router = APIRouter()


def _require_sync_enabled(user: User) -> None:
    if not user.settings or not user.settings.private_sync_enabled:
        raise HTTPException(status_code=403, detail="Enable private data sync in Settings first.")


@router.get("/private-data", response_model=PrivateDataSync)
def get_private_data(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    _require_sync_enabled(user)
    record = db.get(UserPrivateData, user.id)
    if not record:
        return PrivateDataSync()
    return PrivateDataSync(
        banjaEntries=record.banja_entries,
        banjaTombstones=record.banja_tombstones,
        dailyRhythm=record.daily_rhythm,
        wellbeingCheckins=record.wellbeing_checkins,
    )


@router.put("/private-data", response_model=PrivateDataSync)
def sync_private_data(
    payload: PrivateDataSync,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    _require_sync_enabled(user)
    # Serialize merges for this account so simultaneous devices don't overwrite
    # each other's journal entries or deletion markers on PostgreSQL.
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    record = db.get(UserPrivateData, user.id)
    if not record:
        record = UserPrivateData(user_id=user.id)
        db.add(record)
        db.flush()

    tombstones = dict(record.banja_tombstones or {})
    for entry_id, deleted_at in payload.banjaTombstones.items():
        tombstones[entry_id] = max(tombstones.get(entry_id, 0), deleted_at)

    entries = {entry["id"]: entry for entry in (record.banja_entries or [])}
    for entry_model in payload.banjaEntries:
        entry = entry_model.model_dump()
        deleted_at = tombstones.get(entry["id"], -1)
        if deleted_at >= entry["updatedAt"]:
            entries.pop(entry["id"], None)
            continue
        previous = entries.get(entry["id"])
        if not previous or entry["updatedAt"] >= previous.get("updatedAt", 0):
            entries[entry["id"]] = entry

    rhythm = dict(record.daily_rhythm or {})
    for date_key, day_model in payload.dailyRhythm.items():
        incoming = day_model.model_dump()
        previous = rhythm.get(date_key, {})
        sessions = max(previous.get("focusSessions", 0), incoming["focusSessions"])
        rhythm[date_key] = {
            "focusSessions": sessions,
            "focusSeconds": max(previous.get("focusSeconds", 0), incoming["focusSeconds"]),
            "restHonored": bool(not sessions and (previous.get("restHonored") or incoming["restHonored"])),
            "updatedAt": max(previous.get("updatedAt", 0), incoming["updatedAt"]),
        }

    record.banja_entries = sorted(entries.values(), key=lambda entry: entry.get("updatedAt", 0), reverse=True)
    record.banja_tombstones = tombstones
    record.daily_rhythm = rhythm
    wellbeing = dict(record.wellbeing_checkins or {})
    for date_key, checkin_model in payload.wellbeingCheckins.items():
        incoming = checkin_model.model_dump()
        previous = wellbeing.get(date_key)
        if not previous or incoming["updatedAt"] > previous.get("updatedAt", 0):
            wellbeing[date_key] = incoming
    record.wellbeing_checkins = wellbeing
    db.commit()
    return PrivateDataSync(
        banjaEntries=record.banja_entries,
        banjaTombstones=record.banja_tombstones,
        dailyRhythm=record.daily_rhythm,
        wellbeingCheckins=record.wellbeing_checkins,
    )


@router.delete("/private-data", status_code=204)
def delete_private_data(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    record = db.get(UserPrivateData, user.id)
    if record:
        db.delete(record)
        db.commit()
    return Response(status_code=204)
