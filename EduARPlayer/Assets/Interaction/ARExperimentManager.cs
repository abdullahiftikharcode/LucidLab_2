using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using Assets.SceneManagement.Models;

namespace Assets.Interaction {
    /// <summary>
    /// Listens to ARTrackedImageManager events and maintains a registry of
    /// marker name → Transform. ObjectBuilder uses this registry to parent
    /// experiment objects under the correct tracked image when markerId is set.
    /// Also handles dynamic runtime marker downloading and injection into the AR Library.
    /// </summary>
    public class ARExperimentManager : MonoBehaviour {
        [Header("References")]
        [Tooltip("Assign the ARTrackedImageManager from your XR Origin")]
        public ARTrackedImageManager trackedImageManager;

        /// <summary>
        /// Global registry: marker reference image name → world-space Transform.
        /// ObjectBuilder reads this to parent objects under tracked images.
        /// </summary>
        public static readonly Dictionary<string, Transform> MarkerTransforms = new();

        public delegate void MarkerTrackedHandler(string markerId, Transform transform);
        public static event MarkerTrackedHandler OnMarkerTracked;

        public delegate void MarkerLostHandler(string markerId);
        public static event MarkerLostHandler OnMarkerLost;

        [Header("Debug")]
        [Tooltip("Number of currently tracked markers")]
        public int activeMarkerCount;

        void OnEnable() {
            if (trackedImageManager != null)
                trackedImageManager.trackedImagesChanged += OnTrackedImagesChanged;
        }

        void OnDisable() {
            if (trackedImageManager != null)
                trackedImageManager.trackedImagesChanged -= OnTrackedImagesChanged;
            MarkerTransforms.Clear();
        }

        void OnTrackedImagesChanged(ARTrackedImagesChangedEventArgs args) {
            foreach (var img in args.added) {
                MarkerTransforms[img.referenceImage.name] = img.transform;
                Debug.Log($"[ARExperimentManager] Marker ADDED: {img.referenceImage.name}");
                OnMarkerTracked?.Invoke(img.referenceImage.name, img.transform);
            }

            foreach (var img in args.updated) {
                if (img.trackingState == TrackingState.Tracking) {
                    MarkerTransforms[img.referenceImage.name] = img.transform;
                    OnMarkerTracked?.Invoke(img.referenceImage.name, img.transform);
                } else {
                    MarkerTransforms.Remove(img.referenceImage.name);
                    OnMarkerLost?.Invoke(img.referenceImage.name);
                }
            }

            foreach (var img in args.removed) {
                MarkerTransforms.Remove(img.referenceImage.name);
                Debug.Log($"[ARExperimentManager] Marker REMOVED: {img.referenceImage.name}");
                OnMarkerLost?.Invoke(img.referenceImage.name);
            }

            activeMarkerCount = MarkerTransforms.Count;
        }

        private float _logTimer = 0f;

        void Update() {
            _logTimer += Time.deltaTime;
            if (_logTimer >= 1.0f) { // Log once per second so we don't spam the console
                _logTimer = 0f;
                if (activeMarkerCount > 0) {
                    Debug.Log($"[ARExperimentManager] ✅ TRACKING {activeMarkerCount} marker(s) in view!");
                }
            }
        }

        /// <summary>
        /// Downloads markers from Firebase Storage URLs provided by SceneData
        /// and injects them into a MutableRuntimeReferenceImageLibrary.
        /// </summary>
        public async Task InitializeDynamicMarkersAsync(List<SceneMarkerData> markers) {
            if (trackedImageManager == null) {
                Debug.LogError("[ARExperimentManager] ARTrackedImageManager is null! Cannot initialize dynamic markers.");
                return;
            }

            // Create a mutable library for runtime injection
            var mutableLibrary = trackedImageManager.CreateRuntimeLibrary() as MutableRuntimeReferenceImageLibrary;
            
            if (mutableLibrary == null) {
                Debug.LogError("[ARExperimentManager] Failed to create MutableRuntimeReferenceImageLibrary. Check AR Foundation configuration.");
                return;
            }

            Debug.Log($"[ARExperimentManager] Downloading {markers.Count} dynamic markers...");

            foreach (var marker in markers) {
                if (string.IsNullOrEmpty(marker.imageUrl)) continue;
                
                var tcs = new TaskCompletionSource<Texture2D>();

                // UnityWebRequest needs to be tied to a standard Unity Coroutine/WebRequest lifecycle
                var uwr = UnityWebRequestTexture.GetTexture(marker.imageUrl);
                var operation = uwr.SendWebRequest();

                operation.completed += (op) => {
                    if (uwr.result == UnityWebRequest.Result.Success) {
                        tcs.SetResult(DownloadHandlerTexture.GetContent(uwr));
                    } else {
                        Debug.LogError($"[ARExperimentManager] Failed to download marker {marker.name}: {uwr.error}");
                        tcs.SetResult(null);
                    }
                    uwr.Dispose();
                };

                Texture2D texture = await tcs.Task;
                if (texture != null) {
                    Debug.Log($"[ARExperimentManager] adding marker '{marker.id}' to AR Library...");
                    // Add to the tracking library. marker.id is used because ObjectBuilder uses objectData.markerId to match!
                    mutableLibrary.ScheduleAddImageWithValidationJob(texture, marker.id, 0.15f); // 0.15m physical width hint
                }
            }

            // Apply new library
            try {
                // Best practice: disable manager before library swap to avoid native state conflicts
                bool wasEnabled = trackedImageManager.enabled;
                trackedImageManager.enabled = false;
                
                trackedImageManager.referenceLibrary = mutableLibrary;
                
                trackedImageManager.enabled = wasEnabled || true; 
                Debug.Log("[ARExperimentManager] Dynamic AR Markers initialization complete!");
            } catch (System.Exception ex) {
                Debug.LogError($"[ARExperimentManager] CRITICAL ERROR assigning library: {ex.Message}\n{ex.StackTrace}");
                // This might be the cause of SIGABRT if native calls fail
            }
        }
    }
}
