import uuid
import database
import models

def seed_activities():
    db = database.SessionLocal()
    
    # Get the first organizer
    organizer = db.query(models.User).filter(models.User.role == models.RoleEnum.organizer).first()
    
    if not organizer:
        print("No organizer found in the DB. Please create one first!")
        return

    activities = [
        "Tree plantation drive",
        "Park or beach cleanup",
        "Roadside trash collection",
        "Public space beautification",
        "Old-age home visit and assistance",
        "Orphanage support activity",
        "Blood donation camp support",
        "Food distribution drive",
        "School supply donation drive",
        "Teaching or tutoring session for underprivileged children",
        "Community health awareness campaign",
        "Water conservation or lake-cleaning drive",
        "Recycling and waste-segregation campaign",
        "Clothes donation and sorting drive",
        "Event photography / volunteer documentation support"
    ]
    
    for idx, title in enumerate(activities):
        reward = 100 + (idx % 3) * 50
        
        act = models.Activity(
            title=title,
            description=f"Join us for the {title} and make a tangible impact in our community.",
            location="Chennai, IN",
            credits_reward=reward,
            is_active=True,
            qr_string=str(uuid.uuid4()),
            organizer_id=organizer.id
        )
        db.add(act)
    
    db.commit()
    print(f"Successfully seeded {len(activities)} activities for organizer {organizer.email}!")
    db.close()

if __name__ == "__main__":
    seed_activities()
