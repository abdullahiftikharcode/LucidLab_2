using UnityEngine;
using UnityEngine.XR.ARFoundation;
using System.Collections.Generic;
using Assets.SceneManagement;

namespace Assets.Interaction {
    public class ARModeManager : MonoBehaviour {
        [Header("AR Managers")]
        public ARTrackedImageManager imageManager;
        public ARPlaneManager planeManager;
        public ARRaycastManager raycastManager;
        public ARAnchorManager anchorManager;

        [Header("State")]
        public TrackingModeToggleUI.TrackingMode currentMode = TrackingModeToggleUI.TrackingMode.Marker;

        private SceneManager _sceneManager;
        private bool _planeDetected = false;

        void OnEnable() {
            TrackingModeToggleUI.OnModeChanged += HandleModeChanged;
        }

        void OnDisable() {
            TrackingModeToggleUI.OnModeChanged -= HandleModeChanged;
        }

        void OnDestroy() {
            if (planeManager != null) {
                planeManager.planesChanged -= OnPlanesChanged;
            }
        }

        void Start() {
            _sceneManager = Object.FindFirstObjectByType<SceneManager>();

            // Check if we need to add missing managers dynamically
            if (imageManager == null) imageManager = Object.FindFirstObjectByType<ARTrackedImageManager>();
            if (planeManager == null) planeManager = Object.FindFirstObjectByType<ARPlaneManager>();
            if (raycastManager == null) raycastManager = Object.FindFirstObjectByType<ARRaycastManager>();
            if (anchorManager == null) anchorManager = Object.FindFirstObjectByType<ARAnchorManager>();

            // If plane or raycast or anchor managers don't exist on the XR Origin, add them
            if (planeManager == null && imageManager != null) {
                Debug.Log("[PlaneDetection] ARPlaneManager not found, creating one dynamically.");
                planeManager = imageManager.gameObject.AddComponent<ARPlaneManager>();
            }
            if (raycastManager == null && imageManager != null) {
                Debug.Log("[PlaneDetection] ARRaycastManager not found, creating one dynamically.");
                raycastManager = imageManager.gameObject.AddComponent<ARRaycastManager>();
            }
            if (anchorManager == null && imageManager != null) {
                Debug.Log("[ARLockManager] ARAnchorManager not found, creating one dynamically to prevent drift.");
                anchorManager = imageManager.gameObject.AddComponent<ARAnchorManager>();
            }

            if (imageManager != null) {
                // Ensure image detection is actively tracking moving objects, otherwise it stops updating
                imageManager.requestedMaxNumberOfMovingImages = 4;
            }

            if (planeManager != null) {
                planeManager.planesChanged += OnPlanesChanged;
                // Note: ARPlaneManager.trackables might not be immediately available depending on script init order
                foreach (var plane in planeManager.trackables) {
                    Debug.Log($"[PlaneDetection] Found existing plane at start: {plane.trackableId}");
                    _planeDetected = true;
                    break;
                }
            } else {
                Debug.LogError("[PlaneDetection] planeManager is still NULL after initialization attempt!");
            }

            // Sync with initial UI state
            ApplyMode(currentMode);
        }

        private void OnPlanesChanged(ARPlanesChangedEventArgs args) {
            // Log whenever the AR Foundation runtime feeds us new plane data
            if (args.added.Count > 0 || args.updated.Count > 0 || args.removed.Count > 0) {
                Debug.Log($"[PlaneDetection] OnPlanesChanged event triggered! Added: {args.added.Count} | Updated: {args.updated.Count} | Removed: {args.removed.Count}");
            }

            if (args.added.Count > 0) {
                _planeDetected = true;
                UpdateInstructionText();
            }
        }

        private void HandleModeChanged(TrackingModeToggleUI.TrackingMode newMode) {
            currentMode = newMode;
            ApplyMode(currentMode);
        }

        private void ApplyMode(TrackingModeToggleUI.TrackingMode mode) {
            Debug.Log($"[ARModeManager] Switching to {mode} mode.");
            
            // Edge Case: Force unlock if we are changing modes to prevent state desync
            if (ARLockManager.IsLocked) {
                var lockManager = Object.FindFirstObjectByType<ARLockManager>();
                if (lockManager != null) {
                    lockManager.ForceUnlock();
                }
            }

            if (mode == TrackingModeToggleUI.TrackingMode.Marker) {
                if (imageManager != null) imageManager.enabled = true;
                if (planeManager != null) {
                    planeManager.enabled = false;
                    foreach (var plane in planeManager.trackables) {
                        plane.gameObject.SetActive(false); // Hide existing planes
                    }
                }
                if (raycastManager != null) raycastManager.enabled = false;

                // Edge case fix: Let MarkerAnchor know it should listen to markers again
                var anchors = FindObjectsOfType<MarkerAnchor>(true);
                foreach (var anchor in anchors) {
                    anchor.ClearPlanePlacement();
                }
            } 
            else if (mode == TrackingModeToggleUI.TrackingMode.Plane) {
                Debug.Log("[PlaneDetection] Validating Plane Mode switch. imageManager present? " + (imageManager != null) + ", planeManager present? " + (planeManager != null));
                
                var sceneManager = Object.FindFirstObjectByType<SceneManager>();
                if (sceneManager != null) {
                    sceneManager.LoadDefaultSceneForPlaneMode();
                }

                if (imageManager != null) imageManager.enabled = false; // Stop finding new markers
                if (planeManager != null) {
                    planeManager.enabled = true;
                    int count = 0;
                    foreach (var plane in planeManager.trackables) {
                        plane.gameObject.SetActive(true); // Show existing planes
                        count++;
                    }
                    Debug.Log($"[PlaneDetection] planeManager is ENABLED, making sure {count} existing planes are visible.");
                }
                if (raycastManager != null) raycastManager.enabled = true;

                // Edge case fix: Hide object so it doesn't float around frozen in its last marker position
                var anchors = FindObjectsOfType<MarkerAnchor>(true);
                foreach (var anchor in anchors) {
                    anchor.HideForPlaneTransition();
                }

                // Reset plane placement state
                var lockManager = Object.FindFirstObjectByType<ARLockManager>();
                if (lockManager != null) {
                    lockManager.SetPlanePlaced(false);
                }
            }

            UpdateInstructionText();
        }

        private void UpdateInstructionText() {
            if (_sceneManager == null) return;

            if (currentMode == TrackingModeToggleUI.TrackingMode.Marker) {
                if (_sceneManager.currentScene == null) {
                    _sceneManager.ShowDescription("SCAN A MARKER TO START THE EXPERIMENT");
                } else {
                    _sceneManager.ShowDescription(_sceneManager.currentScene.Description);
                }
            } else if (currentMode == TrackingModeToggleUI.TrackingMode.Plane) {
                if (_planeDetected) {
                    _sceneManager.ShowDescription("TAP HIGHLIGHTED PLANE TO PLACE");
                } else {
                    _sceneManager.ShowDescription("SCAN A PLANE");
                }
            }
        }

        void Update() {
            // Handle Tap-to-Place in Plane Mode
            if (currentMode == TrackingModeToggleUI.TrackingMode.Plane && raycastManager != null) {
                // Ignore taps if the scene is locked
                if (ARLockManager.IsLocked) return;

                if (Input.touchCount > 0) {
                    Touch touch = Input.GetTouch(0);
                    if (touch.phase == TouchPhase.Began) {
                        // Edge case fix: proper UI touch filtering for mobile
                        if (UnityEngine.EventSystems.EventSystem.current != null && UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject(touch.fingerId)) {
                            return;
                        }
                        HandlePlaneTap(touch.position);
                    }
                } else if (Input.GetMouseButtonDown(0)) { // Fallback for Editor testing if needed
                    if (UnityEngine.EventSystems.EventSystem.current != null && UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject()) {
                        return;
                    }
                    HandlePlaneTap(Input.mousePosition);
                }
            }
        }

        private void HandlePlaneTap(Vector2 screenPos) {
            List<ARRaycastHit> hits = new List<ARRaycastHit>();
            if (raycastManager.Raycast(screenPos, hits, UnityEngine.XR.ARSubsystems.TrackableType.PlaneWithinPolygon)) {
                Pose hitPose = hits[0].pose;
                Debug.Log($"[ARModeManager] Plane tapped at {hitPose.position}");
                
                // Instruct all unlocked anchors to snap to this plane position
                var anchors = FindObjectsOfType<MarkerAnchor>(true);
                foreach (var anchor in anchors) {
                    anchor.SnapToPlane(hitPose);
                }

                // Make sure to display the scene description again once placed
                if (_sceneManager != null && _sceneManager.currentScene != null) {
                    _sceneManager.ShowDescription(_sceneManager.currentScene.Description);
                }

                // Notify lock manager that plane placement happened
                var lockManager = Object.FindFirstObjectByType<ARLockManager>();
                if (lockManager != null) {
                    lockManager.SetPlanePlaced(true);
                }
            }
        }
    }
}
