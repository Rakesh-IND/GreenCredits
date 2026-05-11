import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class RoleEnum(str, enum.Enum):
    volunteer = "volunteer"
    organizer = "organizer"

class TransactionType(str, enum.Enum):
    earned = "earned"
    redeemed = "redeemed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    
    # Relationships
    activities_created = relationship("Activity", back_populates="organizer")
    participations = relationship("Participation", back_populates="user")
    ledger_entries = relationship("Ledger", back_populates="user")

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    credits_reward = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Dynamic QR string for checking in
    qr_string = Column(String, unique=True, index=True, nullable=False)
    image_url = Column(String, nullable=True)
    
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    organizer = relationship("User", back_populates="activities_created")
    participations = relationship("Participation", back_populates="activity")

class Participation(Base):
    __tablename__ = "participations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    check_in_time = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="participations")
    activity = relationship("Activity", back_populates="participations")

class Ledger(Base):
    __tablename__ = "ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)  # Amount to add or subtract
    transaction_type = Column(Enum(TransactionType), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="ledger_entries")

class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    cost = Column(Float, nullable=False)
    icon_emoji = Column(String, nullable=False, default="🎁")
    color_gradient = Column(String, nullable=False, default="from-emerald-500 to-teal-500")
    is_active = Column(Boolean, default=True)
    
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organizer = relationship("User")

class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    icon_emoji = Column(String, nullable=False, default="🏆")
    required_credits = Column(Float, nullable=False)
    
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organizer = relationship("User")
