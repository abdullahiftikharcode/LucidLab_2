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

        [Header("Not Tracked State")]
        public Color noTrackButtonColor = new Color(0.5f, 0.5f, 0.5f, 1f); // Grey
        public string noTrackText = "Cant Lock";

        [Header("Unlock (Open) State")]
        public Color unlockButtonColor = new Color(0.2f, 0.8f, 0.2f, 1f); // Green
        public string unlockText = "Lock";

        [Header("Lock (Closed) State")]
        public Color lockButtonColor = new Color(0.9f, 0.2f, 0.2f, 1f); // Red
        public string lockText = "Unlock";

        [Header("State")]
        public bool isMarkerTracked;
        public static bool IsPlanePlaced { get; private set; }
        private TrackingModeToggleUI.TrackingMode currentMode = TrackingModeToggleUI.TrackingMode.Marker;

        void Start() {
            IsLocked = false;
            IsPlanePlaced = false;
            Debug.Log($"[ARLockManager] Start() — lockButton={lockButton != null}, buttonImage={buttonImage != null}, buttonText={buttonText != null}");
            if (lockButton != null) {
                lockButton.onClick.AddListener(ToggleLock);
                lockButton.gameObject.SetActive(true); // Always visible by default
            } else {
                Debug.LogWarning("[ARLockManager] lockButton is NULL!");
            }
            // Set initial appearance
            UpdateUI();
        }

        void OnEnable() {
            ARExperimentManager.OnMarkerTracked += OnMarkerTracked;
            ARExperimentManager.OnMarkerLost += OnMarkerLost;
            TrackingModeToggleUI.OnModeChanged += OnModeChanged;
        }

        void OnDisable() {
            ARExperimentManager.OnMarkerTracked -= OnMarkerTracked;
            ARExperimentManager.OnMarkerLost -= OnMarkerLost;
            TrackingModeToggleUI.OnModeChanged -= OnModeChanged;
        }

        private void OnModeChanged(TrackingModeToggleUI.TrackingMode newMode) {
             currentMode = newMode;
             UpdateUI();
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

        public void ForceUnlock() {
            if (IsLocked) {
                ToggleLock(); // Toggles from locked to unlocked properly
            }
        }

        public void SetPlanePlaced(bool placed) {
            IsPlanePlaced = placed;
            Debug.Log($"[ARLockManager] 📍 SetPlanePlaced — isPlanePlaced={IsPlanePlaced}");
            UpdateUI();
        }

        public void ToggleLock() {
            IsLocked = !IsLocked;
            Debug.Log($"[ARLockManager] 🔒 ToggleLock — IsLocked={IsLocked}, Mode={currentMode}");

            // In Marker Mode, enforce the lock state on all MarkerAnchors immediately
            // In Plane Mode, MarkerAnchors are already isolated, so setting IsLocked is enough for ARModeManager to query.
            var anchors = FindObjectsOfType<MarkerAnchor>(true);
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

            lockButton.gameObject.SetActive(true); // Always visible but state changes depending on mode

            if (currentMode == TrackingModeToggleUI.TrackingMode.Marker) {
                if (IsLocked) {
                    ApplyLockAppearance();
                    lockButton.interactable = true;
                } else if (isMarkerTracked) {
                    ApplyUnlockAppearance();
                    lockButton.interactable = true;
                } else {
                    ApplyNoTrackAppearance();
                    lockButton.interactable = false;
                }
            } else if (currentMode == TrackingModeToggleUI.TrackingMode.Plane) {
                if (IsLocked) {
                    ApplyLockAppearance();
                    lockButton.interactable = true;
                } else if (IsPlanePlaced) {
                    ApplyUnlockAppearance();
                    lockButton.interactable = true;
                } else {
                    ApplyNoTrackAppearance();
                    lockButton.interactable = false;
                }
            }
        }

        private void ApplyNoTrackAppearance() {
            if (buttonImage != null) buttonImage.color = noTrackButtonColor;
            if (buttonText != null) buttonText.text = noTrackText;
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
