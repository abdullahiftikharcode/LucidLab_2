using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace Assets.Interaction {
    public class ARLockManager : MonoBehaviour {
        public static bool IsLocked { get; private set; }

        [Header("UI Dependencies")]
        [Tooltip("The main lock button on the screen")]
        public Button lockButton;
        
        [Tooltip("The Image component on the button (background)")]
        public Image buttonImage;
        
        [Tooltip("The TextMeshProUGUI child of the button")]
        public TextMeshProUGUI buttonText;

        [Header("Unlock (Open) State")]
        public Color unlockButtonColor = new Color(0.2f, 0.8f, 0.2f, 1f); // Green
        public string unlockText = "🔓";

        [Header("Lock (Closed) State")]
        public Color lockButtonColor = new Color(0.9f, 0.2f, 0.2f, 1f); // Red
        public string lockText = "🔒";

        [Header("State")]
        public bool isMarkerTracked;

        void Start() {
            IsLocked = false;
            Debug.Log($"[ARLockManager] Start() — lockButton={lockButton != null}, buttonImage={buttonImage != null}, buttonText={buttonText != null}");
            if (lockButton != null) {
                lockButton.onClick.AddListener(ToggleLock);
                lockButton.gameObject.SetActive(false); // Hidden until marker found
            } else {
                Debug.LogWarning("[ARLockManager] lockButton is NULL!");
            }
            // Set initial appearance
            ApplyUnlockAppearance();
        }

        void OnEnable() {
            ARExperimentManager.OnMarkerTracked += OnMarkerTracked;
            ARExperimentManager.OnMarkerLost += OnMarkerLost;
        }

        void OnDisable() {
            ARExperimentManager.OnMarkerTracked -= OnMarkerTracked;
            ARExperimentManager.OnMarkerLost -= OnMarkerLost;
        }

        private void OnMarkerTracked(string id, Transform markerTransform) {
            Debug.Log($"[ARLockManager] 🟢 OnMarkerTracked — id={id}");
            isMarkerTracked = true;
            UpdateUI();
        }

        private void OnMarkerLost(string id) {
            Debug.Log($"[ARLockManager] 🔴 OnMarkerLost — id={id}, remaining={ARExperimentManager.MarkerTransforms.Count}");
            if (ARExperimentManager.MarkerTransforms.Count == 0) {
                isMarkerTracked = false;
                UpdateUI();
            }
        }

        public void ToggleLock() {
            IsLocked = !IsLocked;
            Debug.Log($"[ARLockManager] 🔒 ToggleLock — IsLocked={IsLocked}");

            var anchors = FindObjectsOfType<MarkerAnchor>(true);
            Debug.Log($"[ARLockManager] Found {anchors.Length} MarkerAnchor(s).");
            foreach (var anchor in anchors) {
                if (IsLocked) anchor.LockInPlace();
                else anchor.Unlock();
            }
            UpdateUI();
        }

        private void UpdateUI() {
            if (lockButton == null) {
                Debug.LogWarning("[ARLockManager] UpdateUI SKIPPED — lockButton is null");
                return;
            }

            if (IsLocked) {
                lockButton.gameObject.SetActive(true);
                ApplyLockAppearance();
                Debug.Log("[ARLockManager] UI: LOCKED — button visible, red");
            } else {
                lockButton.gameObject.SetActive(isMarkerTracked);
                ApplyUnlockAppearance();
                Debug.Log($"[ARLockManager] UI: UNLOCKED — button visible={isMarkerTracked}, green");
            }
        }

        private void ApplyLockAppearance() {
            if (buttonImage != null) buttonImage.color = lockButtonColor;
            if (buttonText != null) buttonText.text = lockText;
        }

        private void ApplyUnlockAppearance() {
            if (buttonImage != null) buttonImage.color = unlockButtonColor;
            if (buttonText != null) buttonText.text = unlockText;
        }
    }
}
