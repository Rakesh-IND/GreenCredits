from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from typing import List
import base64
import uuid
import os
import shutil

import models, schemas, database
import supabase_store
from auth import get_current_organizer

router = APIRouter(prefix="/organizer", tags=["Organizer"])

def _commit_or_500(db: Session, detail: str):
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )

@router.post("/activities/upload-image")
def upload_activity_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_organizer)
):
    """
    Upload an image for an activity. Only PNG, JPG, and JPEG are supported.
    """
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG and JPG files are supported."
        )

    if database.use_supabase_store():
        content = file.file.read()
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please upload an image smaller than 2 MB."
            )
        mime_type = file.content_type or "image/jpeg"
        encoded = base64.b64encode(content).decode("ascii")
        return {"image_url": f"data:{mime_type};base64,{encoded}"}
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    static_dir = os.getenv("GREEN_CREDITS_STATIC_DIR")
    if not static_dir:
        static_dir = "/tmp/greencredits/static" if os.getenv("VERCEL") else "static"
    os.makedirs(static_dir, exist_ok=True)
    upload_path = os.path.join(static_dir, filename)
    
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image: {str(e)}"
        )
        
    static_url_prefix = os.getenv("GREEN_CREDITS_STATIC_URL_PREFIX")
    if not static_url_prefix:
        static_url_prefix = "/api/static" if os.getenv("VERCEL") else "/static"

    return {"image_url": f"{static_url_prefix.rstrip('/')}/{filename}"}

@router.post("/activities", response_model=schemas.ActivityResponse)
def create_activity(
    activity: schemas.ActivityCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """
    Create a new activity. 
    Only users with the 'organizer' role can access this endpoint.
    A dynamic QR string is automatically generated for check-ins.
    """
    qr_string = str(uuid.uuid4())

    if database.use_supabase_store():
        row = supabase_store.store.insert(
            "activities",
            {
                "title": activity.title,
                "description": activity.description,
                "location": activity.location,
                "credits_reward": activity.credits_reward,
                "qr_string": qr_string,
                "image_url": activity.image_url,
                "organizer_id": current_user.id,
                "is_active": True,
            },
        )
        return supabase_store.activity_response(row)
    
    new_activity = models.Activity(
        title=activity.title,
        description=activity.description,
        location=activity.location,
        credits_reward=activity.credits_reward,
        qr_string=qr_string,
        image_url=activity.image_url,
        organizer_id=current_user.id
    )
    db.add(new_activity)
    _commit_or_500(db, "Unable to create activity. Please try again.")
    db.refresh(new_activity)
    return new_activity

@router.get("/activities", response_model=List[schemas.ActivityResponse])
def get_organizer_activities(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """
    Get all activities created by the current organizer with their pending checkins.
    """
    if database.use_supabase_store():
        activities = supabase_store.store.select(
            "activities",
            params={"organizer_id": f"eq.{current_user.id}"},
            order="id.desc",
        )
        earned_ledgers = supabase_store.store.select(
            "ledger",
            params={"transaction_type": "eq.earned"},
        )

        response = []
        for activity in activities:
            participations = supabase_store.store.select(
                "participations",
                params={"activity_id": f"eq.{activity['id']}"},
            )
            desc = f"Earned from activity: {activity['title']}"
            awarded_user_ids = {
                ledger["user_id"]
                for ledger in earned_ledgers
                if ledger.get("description") == desc
            }
            pending_count = sum(
                1 for participation in participations
                if participation["user_id"] not in awarded_user_ids
            )

            if pending_count > 0:
                user_status = f"{pending_count} Pending"
            elif participations:
                user_status = "Up to date"
            else:
                user_status = "Available"

            response.append(supabase_store.activity_response(activity, user_status=user_status))

        return response

    activities = db.query(models.Activity).filter(
        models.Activity.organizer_id == current_user.id
    ).all()
    
    for act in activities:
        if act.organizer and act.organizer.email:
            setattr(act, "organizer_name", act.organizer.email.split('@')[0].capitalize())
        else:
            setattr(act, "organizer_name", "Unknown Organization")

        participations = db.query(models.Participation).filter(
            models.Participation.activity_id == act.id
        ).all()
        
        desc = f"Earned from activity: {act.title}"
        awarded_user_ids = {
            l.user_id for l in db.query(models.Ledger).filter(
                models.Ledger.description == desc,
                models.Ledger.transaction_type == models.TransactionType.earned
            ).all()
        }
        
        pending_count = sum(1 for p in participations if p.user_id not in awarded_user_ids)
        
        if pending_count > 0:
            setattr(act, "user_status", f"{pending_count} Pending")
        elif len(participations) > 0:
            setattr(act, "user_status", "Up to date")
        else:
            setattr(act, "user_status", "Available")
            
    return activities

@router.get("/ledger", response_model=List[schemas.LedgerResponse])
def get_organizer_ledger(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """
    Get all ledger entries for credits distributed by this organizer.
    """
    if database.use_supabase_store():
        activities = supabase_store.store.select(
            "activities",
            params={"organizer_id": f"eq.{current_user.id}"},
        )
        activity_titles = {f"Earned from activity: {activity['title']}" for activity in activities}
        if not activity_titles:
            return []

        entries = supabase_store.visible_ledger_rows(supabase_store.store.select(
            "ledger",
            params={"transaction_type": "eq.earned"},
            order="timestamp.desc",
        ))
        return [
            entry for entry in entries
            if entry.get("description") in activity_titles
        ]

    activities = db.query(models.Activity).filter(models.Activity.organizer_id == current_user.id).all()
    act_titles = [f"Earned from activity: {act.title}" for act in activities]
    
    if not act_titles:
        return []
        
    entries = db.query(models.Ledger).filter(
        models.Ledger.description.in_(act_titles),
        models.Ledger.transaction_type == models.TransactionType.earned,
        ~models.Ledger.description.like("CHAT|%")
    ).order_by(models.Ledger.timestamp.desc()).all()
    
    return entries

@router.post("/activities/{activity_id}/bulk-award")
def bulk_award_credits(
    activity_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """
    Bulk award Green Credits to all volunteers who checked into an activity.
    Verifies that the current organizer actually created the activity.
    Creates Ledger entries for each volunteer to ensure financial-grade auditability.
    """
    if database.use_supabase_store():
        activity = supabase_store.store.select_one(
            "activities",
            params={
                "id": f"eq.{activity_id}",
                "organizer_id": f"eq.{current_user.id}",
            },
        )

        if not activity:
            raise HTTPException(
                status_code=404,
                detail="Activity not found or you don't have permission to modify it."
            )

        participations = supabase_store.store.select(
            "participations",
            params={"activity_id": f"eq.{activity_id}"},
        )
        desc = f"Earned from activity: {activity['title']}"
        existing_ledgers = supabase_store.store.select(
            "ledger",
            params={
                "description": f"eq.{desc}",
                "transaction_type": "eq.earned",
            },
        )
        awarded_user_ids = {ledger["user_id"] for ledger in existing_ledgers}
        awarded_count = 0

        for participation in participations:
            if participation["user_id"] in awarded_user_ids:
                continue
            supabase_store.store.insert(
                "ledger",
                {
                    "user_id": participation["user_id"],
                    "amount": activity["credits_reward"],
                    "transaction_type": models.TransactionType.earned.value,
                    "description": desc,
                },
            )
            awarded_count += 1

        return {"msg": f"Successfully awarded credits to {awarded_count} volunteers."}

    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.organizer_id == current_user.id
    ).first()
    
    if not activity:
        raise HTTPException(
            status_code=404, 
            detail="Activity not found or you don't have permission to modify it."
        )
        
    participations = db.query(models.Participation).filter(
        models.Participation.activity_id == activity_id
    ).all()
    
    awarded_count = 0
    desc = f"Earned from activity: {activity.title}"
    
    for part in participations:
        # Check if the volunteer already received credits for this specific activity
        existing_ledger = db.query(models.Ledger).filter(
            models.Ledger.user_id == part.user_id,
            models.Ledger.description == desc,
            models.Ledger.transaction_type == models.TransactionType.earned
        ).first()
        
        if not existing_ledger:
            # Write a new record to Ledger to ensure ACID compliance and auditability
            ledger_entry = models.Ledger(
                user_id=part.user_id,
                amount=activity.credits_reward,
                transaction_type=models.TransactionType.earned,
                description=desc
            )
            db.add(ledger_entry)
            awarded_count += 1
            
    _commit_or_500(db, "Unable to award credits. Please try again.")
    return {"msg": f"Successfully awarded credits to {awarded_count} volunteers."}

@router.get("/activities/{activity_id}/volunteers", response_model=List[schemas.ManagedVolunteerResponse])
def get_activity_volunteers(
    activity_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """List volunteers who checked into an organizer-owned activity."""
    if database.use_supabase_store():
        activity = supabase_store.store.select_one(
            "activities",
            params={"id": f"eq.{activity_id}", "organizer_id": f"eq.{current_user.id}"},
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found.")

        participations = supabase_store.store.select(
            "participations",
            params={"activity_id": f"eq.{activity_id}"},
            order="check_in_time.desc",
        )
        desc = f"Earned from activity: {activity['title']}"
        awarded_ledgers = supabase_store.store.select(
            "ledger",
            params={"description": f"eq.{desc}", "transaction_type": "eq.earned"},
        )
        awarded_user_ids = {row["user_id"] for row in awarded_ledgers}

        volunteers = []
        for participation in participations:
            participant = supabase_store.get_user_by_id(participation["user_id"])
            if not participant:
                continue
            volunteers.append({
                "user_id": participant.id,
                "email": participant.email,
                "status": "Approved" if participant.id in awarded_user_ids else "Checked In",
                "check_in_time": participation.get("check_in_time"),
                "credits_reward": activity["credits_reward"],
            })
        return volunteers

    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.organizer_id == current_user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    desc = f"Earned from activity: {activity.title}"
    awarded_user_ids = {
        row.user_id for row in db.query(models.Ledger).filter(
            models.Ledger.description == desc,
            models.Ledger.transaction_type == models.TransactionType.earned
        ).all()
    }

    return [
        {
            "user_id": participation.user.id,
            "email": participation.user.email,
            "status": "Approved" if participation.user_id in awarded_user_ids else "Checked In",
            "check_in_time": participation.check_in_time,
            "credits_reward": activity.credits_reward,
        }
        for participation in db.query(models.Participation).filter(
            models.Participation.activity_id == activity_id
        ).order_by(models.Participation.check_in_time.desc()).all()
    ]

@router.post("/activities/{activity_id}/volunteers/manual-checkin")
def manual_checkin_volunteer(
    activity_id: int,
    payload: schemas.ManualCheckInRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Let an organizer check in a registered volunteer by email."""
    if database.use_supabase_store():
        activity = supabase_store.store.select_one(
            "activities",
            params={"id": f"eq.{activity_id}", "organizer_id": f"eq.{current_user.id}"},
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found.")

        volunteer = supabase_store.get_user_by_email(payload.email)
        if not volunteer or volunteer.role != models.RoleEnum.volunteer:
            raise HTTPException(status_code=404, detail="Registered volunteer not found.")

        existing = supabase_store.store.select_one(
            "participations",
            params={"activity_id": f"eq.{activity_id}", "user_id": f"eq.{volunteer.id}"},
        )
        if existing:
            return {"msg": "Volunteer is already checked in."}

        supabase_store.store.insert(
            "participations",
            {"activity_id": activity_id, "user_id": volunteer.id},
        )
        return {"msg": "Volunteer checked in successfully."}

    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.organizer_id == current_user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    volunteer = db.query(models.User).filter(
        models.User.email == payload.email,
        models.User.role == models.RoleEnum.volunteer
    ).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Registered volunteer not found.")

    existing = db.query(models.Participation).filter(
        models.Participation.activity_id == activity_id,
        models.Participation.user_id == volunteer.id
    ).first()
    if existing:
        return {"msg": "Volunteer is already checked in."}

    db.add(models.Participation(activity_id=activity_id, user_id=volunteer.id))
    _commit_or_500(db, "Unable to check in volunteer.")
    return {"msg": "Volunteer checked in successfully."}

@router.post("/activities/{activity_id}/volunteers/{user_id}/approve")
def approve_volunteer(
    activity_id: int,
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Approve a checked-in volunteer and award activity credits."""
    if database.use_supabase_store():
        activity = supabase_store.store.select_one(
            "activities",
            params={"id": f"eq.{activity_id}", "organizer_id": f"eq.{current_user.id}"},
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found.")

        participation = supabase_store.store.select_one(
            "participations",
            params={"activity_id": f"eq.{activity_id}", "user_id": f"eq.{user_id}"},
        )
        if not participation:
            raise HTTPException(status_code=400, detail="Volunteer has not checked in yet.")

        desc = f"Earned from activity: {activity['title']}"
        existing = supabase_store.store.select_one(
            "ledger",
            params={"user_id": f"eq.{user_id}", "description": f"eq.{desc}", "transaction_type": "eq.earned"},
        )
        if existing:
            return {"msg": "Volunteer was already approved."}

        supabase_store.store.insert(
            "ledger",
            {
                "user_id": user_id,
                "amount": activity["credits_reward"],
                "transaction_type": models.TransactionType.earned.value,
                "description": desc,
            },
        )
        return {"msg": "Volunteer approved and credits awarded."}

    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.organizer_id == current_user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    participation = db.query(models.Participation).filter(
        models.Participation.activity_id == activity_id,
        models.Participation.user_id == user_id
    ).first()
    if not participation:
        raise HTTPException(status_code=400, detail="Volunteer has not checked in yet.")

    desc = f"Earned from activity: {activity.title}"
    existing = db.query(models.Ledger).filter(
        models.Ledger.user_id == user_id,
        models.Ledger.description == desc,
        models.Ledger.transaction_type == models.TransactionType.earned
    ).first()
    if existing:
        return {"msg": "Volunteer was already approved."}

    db.add(models.Ledger(
        user_id=user_id,
        amount=activity.credits_reward,
        transaction_type=models.TransactionType.earned,
        description=desc,
    ))
    _commit_or_500(db, "Unable to approve volunteer.")
    return {"msg": "Volunteer approved and credits awarded."}

@router.delete("/activities/{activity_id}/volunteers/{user_id}")
def remove_volunteer(
    activity_id: int,
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Remove a volunteer check-in from an organizer-owned activity."""
    if database.use_supabase_store():
        activity = supabase_store.store.select_one(
            "activities",
            params={"id": f"eq.{activity_id}", "organizer_id": f"eq.{current_user.id}"},
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found.")

        supabase_store.store.delete(
            "participations",
            params={"activity_id": f"eq.{activity_id}", "user_id": f"eq.{user_id}"},
        )
        return {"msg": "Volunteer removed from this activity."}

    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.organizer_id == current_user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    participation = db.query(models.Participation).filter(
        models.Participation.activity_id == activity_id,
        models.Participation.user_id == user_id
    ).first()
    if participation:
        db.delete(participation)
        _commit_or_500(db, "Unable to remove volunteer.")
    return {"msg": "Volunteer removed from this activity."}

@router.post("/rewards", response_model=schemas.RewardResponse)
def create_reward(
    reward: schemas.RewardCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Create a new reward."""
    if database.use_supabase_store():
        return supabase_store.store.insert(
            "rewards",
            {
                "name": reward.name,
                "description": reward.description,
                "cost": reward.cost,
                "icon_emoji": reward.icon_emoji,
                "color_gradient": reward.color_gradient,
                "is_active": True,
                "organizer_id": current_user.id,
            },
        )

    new_reward = models.Reward(
        name=reward.name,
        description=reward.description,
        cost=reward.cost,
        icon_emoji=reward.icon_emoji,
        color_gradient=reward.color_gradient,
        organizer_id=current_user.id
    )
    db.add(new_reward)
    _commit_or_500(db, "Unable to create reward. Please try again.")
    db.refresh(new_reward)
    return new_reward

@router.get("/rewards", response_model=List[schemas.RewardResponse])
def get_organizer_rewards(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Get all rewards created by the current organizer."""
    if database.use_supabase_store():
        return supabase_store.store.select(
            "rewards",
            params={"organizer_id": f"eq.{current_user.id}"},
            order="id.desc",
        )

    return db.query(models.Reward).filter(models.Reward.organizer_id == current_user.id).all()

@router.post("/badges", response_model=schemas.BadgeResponse)
def create_badge(
    badge: schemas.BadgeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Create a new badge."""
    if database.use_supabase_store():
        return supabase_store.store.insert(
            "badges",
            {
                "name": badge.name,
                "description": badge.description,
                "icon_emoji": badge.icon_emoji,
                "required_credits": badge.required_credits,
                "organizer_id": current_user.id,
            },
        )

    new_badge = models.Badge(
        name=badge.name,
        description=badge.description,
        icon_emoji=badge.icon_emoji,
        required_credits=badge.required_credits,
        organizer_id=current_user.id
    )
    db.add(new_badge)
    _commit_or_500(db, "Unable to create badge. Please try again.")
    db.refresh(new_badge)
    return new_badge

@router.get("/badges", response_model=List[schemas.BadgeResponse])
def get_organizer_badges(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Get all badges created by the current organizer."""
    if database.use_supabase_store():
        return supabase_store.store.select(
            "badges",
            params={"organizer_id": f"eq.{current_user.id}"},
            order="id.desc",
        )

    return db.query(models.Badge).filter(models.Badge.organizer_id == current_user.id).all()
