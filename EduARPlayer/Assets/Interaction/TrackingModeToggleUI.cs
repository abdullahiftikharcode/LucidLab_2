using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using System.Collections;

namespace Assets.Interaction {
    /// <summary>
    /// Handles the visual animation and dispatching of the AR Mode Toggle (Marker vs Plane).
    /// </summary>
    [RequireComponent(typeof(Button))]
    public class TrackingModeToggleUI : MonoBehaviour {
        public enum TrackingMode { Marker, Plane }

        [Header("References")]
        public RectTransform knob;
        public Image knobInnerGlow;
        public TextMeshProUGUI statusText;
        public Image background;

        [Header("State Colors")]
        public Color markerModeTextColor = new Color(0.9f, 0.2f, 0.2f); // Red
        public Color markerModeInnerColor = new Color(0.9f, 0.2f, 0.2f); 
        
        public Color planeModeTextColor = new Color(0.2f, 0.8f, 0.2f); // Green
        public Color planeModeInnerColor = new Color(0.2f, 0.8f, 0.2f);

        [Header("Animation Settings")]
        public float animationDuration = 0.2f;
        public float knobLeftX = -35f;
        public float knobRightX = 35f;

        public TrackingMode CurrentMode { get; private set; } = TrackingMode.Marker;
        private Coroutine _animCoroutine;

        public delegate void ModeChangedHandler(TrackingMode newMode);
        public static event ModeChangedHandler OnModeChanged;

        void Start() {
            // Ensure we have a button component and hook it up programmatically
            Button btn = GetComponent<Button>();
            if (btn != null) {
                btn.onClick.RemoveAllListeners();
                btn.onClick.AddListener(Toggle);
            }

            SetStateImmediate(TrackingMode.Marker);
        }

        public void Toggle() {
            TrackingMode newMode = CurrentMode == TrackingMode.Marker ? TrackingMode.Plane : TrackingMode.Marker;

            Debug.Log($"[TrackingToggle] Toggling from {CurrentMode} to {newMode}. Dispatching OnModeChanged Event...");

            CurrentMode = newMode;

            if (_animCoroutine != null) StopCoroutine(_animCoroutine);
            _animCoroutine = StartCoroutine(AnimateToState(newMode));

            // Null check and invoke
            if (OnModeChanged != null) {
                Debug.Log("[TrackingToggle] OnModeChanged has subscribers. Invoking!");
                OnModeChanged.Invoke(newMode);
            } else {
                Debug.LogWarning("[TrackingToggle] OnModeChanged has NO SUBSCRIBERS. Something failed to bind to it!");
            }
        }

        private void SetStateImmediate(TrackingMode mode) {
            CurrentMode = mode;
            if (mode == TrackingMode.Marker) {
                knob.anchoredPosition = new Vector2(knobLeftX, knob.anchoredPosition.y);
                statusText.text = "MARKER";
                statusText.color = markerModeTextColor;
                if (knobInnerGlow != null) knobInnerGlow.color = markerModeInnerColor;
                
                statusText.rectTransform.anchoredPosition = new Vector2(30, 0); // Text on the right
            } else {
                knob.anchoredPosition = new Vector2(knobRightX, knob.anchoredPosition.y);
                statusText.text = "PLANE";
                statusText.color = planeModeTextColor;
                if (knobInnerGlow != null) knobInnerGlow.color = planeModeInnerColor;

                statusText.rectTransform.anchoredPosition = new Vector2(-30, 0); // Text on the left
            }
        }

        private IEnumerator AnimateToState(TrackingMode mode) {
            float time = 0;
            Vector2 startPos = knob.anchoredPosition;
            Vector2 endPos = new Vector2(mode == TrackingMode.Marker ? knobLeftX : knobRightX, knob.anchoredPosition.y);

            string targetText = mode == TrackingMode.Marker ? "MARKER" : "PLANE";
            Color targetTextColor = mode == TrackingMode.Marker ? markerModeTextColor : planeModeTextColor;
            Color targetInnerColor = mode == TrackingMode.Marker ? markerModeInnerColor : planeModeInnerColor;
            Vector2 targetTextPos = new Vector2(mode == TrackingMode.Marker ? 30 : -30, 0);

            statusText.text = targetText; // Switch text immediately

            Color startTextColor = statusText.color;
            Color startInnerColor = knobInnerGlow != null ? knobInnerGlow.color : Color.white;
            Vector2 startTextPos = statusText.rectTransform.anchoredPosition;

            while (time < animationDuration) {
                time += Time.deltaTime;
                float t = time / animationDuration;
                float curve = Mathf.SmoothStep(0, 1, t); // simple easing

                knob.anchoredPosition = Vector2.Lerp(startPos, endPos, curve);
                statusText.color = Color.Lerp(startTextColor, targetTextColor, curve);
                statusText.rectTransform.anchoredPosition = Vector2.Lerp(startTextPos, targetTextPos, curve);
                
                if (knobInnerGlow != null) {
                    knobInnerGlow.color = Color.Lerp(startInnerColor, targetInnerColor, curve);
                }

                yield return null;
            }

            SetStateImmediate(mode);
        }
    }
}
