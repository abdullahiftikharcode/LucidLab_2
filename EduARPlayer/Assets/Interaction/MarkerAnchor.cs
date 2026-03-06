using UnityEngine;
using UnityEngine.XR.ARFoundation;

namespace Assets.Interaction {
    /// <summary>
    /// This component allows an object to "stick" to a physical AR marker.
    /// It listens for events from ARExperimentManager and reparents itself
    /// when the specified markerId is found. Objects start hidden and only
    /// appear when their marker is actively tracked.
    /// </summary>
    public class MarkerAnchor : MonoBehaviour {
        public string markerId;

        /// <summary>AR scale factor: designer units → real-world meters on desk.</summary>
        public static float ArScale = 0.01f;

        private Vector3 _designerLocalPosition;
        private Quaternion _designerLocalRotation;
        private Vector3 _designerLocalScale;
        private bool _isVisible = false;
        private bool _isLocked = false;
        public bool isPlanePlaced = false;
        private ARAnchor _arAnchor;
        void Start() {
            // Capture designer-assigned transforms before any AR manipulation
            _designerLocalPosition = transform.localPosition;
            _designerLocalRotation = transform.localRotation;
            _designerLocalScale = transform.localScale;

            // Start hidden until marker is detected
            SetVisible(false);

            // Check if marker is already tracked
            if (!string.IsNullOrEmpty(markerId) &&
                ARExperimentManager.MarkerTransforms.TryGetValue(markerId, out var markerTransform)) {
                AttachTo(markerTransform);
            }
        }

        void OnEnable() {
            ARExperimentManager.OnMarkerTracked += HandleMarkerTracked;
            ARExperimentManager.OnMarkerLost += HandleMarkerLost;
        }

        void OnDisable() {
            ARExperimentManager.OnMarkerTracked -= HandleMarkerTracked;
            ARExperimentManager.OnMarkerLost -= HandleMarkerLost;
        }

        public void HideForPlaneTransition() {
            SetVisible(false);
            transform.SetParent(null, true);
        }

        public void SnapToPlane(Pose hitPose) {
            Debug.Log($"[MarkerAnchor] SnapToPlane START — name={gameObject.name}, active={gameObject.activeSelf}, _isLocked={_isLocked}");

            // Edge case fix: If an anchor already exists (we repinned it), destroy it first!
            // Unity's AR system won't let you just move an active ARAnchor via transforms permanently.
            if (_arAnchor != null) {
                DestroyImmediate(_arAnchor);
                _arAnchor = null;
            }

            transform.SetParent(null, true);
            
            // Edge case fix: Respect designer relative offsets when placing on a tracked plane
            // Treat the hit.pose as if it was the marker's coordinate system
            transform.position = hitPose.position + (hitPose.rotation * (_designerLocalPosition * ArScale));
            transform.rotation = hitPose.rotation * _designerLocalRotation;
            transform.localScale = _designerLocalScale * ArScale;
            
            isPlanePlaced = true;
            
            _arAnchor = gameObject.AddComponent<ARAnchor>();

            SetVisible(true);

            int rendererCount = GetComponentsInChildren<Renderer>(true).Length;
            Debug.Log($"[MarkerAnchor] SnapToPlane END — pos={transform.position}, scale={transform.localScale}, renderers={rendererCount}, _isVisible={_isVisible}");
        }

        public void ClearPlanePlacement() {
            isPlanePlaced = false;
            // Also need to stop ARAnchor overriding manual resets
            if (_arAnchor != null) {
                DestroyImmediate(_arAnchor);
                _arAnchor = null;
            }
            SetVisible(false);

            // Re-check original marker tracking in case it's still in view
            if (!string.IsNullOrEmpty(markerId) &&
                ARExperimentManager.MarkerTransforms.TryGetValue(markerId, out var markerTransform)) {
                AttachTo(markerTransform);
            }
        }

        public void LockInPlace() {
            if (!_isVisible || isPlanePlaced) return; // Only lock if it is currently visible based on marker
            
            _isLocked = true;
            transform.SetParent(null, true);

            // Add ARAnchor to pin it precisely to geographic physical space, preventing drift
            if (_arAnchor == null) {
                _arAnchor = gameObject.AddComponent<ARAnchor>();
            }
        }

        public void Unlock() {
            if (isPlanePlaced) return; // Don't unlock plane-placed objects via marker flow
            _isLocked = false;
            
            // Remove ARAnchor tracking
            if (_arAnchor != null) {
                Destroy(_arAnchor);
                _arAnchor = null;
            }

            // If unlocked, revert to tracking logic
            if (!string.IsNullOrEmpty(markerId) &&
                ARExperimentManager.MarkerTransforms.TryGetValue(markerId, out var markerTransform)) {
                AttachTo(markerTransform);
            } else {
                SetVisible(false);
            }
        }

        private void HandleMarkerTracked(string id, Transform markerTransform) {
            if (_isLocked || isPlanePlaced) return;

            if (id == markerId) {
                AttachTo(markerTransform);
            }
        }

        private void HandleMarkerLost(string id) {
            if (_isLocked || isPlanePlaced) {
                Debug.Log($"[MarkerAnchor] HandleMarkerLost SKIPPED — _isLocked={_isLocked}, isPlanePlaced={isPlanePlaced}");
                return;
            }

            if (id == markerId) {
                Debug.Log($"[MarkerAnchor] HandleMarkerLost HIDING — name={gameObject.name}, markerId={id}");
                SetVisible(false);
            }
        }

        private void AttachTo(Transform markerTransform) {
            // Parent to the marker so it moves with the tracked image
            transform.SetParent(markerTransform, false);

            // Apply designer position scaled to AR desk size
            transform.localPosition = _designerLocalPosition * ArScale;
            transform.localRotation = _designerLocalRotation;
            transform.localScale = _designerLocalScale * ArScale;

            SetVisible(true);
        }

        private void SetVisible(bool visible) {
            _isVisible = visible;
            foreach (var r in GetComponentsInChildren<Renderer>(true)) {
                r.enabled = visible;
            }
            foreach (var c in GetComponentsInChildren<Canvas>(true)) {
                c.enabled = visible;
            }
        }
    }
}
