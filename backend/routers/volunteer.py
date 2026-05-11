from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

import models, schemas, database
from auth import get_current_volunteer

router = APIRouter(prefix="/api/volunteer", tags=["Volunteer"])

@router.get("/activities/nearby", response_model=List[schemas.ActivityResponse])
def get_nearby_activities(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_volunteer)
):
    """
    Get nearby activities. 
    Returns all active activities with user-specific status (Available, Checked In, or Finished).
    """
    activities = db.query(models.Activity).filter(models.Activity.is_active == True).all()
    
    # Pre-fetch user participations and ledgers to determine status
    participations = db.query(models.Participation).filter(
        models.Participation.user_id == current_user.id
    ).all()
    part_activity_ids = {p.activity_id for p in participations}
    
    ledgers = db.query(models.Ledger).filter(
        models.Ledger.user_id == current_user.id,
        models.Ledger.transaction_type == models.TransactionType.earned
    ).all()
    earned_titles = {
        l.description.replace("Earned from activity: ", "") 
        for l in ledgers if l.description and l.description.startswith("Earned from activity: ")
    }
    
    # Calculate user_status and organizer_name for each activity
    for act in activities:
        # Populate organizer_name
        if act.organizer and act.organizer.email:
            setattr(act, "organizer_name", act.organizer.email.split('@')[0].capitalize())
        else:
            setattr(act, "organizer_name", "Unknown Organization")

        if act.title in earned_titles:
            setattr(act, "user_status", "Finished")
        elif act.id in part_activity_ids:
            setattr(act, "user_status", "Checked In")
        else:
            setattr(act, "user_status", "Available")
            
    return activities

@router.post("/checkin")
def qr_checkin(
    checkin_data: schemas.CheckInRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_volunteer)
):
    """
    Endpoint for volunteers to check in using a QR string.
    Validates the string, checks if the activity is active, and ensures no duplicate check-ins.
    """
    activity = db.query(models.Activity).filter(
        models.Activity.qr_string == checkin_data.qr_string,
        models.Activity.is_active == True
    ).first()
    
    if not activity:
        raise HTTPException(
            status_code=400, 
            detail="Invalid QR code string or the activity is no longer active."
        )
        
    # Prevent duplicate check-ins
    existing_participation = db.query(models.Participation).filter(
        models.Participation.user_id == current_user.id,
        models.Participation.activity_id == activity.id
    ).first()
    
    if existing_participation:
        raise HTTPException(
            status_code=400,
            detail="You have already checked into this activity."
        )
        
    # Record participation
    participation = models.Participation(
        user_id=current_user.id,
        activity_id=activity.id
    )
    db.add(participation)
    db.commit()
    
    return {"msg": "Successfully checked in! Waiting for organizer to award credits."}

@router.get("/ledger", response_model=List[schemas.LedgerResponse])
def get_ledger_history(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_volunteer)
):
    """
    Get the financial-grade ledger history for the volunteer.
    These are immutable transactions of earned and redeemed credits.
    """
    entries = db.query(models.Ledger).filter(
        models.Ledger.user_id == current_user.id
    ).order_by(models.Ledger.timestamp.desc()).all()
    return entries

@router.get("/leaderboard", response_model=List[schemas.LeaderboardResponse])
def get_leaderboard(db: Session = Depends(database.get_db)):
    """
    Get the top volunteers ranked by their total accumulated credits.
    """
    volunteers = db.query(models.User).filter(models.User.role == models.RoleEnum.volunteer).all()
    
    processed = []
    for user in volunteers:
        earned = sum(l.amount for l in user.ledger_entries if l.transaction_type == models.TransactionType.earned)
        redeemed = sum(l.amount for l in user.ledger_entries if l.transaction_type == models.TransactionType.redeemed)
        total = earned - redeemed
        processed.append({
            "id": user.id,
            "email": user.email,
            "total_credits": total
        })
        
    # Sort by total credits descending
    processed.sort(key=lambda x: x["total_credits"], reverse=True)
    
    # Assign ranks
    for index, data in enumerate(processed):
        data["rank"] = index + 1
        
    return processed[:50]


@router.get("/rewards", response_model=List[schemas.RewardResponse])
def get_available_rewards(db: Session = Depends(database.get_db)):
    """Get all active rewards available for redemption."""
    return db.query(models.Reward).filter(models.Reward.is_active == True).all()

@router.get("/badges", response_model=List[schemas.BadgeResponse])
def get_available_badges(db: Session = Depends(database.get_db)):
    """Get all available badges."""
    return db.query(models.Badge).all()

class RedeemRequest(BaseModel):
    reward_id: int

@router.post("/redeem")
def redeem_reward(
    payload: RedeemRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_volunteer)
):
    """
    Redeem a reward by deducting credits from the volunteer's balance.
    Validates sufficient balance before proceeding.
    """
    # Look up the reward from the database to ensure the cost is accurate
    reward = db.query(models.Reward).filter(
        models.Reward.id == payload.reward_id,
        models.Reward.is_active == True
    ).first()
    
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found or inactive")

    # Calculate real balance from the immutable ledger
    ledgers = db.query(models.Ledger).filter(models.Ledger.user_id == current_user.id).all()
    balance = sum(
        l.amount if l.transaction_type == models.TransactionType.earned else -l.amount
        for l in ledgers
    )
    
    if balance < reward.cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient credits. You need {reward.cost} credits but only have {balance:.0f}."
        )
    
    # Write immutable ledger entry for the redemption
    entry = models.Ledger(
        user_id=current_user.id,
        amount=reward.cost,
        transaction_type=models.TransactionType.redeemed,
        description=f"Redeemed reward: {reward.name}"
    )
    db.add(entry)
    db.commit()
    
    remaining = balance - reward.cost
    return {
        "msg": f"Successfully redeemed '{reward.name}'!",
        "remaining_credits": remaining
    }
