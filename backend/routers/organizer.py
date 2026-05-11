from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
import shutil

import models, schemas, database
from auth import get_current_organizer

router = APIRouter(prefix="/api/organizer", tags=["Organizer"])

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
    db.commit()
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
    activities = db.query(models.Activity).filter(models.Activity.organizer_id == current_user.id).all()
    act_titles = [f"Earned from activity: {act.title}" for act in activities]
    
    if not act_titles:
        return []
        
    entries = db.query(models.Ledger).filter(
        models.Ledger.description.in_(act_titles),
        models.Ledger.transaction_type == models.TransactionType.earned
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
            
    db.commit()
    return {"msg": f"Successfully awarded credits to {awarded_count} volunteers."}

@router.post("/rewards", response_model=schemas.RewardResponse)
def create_reward(
    reward: schemas.RewardCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Create a new reward."""
    new_reward = models.Reward(
        name=reward.name,
        description=reward.description,
        cost=reward.cost,
        icon_emoji=reward.icon_emoji,
        color_gradient=reward.color_gradient,
        organizer_id=current_user.id
    )
    db.add(new_reward)
    db.commit()
    db.refresh(new_reward)
    return new_reward

@router.get("/rewards", response_model=List[schemas.RewardResponse])
def get_organizer_rewards(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Get all rewards created by the current organizer."""
    return db.query(models.Reward).filter(models.Reward.organizer_id == current_user.id).all()

@router.post("/badges", response_model=schemas.BadgeResponse)
def create_badge(
    badge: schemas.BadgeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Create a new badge."""
    new_badge = models.Badge(
        name=badge.name,
        description=badge.description,
        icon_emoji=badge.icon_emoji,
        required_credits=badge.required_credits,
        organizer_id=current_user.id
    )
    db.add(new_badge)
    db.commit()
    db.refresh(new_badge)
    return new_badge

@router.get("/badges", response_model=List[schemas.BadgeResponse])
def get_organizer_badges(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_organizer)
):
    """Get all badges created by the current organizer."""
    return db.query(models.Badge).filter(models.Badge.organizer_id == current_user.id).all()
