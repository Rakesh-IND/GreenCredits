import models, database
from sqlalchemy.orm import Session

db = database.SessionLocal()

try:
    # Clear everything except Users
    db.query(models.Ledger).delete()
    db.query(models.Participation).delete()
    db.query(models.Activity).delete()
    db.commit()

    # Reset 100 credits to everyone
    users = db.query(models.User).all()
    for u in users:
        seed_ledger = models.Ledger(
            user_id=u.id,
            amount=100.0,
            transaction_type=models.TransactionType.earned,
            description="Welcome Bonus"
        )
        db.add(seed_ledger)
    db.commit()
    print("Database activities, participations, and ledger reset. 100 credits awarded to all users.")
finally:
    db.close()
