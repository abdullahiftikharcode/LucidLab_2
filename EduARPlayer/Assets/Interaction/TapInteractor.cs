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
        public UnityEvent OnEmptyTapped = new();

        [Header("Settings")]
        [Tooltip("Maximum raycast distance")]
        public float maxDistance = 100f;

        [Tooltip("Layer mask for experiment objects (default = Everything)")]
        public LayerMask interactableLayer = ~0;

        private float _touchStartTime;
        private Vector2 _touchStartPos;
        private const float MaxTapDuration = 0.2f;
        private const float MaxTapDistance = 15f;

        void Update() {
            // Detect a single tap (touch or mouse click)
            bool tapped = false;
            Vector2 screenPos = Vector2.zero;

#if UNITY_EDITOR
            if (Input.GetMouseButtonDown(0)) {
                _touchStartTime = Time.time;
                _touchStartPos = Input.mousePosition;
            } else if (Input.GetMouseButtonUp(0)) {
                if (Time.time - _touchStartTime <= MaxTapDuration && Vector2.Distance(Input.mousePosition, _touchStartPos) <= MaxTapDistance) {
                    tapped = true;
                    screenPos = Input.mousePosition;
                }
            }
#else
            if (Input.touchCount == 1) {
                var touch = Input.GetTouch(0);
                if (touch.phase == TouchPhase.Began) {
                    _touchStartTime = Time.time;
                    _touchStartPos = touch.position;
                } else if (touch.phase == TouchPhase.Ended) {
                    if (Time.time - _touchStartTime <= MaxTapDuration && Vector2.Distance(touch.position, _touchStartPos) <= MaxTapDistance) {
                        tapped = true;
                        screenPos = touch.position;
                    }
                }
            }
#endif

            if (!tapped) return;

            var cam = Camera.main;
            if (cam == null) return;

            var ray = cam.ScreenPointToRay(screenPos);
            if (Physics.Raycast(ray, out RaycastHit hit, maxDistance, interactableLayer)) {
                OnObjectTapped?.Invoke(hit.collider.gameObject);
            } else {
                OnEmptyTapped?.Invoke();
            }
        }
    }
}
