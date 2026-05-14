import base64
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models, schemas, database
import supabase_store
from auth import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])


def _encode_message(message: str) -> str:
    return base64.urlsafe_b64encode(message.encode("utf-8")).decode("ascii")


def _decode_message(value: str) -> str:
    try:
        return base64.urlsafe_b64decode(value.encode("ascii")).decode("utf-8")
    except Exception:
        return ""


def _chat_prefix(activity_id: int) -> str:
    return f"CHAT|{activity_id}|"


def _chat_description(activity_id: int, message: str) -> str:
    return f"{_chat_prefix(activity_id)}{_encode_message(message)}"


def _can_access_activity_sql(db: Session, activity_id: int, user: models.User) -> models.Activity:
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    if user.role == models.RoleEnum.organizer and activity.organizer_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not manage this activity.")

    return activity


def _can_access_activity_supabase(activity_id: int, user) -> dict:
    activity = supabase_store.store.select_one("activities", params={"id": f"eq.{activity_id}"})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    if user.role == models.RoleEnum.organizer and activity["organizer_id"] != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not manage this activity.")

    return activity


@router.get("/activities/{activity_id}/messages", response_model=List[schemas.ChatMessageResponse])
def get_activity_messages(
    activity_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Get activity chat messages for organizers and volunteers."""
    if database.use_supabase_store():
        _can_access_activity_supabase(activity_id, current_user)
        rows = supabase_store.store.select(
            "ledger",
            params={"description": f"like.{_chat_prefix(activity_id)}*"},
            order="timestamp.asc",
        )

        messages = []
        for row in rows:
            sender = supabase_store.get_user_by_id(row["user_id"])
            if not sender:
                continue
            encoded = row["description"].replace(_chat_prefix(activity_id), "", 1)
            messages.append({
                "id": row["id"],
                "activity_id": activity_id,
                "sender_id": sender.id,
                "sender_email": sender.email,
                "sender_role": sender.role.value,
                "message": _decode_message(encoded),
                "timestamp": row["timestamp"],
                "is_mine": sender.id == current_user.id,
            })
        return messages

    _can_access_activity_sql(db, activity_id, current_user)
    rows = db.query(models.Ledger).filter(
        models.Ledger.description.like(f"{_chat_prefix(activity_id)}%")
    ).order_by(models.Ledger.timestamp.asc()).all()

    messages = []
    for row in rows:
        sender = db.query(models.User).filter(models.User.id == row.user_id).first()
        if not sender:
            continue
        encoded = row.description.replace(_chat_prefix(activity_id), "", 1)
        messages.append({
            "id": row.id,
            "activity_id": activity_id,
            "sender_id": sender.id,
            "sender_email": sender.email,
            "sender_role": sender.role.value,
            "message": _decode_message(encoded),
            "timestamp": row.timestamp or datetime.utcnow(),
            "is_mine": sender.id == current_user.id,
        })
    return messages


@router.post("/activities/{activity_id}/messages", response_model=schemas.ChatMessageResponse)
def send_activity_message(
    activity_id: int,
    payload: schemas.ChatMessageCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Send an activity chat message."""
    if database.use_supabase_store():
        _can_access_activity_supabase(activity_id, current_user)
        row = supabase_store.store.insert(
            "ledger",
            {
                "user_id": current_user.id,
                "amount": 0,
                "transaction_type": models.TransactionType.earned.value,
                "description": _chat_description(activity_id, payload.message.strip()),
            },
        )
        return {
            "id": row["id"],
            "activity_id": activity_id,
            "sender_id": current_user.id,
            "sender_email": current_user.email,
            "sender_role": current_user.role.value,
            "message": payload.message.strip(),
            "timestamp": row["timestamp"],
            "is_mine": True,
        }

    _can_access_activity_sql(db, activity_id, current_user)
    entry = models.Ledger(
        user_id=current_user.id,
        amount=0,
        transaction_type=models.TransactionType.earned,
        description=_chat_description(activity_id, payload.message.strip()),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "activity_id": activity_id,
        "sender_id": current_user.id,
        "sender_email": current_user.email,
        "sender_role": current_user.role.value,
        "message": payload.message.strip(),
        "timestamp": entry.timestamp or datetime.utcnow(),
        "is_mine": True,
    }
