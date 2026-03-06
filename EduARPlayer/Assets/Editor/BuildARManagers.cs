using UnityEditor;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using Assets.Interaction;

public class BuildARManagers {
    [MenuItem("Tools/Configure AR Managers")]
    public static void Configure() {
        // CRITICAL: AR Foundation requires ALL trackable managers (Image, Plane, Raycast)
        // to be on the SAME GameObject that has the functioning XROrigin with a camera.
        // That is "XR Origin (Mobile AR)", NOT "CoreGameObject".
        
        // Step 1: Find the real XR Origin by locating ARTrackedImageManager
        var imageManager = Object.FindFirstObjectByType<ARTrackedImageManager>();
        if (imageManager == null) {
            Debug.LogError("[BuildARManagers] ARTrackedImageManager not found in scene! Cannot configure.");
            return;
        }

        // Enable moving image tracking so it updates continuously instead of freezing
        imageManager.requestedMaxNumberOfMovingImages = 4;
        
        GameObject xrOriginGo = imageManager.gameObject;
        Debug.Log($"[BuildARManagers] Found ARTrackedImageManager on '{xrOriginGo.name}'. Adding plane/raycast/anchor managers here.");

        // Step 2: Remove any wrongly-placed managers from CoreGameObject
        var coreGo = GameObject.Find("CoreGameObject");
        if (coreGo != null) {
            var wrongPlane = coreGo.GetComponent<ARPlaneManager>();
            if (wrongPlane != null) {
                Debug.Log("[BuildARManagers] Removing wrongly-placed ARPlaneManager from CoreGameObject.");
                Object.DestroyImmediate(wrongPlane);
            }
            var wrongRaycast = coreGo.GetComponent<ARRaycastManager>();
            if (wrongRaycast != null) {
                Debug.Log("[BuildARManagers] Removing wrongly-placed ARRaycastManager from CoreGameObject.");
                Object.DestroyImmediate(wrongRaycast);
            }
            var wrongAnchor = coreGo.GetComponent<ARAnchorManager>();
            if (wrongAnchor != null) {
                Debug.Log("[BuildARManagers] Removing wrongly-placed ARAnchorManager from CoreGameObject.");
                Object.DestroyImmediate(wrongAnchor);
            }
        }

        // Step 3: Add ARPlaneManager to the correct XR Origin
        var planeManager = xrOriginGo.GetComponent<ARPlaneManager>();
        if (planeManager == null) {
            planeManager = xrOriginGo.AddComponent<ARPlaneManager>();
            Debug.Log("[BuildARManagers] Added ARPlaneManager to XR Origin.");
        }

        // Step 4: Create an AR Plane Prefab if it doesn't exist
        string prefabPath = "Assets/Prefabs/CustomARPlane.prefab";
        GameObject planePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
        
        if (planePrefab == null) {
            if (!AssetDatabase.IsValidFolder("Assets/Prefabs")) {
                AssetDatabase.CreateFolder("Assets", "Prefabs");
            }
            if (!AssetDatabase.IsValidFolder("Assets/Materials")) {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }

            GameObject tempGo = new GameObject("CustomARPlane");
            tempGo.AddComponent<ARPlane>();
            tempGo.AddComponent<MeshFilter>();
            var meshRenderer = tempGo.AddComponent<MeshRenderer>();
            var lineRenderer = tempGo.AddComponent<LineRenderer>();
            tempGo.AddComponent<ARPlaneMeshVisualizer>();
            
            Material planeMat = new Material(Shader.Find("Sprites/Default"));
            planeMat.color = new Color(0.2f, 0.8f, 0.2f, 0.3f); // Translucent green
            AssetDatabase.CreateAsset(planeMat, "Assets/Materials/ARPlaneMaterial.mat");
            
            meshRenderer.sharedMaterial = planeMat;
            lineRenderer.startWidth = 0.02f;
            lineRenderer.endWidth = 0.02f;
            lineRenderer.useWorldSpace = false;
            lineRenderer.sharedMaterial = planeMat;

            planePrefab = PrefabUtility.SaveAsPrefabAsset(tempGo, prefabPath);
            GameObject.DestroyImmediate(tempGo);
        }

        planeManager.planePrefab = planePrefab;

        // Step 5: Add ARRaycastManager to the correct XR Origin
        var raycastManager = xrOriginGo.GetComponent<ARRaycastManager>();
        if (raycastManager == null) {
            raycastManager = xrOriginGo.AddComponent<ARRaycastManager>();
            Debug.Log("[BuildARManagers] Added ARRaycastManager to XR Origin.");
        }

        // Step 5b: Add ARAnchorManager to the correct XR Origin
        var anchorManager = xrOriginGo.GetComponent<ARAnchorManager>();
        if (anchorManager == null) {
            anchorManager = xrOriginGo.AddComponent<ARAnchorManager>();
            Debug.Log("[BuildARManagers] Added ARAnchorManager to XR Origin.");
        }

        // Step 6: Add ARModeManager to CoreGameObject (logic controller, doesn't need to be on XR Origin)
        if (coreGo != null) {
            var modeManager = coreGo.GetComponent<ARModeManager>();
            if (modeManager == null) {
                modeManager = coreGo.AddComponent<ARModeManager>();
            }

            // Hook up all references correctly
            modeManager.imageManager = imageManager;
            modeManager.planeManager = planeManager;
            modeManager.raycastManager = raycastManager;
            modeManager.anchorManager = anchorManager;

            EditorUtility.SetDirty(coreGo);
        }
        
        EditorUtility.SetDirty(xrOriginGo);
        UnityEditor.SceneManagement.EditorSceneManager.SaveScene(xrOriginGo.scene);
        Debug.Log($"[BuildARManagers] ✅ AR Managers configured successfully! PlaneManager, RaycastManager & AnchorManager are on '{xrOriginGo.name}', ARModeManager is on 'CoreGameObject'.");
    }
}
