using UnityEngine;
using UnityEngine.Events;

namespace Assets.Interaction {
    /// <summary>
    /// Monitors the tilt angle of the phone using the accelerometer.
    /// Fires OnTiltTriggered when tilt exceeds a threshold, and OnTiltReset when it returns below.
    /// Used for physics experiments (e.g. pouring, tilting to change angle).
    /// </summary>
    public class TiltTriggerManager : MonoBehaviour {
        [System.Serializable]
        public class TiltEvent : UnityEvent<float> { }

        [Header("Settings")]
        [Tooltip("Tilt angle (degrees from vertical) that triggers the event")]
        [Range(5f, 90f)]
        public float tiltThreshold = 30f;

        [Tooltip("How often (seconds) to check tilt")]
        public float checkInterval = 0.05f;

        [Header("Events")]
        [Tooltip("Fired when tilt exceeds threshold. Parameter = current tilt angle.")]
        public TiltEvent OnTiltTriggered = new();

        [Tooltip("Fired when tilt returns below threshold.")]
        public TiltEvent OnTiltReset = new();

        [Header("Debug")]
        [Tooltip("Current tilt angle in degrees (read-only)")]
        public float currentTiltAngle;

        private bool _isTilted;
        private float _timer;

        void Update() {
            _timer += Time.deltaTime;
            if (_timer < checkInterval) return;
            _timer = 0f;

            // Input.acceleration gives the device acceleration in G-force.
            // When phone is upright (portrait): acceleration ≈ (0, -1, 0)
            // We compute the angle from the vertical axis.
            Vector3 accel = Input.acceleration;
            // Project onto XZ plane to get tilt magnitude
            float tiltFromVertical = Mathf.Acos(Mathf.Clamp(-accel.y / accel.magnitude, -1f, 1f)) * Mathf.Rad2Deg;
            currentTiltAngle = tiltFromVertical;

            if (tiltFromVertical >= tiltThreshold && !_isTilted) {
                _isTilted = true;
                OnTiltTriggered?.Invoke(tiltFromVertical);
            } else if (tiltFromVertical < tiltThreshold && _isTilted) {
                _isTilted = false;
                OnTiltReset?.Invoke(tiltFromVertical);
            }
        }
    }
}
