using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace Assets.Interaction {
    /// <summary>
    /// Monitors the distance between pairs of AR tracked images.
    /// When two tracked markers come within a configurable threshold distance,
    /// fires OnMarkersClose with both marker reference names.
    /// Used for experiments like acid-base neutralization (bring two markers together).
    /// </summary>
    public class MarkerProximityManager : MonoBehaviour {
        [System.Serializable]
        public class MarkerPairEvent : UnityEvent<string, string> { }

        [Header("References")]
        [Tooltip("Assign the ARTrackedImageManager from your XR Origin")]
        public ARTrackedImageManager trackedImageManager;

        [Header("Settings")]
        [Tooltip("Distance in meters below which two markers are considered 'close'")]
        public float proximityThreshold = 0.05f;

        [Tooltip("How often (seconds) to check proximity. Lower = more responsive but costlier.")]
        public float checkInterval = 0.1f;

        [Header("Events")]
        public MarkerPairEvent OnMarkersClose = new();
        public MarkerPairEvent OnMarkersSeparated = new();

        private readonly Dictionary<string, ARTrackedImage> _activeImages = new();
        private readonly HashSet<string> _currentlyCloseSet = new();
        private float _timer;

        void OnEnable() {
            if (trackedImageManager != null)
                trackedImageManager.trackedImagesChanged += OnTrackedImagesChanged;
        }

        void OnDisable() {
            if (trackedImageManager != null)
                trackedImageManager.trackedImagesChanged -= OnTrackedImagesChanged;
        }

        void OnTrackedImagesChanged(ARTrackedImagesChangedEventArgs args) {
            foreach (var img in args.added) {
                _activeImages[img.referenceImage.name] = img;
            }

            foreach (var img in args.updated) {
                if (img.trackingState == TrackingState.Tracking)
                    _activeImages[img.referenceImage.name] = img;
                else
                    _activeImages.Remove(img.referenceImage.name);
            }

            foreach (var img in args.removed) {
                _activeImages.Remove(img.referenceImage.name);
            }
        }

        void Update() {
            _timer += Time.deltaTime;
            if (_timer < checkInterval) return;
            _timer = 0f;

            var keys = new List<string>(_activeImages.Keys);
            var nowClose = new HashSet<string>();

            for (int i = 0; i < keys.Count; i++) {
                for (int j = i + 1; j < keys.Count; j++) {
                    var a = _activeImages[keys[i]];
                    var b = _activeImages[keys[j]];
                    float dist = Vector3.Distance(a.transform.position, b.transform.position);
                    string pairKey = keys[i] + "|" + keys[j];

                    if (dist <= proximityThreshold) {
                        nowClose.Add(pairKey);
                        if (!_currentlyCloseSet.Contains(pairKey)) {
                            OnMarkersClose?.Invoke(keys[i], keys[j]);
                        }
                    }
                }
            }

            // Fire separated events for pairs that were close but no longer are
            foreach (var pair in _currentlyCloseSet) {
                if (!nowClose.Contains(pair)) {
                    var parts = pair.Split('|');
                    OnMarkersSeparated?.Invoke(parts[0], parts[1]);
                }
            }

            _currentlyCloseSet.Clear();
            foreach (var p in nowClose) _currentlyCloseSet.Add(p);
        }
    }
}
