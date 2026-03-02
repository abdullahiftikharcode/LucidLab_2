import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json

# Path to your service account key
cred_path = r"C:\Users\jivot\Documents\EduXR-main\tests\campuspulse0-firebase-adminsdk-2eh7o-07e503166b.json"

def print_structure(obj, indent=0):
    """Recursively print structure of a dict/list, showing types and sample values"""
    prefix = "  " * indent
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, (dict, list)):
                print(f"{prefix}{key}: {type(value).__name__}")
                print_structure(value, indent + 1)
            else:
                print(f"{prefix}{key}: {type(value).__name__} = {repr(value)[:50]}")
    elif isinstance(obj, list):
        print(f"{prefix}[list with {len(obj)} items]")
        if obj:
            print(f"{prefix}  [0]:")
            print_structure(obj[0], indent + 2)

try:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print("=" * 80)
    print("FIRESTORE DOCUMENT STRUCTURE COMPARISON")
    print("=" * 80)
    
    # Compare the two experiments
    experiments_to_compare = ["Test AR Experiment", "test-experiment"]
    
    for exp_id in experiments_to_compare:
        print(f"\n\n{'='*40}")
        print(f"EXPERIMENT: '{exp_id}'")
        print(f"{'='*40}")
        
        # Get experiment document
        exp_ref = db.collection("experiments").document(exp_id)
        exp_doc = exp_ref.get()
        
        if not exp_doc.exists:
            print(f"  ❌ Experiment document not found!")
            continue
            
        exp_data = exp_doc.to_dict()
        print(f"\n📄 Experiment Document Fields:")
        print_structure(exp_data)
        
        # Get scenes subcollection
        scenes_ref = exp_ref.collection("scenes")
        scenes = list(scenes_ref.stream())
        
        print(f"\n📁 Scenes Subcollection ({len(scenes)} scenes):")
        
        for scene in scenes:
            scene_data = scene.to_dict()
            print(f"\n  🔹 Scene: '{scene.id}'")
            print(f"     Fields:")
            print_structure(scene_data, 3)
            
            # Get objects subcollection
            objects_ref = scene.reference.collection("objects")
            objects = list(objects_ref.stream())
            
            print(f"\n     📦 Objects Subcollection ({len(objects)} objects):")
            
            for i, obj in enumerate(objects[:3]):  # Show first 3 objects
                obj_data = obj.to_dict()
                print(f"\n       [{i}] Object: '{obj.id}'")
                print_structure(obj_data, 5)
                
            if len(objects) > 3:
                print(f"\n       ... and {len(objects) - 3} more objects")
    
    print("\n\n" + "=" * 80)
    print("ANALYSIS: Key Differences to Check")
    print("=" * 80)
    print("""
1. FIELD NAMES: Check if frontend uses camelCase vs Python uses snake_case
   - Unity expects: objectName, objectType, position, rotation, scale
   - Check if frontend sends: object_name, object_type, etc.

2. DATA TYPES: 
   - position/rotation/scale should be objects/maps with x, y, z fields
   - Check if they're arrays [x, y, z] instead

3. NESTED STRUCTURE:
   - scenes/{scene}/objects/{object} should have consistent fields
   - color: string like "#FF0000" or "red"
   - hasGravity, isGrabbable, showDesc: boolean values

4. MARKERS ARRAY:
   - Should be at experiment level: scenes/{scene} has 'markers' field
   - Each marker: { id, name, imageUrl }
    """)
    
    # Detailed comparison of a single object from each
    print("\n" + "=" * 80)
    print("SIDE-BY-SIDE OBJECT COMPARISON")
    print("=" * 80)
    
    for exp_id in experiments_to_compare:
        exp_ref = db.collection("experiments").document(exp_id)
        scenes = list(exp_ref.collection("scenes").stream())
        if scenes:
            objects = list(scenes[0].reference.collection("objects").limit(1).stream())
            if objects:
                print(f"\n{exp_id} - First object raw JSON:")
                print(json.dumps(objects[0].to_dict(), indent=2, default=str))

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
