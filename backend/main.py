from fastapi import FastAPI, Depends, HTTPException, status
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import models, database, auth, schemas
import supabase_store
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

if not database.use_supabase_store():
    models.Base.metadata.create_all(bind=database.engine)

# Ensure static files directory exists
STATIC_DIR = os.getenv("GREEN_CREDITS_STATIC_DIR")
if not STATIC_DIR:
    STATIC_DIR = "/tmp/greencredits/static" if os.getenv("VERCEL") else "static"
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.middleware("http")
async def normalize_api_prefix_for_local_routes(request, call_next):
    path = request.scope.get("path", "")
    if not request.scope.get("root_path") and path.startswith("/api/"):
        request.scope["path"] = path.removeprefix("/api")
    return await call_next(request)

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

@app.post("/auth/register", response_model=schemas.UserResponse, tags=["Authentication"])
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """Register a new user as either a volunteer or an organizer."""
    if database.use_supabase_store():
        db_user = supabase_store.get_user_by_email(user.email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        new_user = supabase_store.create_user(
            email=user.email,
            hashed_password=auth.get_password_hash(user.password),
            role=user.role,
        )
        supabase_store.ensure_welcome_bonus(new_user.id)
        return new_user

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

@app.post("/auth/login", response_model=schemas.Token, tags=["Authentication"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    """Login to receive a JWT access token."""
    if database.use_supabase_store():
        user = supabase_store.get_user_by_email(form_data.username)
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

@app.post("/auth/supabase", response_model=schemas.Token, tags=["Authentication"])
def login_with_supabase(
    payload: schemas.SupabaseAuthRequest,
    db: Session = Depends(database.get_db)
):
    """Exchange a verified Supabase session, including Google OAuth sessions, for an API token."""
    supabase_user = auth.verify_supabase_token(payload.access_token)
    email = supabase_user.get("email")
    supabase_user_id = supabase_user.get("id", "unknown")

    if not email:
        raise HTTPException(status_code=400, detail="Supabase user has no email address.")

    if database.use_supabase_store():
        user = supabase_store.get_user_by_email(email)
        if not user:
            user = supabase_store.create_user(
                email=email,
                hashed_password=f"supabase:{supabase_user_id}",
                role=payload.role,
            )
            supabase_store.ensure_welcome_bonus(user.id)

        access_token = auth.create_access_token(
            data={"sub": user.email, "role": user.role.value}
        )
        return {"access_token": access_token, "token_type": "bearer"}

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            hashed_password=f"supabase:{supabase_user_id}",
            role=payload.role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        db.add(models.Ledger(
            user_id=user.id,
            amount=100.0,
            transaction_type=models.TransactionType.earned,
            description="Welcome Bonus"
        ))
        db.commit()

    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserProfile, tags=["Users"])
def read_users_me(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get the current user's profile and calculated total credits from the ledger."""
    if database.use_supabase_store():
        return supabase_store.user_profile(current_user)

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

@app.get("/activities/all", response_model=List[schemas.ActivityResponse], tags=["Activities"])
def get_all_activities(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get all active activities for the map view. Accessible to any authenticated user."""
    if database.use_supabase_store():
        activities = supabase_store.store.select(
            "activities",
            params={"is_active": "eq.true"},
            order="id.desc",
        )
        return [
            supabase_store.activity_response(activity, user_status="Available")
            for activity in activities
        ]

    activities = db.query(models.Activity).filter(models.Activity.is_active == True).all()
    for act in activities:
        setattr(act, "user_status", "Available")
    return activities
