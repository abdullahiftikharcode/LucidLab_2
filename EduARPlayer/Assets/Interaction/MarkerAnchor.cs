using UnityEngine;

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
        private bool _attached;

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

        private void HandleMarkerTracked(string id, Transform markerTransform) {
            if (id == markerId) {
                AttachTo(markerTransform);
            }
        }

        private void HandleMarkerLost(string id) {
            if (id == markerId) {
                SetVisible(false);
                _attached = false;
            }
        }

        private void AttachTo(Transform markerTransform) {
            // Parent to the marker so it moves with the tracked image
            transform.SetParent(markerTransform, false);

            // Apply designer position scaled to AR desk size
            transform.localPosition = _designerLocalPosition * ArScale;
            transform.localRotation = _designerLocalRotation;
            transform.localScale = _designerLocalScale * ArScale;

            _attached = true;
            SetVisible(true);
        }

        private void SetVisible(bool visible) {
            foreach (var r in GetComponentsInChildren<Renderer>(true)) {
                r.enabled = visible;
            }
            foreach (var c in GetComponentsInChildren<Canvas>(true)) {
                c.enabled = visible;
            }
        }
    }
}
