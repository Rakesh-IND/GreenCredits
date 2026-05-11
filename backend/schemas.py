from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from models import RoleEnum, TransactionType

# --- User Schemas --- #
class UserBase(BaseModel):
    email: EmailStr
    role: RoleEnum

class UserCreate(UserBase):
    password: str

class SupabaseAuthRequest(BaseModel):
    access_token: str
    role: RoleEnum = RoleEnum.volunteer

class UserResponse(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class UserProfile(UserResponse):
    total_credits: float

class LeaderboardResponse(BaseModel):
    id: int
    email: str
    total_credits: float
    rank: int

    model_config = ConfigDict(from_attributes=True)

# --- Activity Schemas --- #
class ActivityBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Title of the activity")
    description: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=200) # Optional matching DB schema
    credits_reward: float = Field(..., gt=0, description="Credits must be greater than 0")
    image_url: Optional[str] = Field(None, description="Optional image URL for the activity")

class ActivityCreate(ActivityBase):
    pass

class ActivityResponse(ActivityBase):
    id: int
    is_active: bool
    qr_string: str
    organizer_id: int
    organizer_name: Optional[str] = None
    user_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Reward Schemas --- #
class RewardBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    cost: float = Field(..., gt=0)
    icon_emoji: str = Field(..., max_length=10)
    color_gradient: str = Field(..., max_length=100)

class RewardCreate(RewardBase):
    pass

class RewardResponse(RewardBase):
    id: int
    is_active: bool
    organizer_id: int

    model_config = ConfigDict(from_attributes=True)

# --- Badge Schemas --- #
class BadgeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon_emoji: str = Field(..., max_length=10)
    required_credits: float = Field(..., ge=0)

class BadgeCreate(BadgeBase):
    pass

class BadgeResponse(BadgeBase):
    id: int
    organizer_id: int

    model_config = ConfigDict(from_attributes=True)

# --- Check-in Schema --- #
class CheckInRequest(BaseModel):
    qr_string: str = Field(..., min_length=10, description="The QR code string must be valid")

# --- Ledger/Participation Schemas --- #
class LedgerResponse(BaseModel):
    id: int
    amount: float
    transaction_type: TransactionType
    timestamp: datetime
    description: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class ParticipationResponse(BaseModel):
    activity_id: int
    check_in_time: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Token Schema --- #
class Token(BaseModel):
    access_token: str
    token_type: str
