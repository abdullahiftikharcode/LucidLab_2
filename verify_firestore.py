import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Path to your service account key
# Found at: tests/campuspulse0-firebase-adminsdk-2eh7o-07e503166b.json
cred_path = r"C:\Users\jivot\Documents\EduXR-main\tests\campuspulse0-firebase-adminsdk-2eh7o-07e503166b.json"

try:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print("--- Firestore Audit ---")
    
    experiments_ref = db.collection("experiments")
    experiments = list(experiments_ref.stream())
    
    if not experiments:
        print("No experiments found in the 'experiments' collection.")
    else:
        for exp in experiments:
            exp_id = exp.id
            print(f"\nExperiment: {exp_id}")
            
            # List scenes for this experiment
            scenes_ref = db.collection(f"experiments/{exp_id}/scenes")
            scenes = list(scenes_ref.stream())
            
            if not scenes:
                print("  (No scenes found)")
            else:
                for scene in scenes:
                    print(f"  - Scene: {scene.id}")
                    if scene.id.lower() == "cool":
                        print("    >>> FOUND 'cool' scene here!")

except Exception as e:
    print(f"Error: {e}")
    print("\nMake sure you have installed the firebase-admin library:")
    print("pip install firebase-admin")
