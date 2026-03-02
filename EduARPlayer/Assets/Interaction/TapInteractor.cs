using UnityEngine;
using UnityEngine.Events;

namespace Assets.Interaction {
    /// <summary>
    /// Casts a ray from the screen touch/click position into the AR world.
    /// When an experiment object (with a Collider) is hit, fires OnObjectTapped.
    /// Attach to the same GameObject as the AR Camera or a manager object.
    /// </summary>
    public class TapInteractor : MonoBehaviour {
        [System.Serializable]
        public class ObjectTappedEvent : UnityEvent<GameObject> { }

        [Header("Events")]
        public ObjectTappedEvent OnObjectTapped = new();

        [Header("Settings")]
        [Tooltip("Maximum raycast distance")]
        public float maxDistance = 100f;

        [Tooltip("Layer mask for experiment objects (default = Everything)")]
        public LayerMask interactableLayer = ~0;

        void Update() {
            // Detect a single tap (touch or mouse click)
            bool tapped = false;
            Vector2 screenPos = Vector2.zero;

#if UNITY_EDITOR
            if (Input.GetMouseButtonDown(0)) {
                tapped = true;
                screenPos = Input.mousePosition;
            }
#else
            if (Input.touchCount == 1 && Input.GetTouch(0).phase == TouchPhase.Began) {
                tapped = true;
                screenPos = Input.GetTouch(0).position;
            }
#endif

            if (!tapped) return;

            var cam = Camera.main;
            if (cam == null) return;

            var ray = cam.ScreenPointToRay(screenPos);
            if (Physics.Raycast(ray, out RaycastHit hit, maxDistance, interactableLayer)) {
                OnObjectTapped?.Invoke(hit.collider.gameObject);
            }
        }
    }
}
