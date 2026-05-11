from fastapi import FastAPI, Depends, HTTPException, status
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import models, database, auth, schemas
from routers import organizer, volunteer
from config import settings

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title="Green Credits API",
    description="Dual-sided marketplace web platform incentivizing community volunteering.",
    version="1.0.0"
)

models.Base.metadata.create_all(bind=database.engine)

# Ensure static files directory exists
STATIC_DIR = os.getenv("GREEN_CREDITS_STATIC_DIR", "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core routers for strict RBAC isolation
app.include_router(organizer.router)
app.include_router(volunteer.router)

@app.post("/api/auth/register", response_model=schemas.UserResponse, tags=["Authentication"])
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """Register a new user as either a volunteer or an organizer."""
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Pre-seed 100 credits as a welcome bonus!
    seed_ledger = models.Ledger(
        user_id=new_user.id,
        amount=100.0,
        transaction_type=models.TransactionType.earned,
        description="Welcome Bonus"
    )
    db.add(seed_ledger)
    db.commit()
    
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token, tags=["Authentication"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    """Login to receive a JWT access token."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=schemas.UserProfile, tags=["Users"])
def read_users_me(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get the current user's profile and calculated total credits from the ledger."""
    if current_user.role == models.RoleEnum.organizer:
        activities = db.query(models.Activity).filter(models.Activity.organizer_id == current_user.id).all()
        act_titles = [f"Earned from activity: {act.title}" for act in activities]
        if act_titles:
            ledgers = db.query(models.Ledger).filter(
                models.Ledger.description.in_(act_titles),
                models.Ledger.transaction_type == models.TransactionType.earned
            ).all()
            total = sum(l.amount for l in ledgers)
        else:
            total = 0.0
        setattr(current_user, "total_credits", total)
    else:
        ledgers = db.query(models.Ledger).filter(models.Ledger.user_id == current_user.id).all()
        total = sum(l.amount if l.transaction_type == models.TransactionType.earned else -l.amount for l in ledgers)
        setattr(current_user, "total_credits", total)
        
    return current_user

@app.get("/api/activities/all", response_model=List[schemas.ActivityResponse], tags=["Activities"])
def get_all_activities(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get all active activities for the map view. Accessible to any authenticated user."""
    activities = db.query(models.Activity).filter(models.Activity.is_active == True).all()
    for act in activities:
        setattr(act, "user_status", "Available")
    return activities
