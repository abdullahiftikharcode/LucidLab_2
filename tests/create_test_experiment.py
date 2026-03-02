import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import sys

# Initialize Firebase Admin SDK
# Note: You MUST provide the path to your Firebase Admin SDK service account key JSON file.
# You can generate this in the Firebase Console: Project Settings -> Service Accounts -> Generate new private key.
# This is DIFFERENT from the google-services.json used by Unity.
SERVICE_ACCOUNT_KEY_PATH = "campuspulse0-firebase-adminsdk-2eh7o-07e503166b.json"

try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Error initializing Firebase. Did you set SERVICE_ACCOUNT_KEY_PATH?\nError: {e}")
    sys.exit(1)

db = firestore.client()

print("Connected to Firestore. Creating test experiment...")

# 1. Create the base experiment document
experiment_ref = db.collection('experiments').document('Test AR Experiment')
experiment_ref.set({
    # Add any top-level metadata here if needed
    'description': 'A test experiment created via Python script for AR testing'
})

# 2. Create the first scene (scene0) inside the scenes subcollection
scene0_ref = experiment_ref.collection('scenes').document('scene0')
scene0_ref.set({
    'name': 'Intro Scene',
    'description': 'Tap the cube to begin!',
    'index': 0
})

# 3. Create a 3D object inside the objects subcollection of scene0
object_ref = scene0_ref.collection('objects').document() # Auto-ID
object_ref.set({
    'objectName': 'Magic Cube',
    'objectType': 'cube',
    'color': '#00FF00',
    'showDesc': True,
    'hasGravity': False,
    'isGrabbable': True,
    'markerId': 'marker_01', # MUST match an image name in your XR Reference Image Library
    'position': [0, 0, 0],
    'rotation': [0, 0, 0],
    'scale': [0.1, 0.1, 0.1]
})

print("✅ Successfully created 'Test AR Experiment' in Firestore!")
print("Run the EduARPlayer in Unity -> StartupScene to see the button appear.")
