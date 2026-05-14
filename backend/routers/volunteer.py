from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

import models, schemas, database
import supabase_store
from auth import get_current_volunteer

router = APIRouter(prefix="/volunteer", tags=["Volunteer"])

@router.get("/activities/nearby", response_model=List[schemas.ActivityResponse])
def get_nearby_activities(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_volunteer)
):
    """
    Get nearby activities. 
    Returns all active activities with user-specific status (Available, Checked In, or Finished).
    """
    if database.use_supabase_store():
        activities = supabase_store.store.select(
            "activities",
            params={"is_active": "eq.true"},
            order="id.desc",
        )
        participations = supabase_store.store.select(
            "participations",
            params={"user_id": f"eq.{current_user.id}"},
        )
        part_activity_ids = {row["activity_id"] for row in participations}
        ledgers = supabase_store.store.select(
            "ledger",
            params={
                "user_id": f"eq.{current_user.id}",
                "transaction_type": "eq.earned",
            },
        )
        earned_titles = {
            row["description"].replace("Earned from activity: ", "")
            for row in ledgers
            if row.get("description", "").startswith("Earned from activity: ")
        }

        response = []
        for activity in activities:
            if activity["title"] in earned_titles:
                user_status = "Finished"
            elif activity["id"] in part_activity_ids:
                user_status = "Checked In"
            else:
                user_status = "Available"
            response.append(supabase_store.activity_response(activity, user_status=user_status))

        return response

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
    if database.use_supabase_store():
        activity = supabase_store.store.select_one(
            "activities",
            params={
                "qr_string": f"eq.{checkin_data.qr_string}",
                "is_active": "eq.true",
            },
        )

        if not activity:
            raise HTTPException(
                status_code=400,
                detail="Invalid QR code string or the activity is no longer active."
            )

        existing_participation = supabase_store.store.select_one(
            "participations",
            params={
                "user_id": f"eq.{current_user.id}",
                "activity_id": f"eq.{activity['id']}",
            },
        )

        if existing_participation:
            raise HTTPException(
                status_code=400,
                detail="You have already checked into this activity."
            )

        supabase_store.store.insert(
            "participations",
            {
                "user_id": current_user.id,
                "activity_id": activity["id"],
            },
        )
        return {"msg": "Successfully checked in! Waiting for organizer to award credits."}

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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="You have already checked into this activity."
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete check-in. Please try again."
        )
    
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
    if database.use_supabase_store():
        rows = supabase_store.store.select(
            "ledger",
            params={"user_id": f"eq.{current_user.id}"},
            order="timestamp.desc",
        )
        return supabase_store.visible_ledger_rows(rows)

    entries = db.query(models.Ledger).filter(
        models.Ledger.user_id == current_user.id,
        ~models.Ledger.description.like("CHAT|%")
    ).order_by(models.Ledger.timestamp.desc()).all()
    return entries

@router.get("/leaderboard", response_model=List[schemas.LeaderboardResponse])
def get_leaderboard(db: Session = Depends(database.get_db)):
    """
    Get the top volunteers ranked by their total accumulated credits.
    """
    if database.use_supabase_store():
        volunteers = supabase_store.store.select(
            "users",
            params={"role": "eq.volunteer"},
        )
        ledgers = supabase_store.store.select("ledger")

        processed = []
        for user in volunteers:
            user_ledgers = [row for row in ledgers if row["user_id"] == user["id"]]
            earned = sum(
                float(row["amount"])
                for row in user_ledgers
                if row["transaction_type"] == models.TransactionType.earned.value
            )
            redeemed = sum(
                float(row["amount"])
                for row in user_ledgers
                if row["transaction_type"] == models.TransactionType.redeemed.value
            )
            processed.append({
                "id": user["id"],
                "email": user["email"],
                "total_credits": earned - redeemed,
            })

        processed.sort(key=lambda item: item["total_credits"], reverse=True)
        for index, row in enumerate(processed):
            row["rank"] = index + 1

        return processed[:50]

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
    if database.use_supabase_store():
        return supabase_store.store.select(
            "rewards",
            params={"is_active": "eq.true"},
            order="id.desc",
        )

    return db.query(models.Reward).filter(models.Reward.is_active == True).all()

@router.get("/badges", response_model=List[schemas.BadgeResponse])
def get_available_badges(db: Session = Depends(database.get_db)):
    """Get all available badges."""
    if database.use_supabase_store():
        return supabase_store.store.select("badges", order="id.desc")

    return db.query(models.Badge).all()

class RedeemRequest(BaseModel):
    reward_id: int

def reward_redemption_description(reward_id: int, reward_name: str) -> str:
    return f"Redeemed reward #{reward_id}: {reward_name}"

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
    if database.use_supabase_store():
        reward = supabase_store.store.select_one(
            "rewards",
            params={
                "id": f"eq.{payload.reward_id}",
                "is_active": "eq.true",
            },
        )

        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found or inactive")

        balance = supabase_store.ledger_balance(current_user.id)
        cost = float(reward["cost"])

        if balance < cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient credits. You need {cost:.0f} credits but only have {balance:.0f}."
            )

        redemption_prefix = f"Redeemed reward #{payload.reward_id}:"
        existing_redemption = supabase_store.store.select_one(
            "ledger",
            params={
                "user_id": f"eq.{current_user.id}",
                "transaction_type": "eq.redeemed",
                "description": f"like.{redemption_prefix}*",
            },
        )

        if existing_redemption:
            raise HTTPException(
                status_code=400,
                detail="You have already redeemed this reward."
            )

        supabase_store.store.insert(
            "ledger",
            {
                "user_id": current_user.id,
                "amount": cost,
                "transaction_type": models.TransactionType.redeemed.value,
                "description": reward_redemption_description(payload.reward_id, reward["name"]),
            },
        )
        return {
            "msg": f"Successfully redeemed '{reward['name']}'!",
            "remaining_credits": balance - cost,
        }

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

    redemption_prefix = f"Redeemed reward #{payload.reward_id}:"
    existing_redemption = db.query(models.Ledger).filter(
        models.Ledger.user_id == current_user.id,
        models.Ledger.transaction_type == models.TransactionType.redeemed,
        models.Ledger.description.like(f"{redemption_prefix}%")
    ).first()

    if existing_redemption:
        raise HTTPException(
            status_code=400,
            detail="You have already redeemed this reward."
        )
    
    # Write immutable ledger entry for the redemption
    entry = models.Ledger(
        user_id=current_user.id,
        amount=reward.cost,
        transaction_type=models.TransactionType.redeemed,
        description=reward_redemption_description(payload.reward_id, reward.name)
    )
    db.add(entry)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to redeem reward. Please try again."
        )
    
    remaining = balance - reward.cost
    return {
        "msg": f"Successfully redeemed '{reward.name}'!",
        "remaining_credits": remaining
    }
