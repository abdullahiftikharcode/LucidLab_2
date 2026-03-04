using System.Linq;
using Assets.Logic;
using Assets.Logic.Instructions;
using Assets.SceneManagement.Builders;
using Assets.SceneManagement.Models;
using Assets.Interaction;
using Firebase.Extensions;
using TMPro;
using UnityEngine;

namespace Assets.SceneManagement {
    public class SceneManager : MonoBehaviour {
        public SceneLoader sceneLoader;
        public SceneBuilder sceneBuilder;
        public LogicManager logicManager;
        public GameObject sceneDescriptionGameObject;
        public Assets.SceneManagement.Core.Scene currentScene;
        private string _experimentName;
        private bool _sceneReady;
        private bool _logicStartedOnce;
        private bool _loadingScene;

        public async void SetCurrentScene(SceneData sceneData) {
            _loadingScene = true;
            _sceneReady = false;
            logicManager.StopExecuting();
            _logicStartedOnce = false;
            if (currentScene != null) {
                currentScene.Destroy();
                currentScene = null;
            }

            currentScene = await sceneBuilder.CreateSceneFromData(sceneData);
            _sceneReady = true;
            _loadingScene = false;
            ShowDescription(currentScene.Description);
            // Don't start logic yet — wait for marker tracking in Update()
        }

        private void OnMarkerDetected(string markerId, Transform markerTransform) {
            if (_loadingScene) return; // Prevent race during async scene load

            // If no scene loaded yet, find the scene that owns this marker and load it
            if (currentScene == null) {
                var sceneWithMarker = sceneLoader.Scenes.FirstOrDefault(s =>
                    s.markers != null && s.markers.Any(m => m.id == markerId));
                if (sceneWithMarker != null) {
                    HideDescription();
                    SetCurrentScene(sceneWithMarker);
                }
                return;
            }

            // If current scene already owns this marker, ignore (handled by MarkerAnchor)
            if (currentScene.sceneData.markers != null && currentScene.sceneData.markers.Any(m => m.id == markerId)) return;

            // Marker belongs to a different scene — switch
            var newScene = sceneLoader.Scenes.FirstOrDefault(s =>
                s.markers != null && s.markers.Any(m => m.id == markerId));
            if (newScene != null) {
                SetCurrentScene(newScene);
            }
        }

        private void OnMarkerLost(string markerId) {
            // Pause logic when no markers are being tracked and not locked
            if (!ARLockManager.IsLocked && ARExperimentManager.MarkerTransforms.Count == 0 && logicManager.HasStartedExecuting) {
                logicManager.PauseExecuting();
            }
        }

        void StartSceneExecution() {
            if (currentScene == null) return;
            var startInstructions = currentScene.Instructions
                .Where(i => i is ExecInstruction exec && exec.IsStartInstruction)
                .Cast<ExecInstruction>().ToArray();
            var loopInstructions = currentScene.Instructions
                .Where(i => i is ExecInstruction exec && exec.IsLoopInstruction)
                .Cast<ExecInstruction>().ToArray();

            logicManager.InitLogicManager(startInstructions, loopInstructions);
            logicManager.StartExecuting();
            _logicStartedOnce = true;
        }

        void Update() {
            if (!_sceneReady || currentScene == null) return;

            bool hasActiveMarkers = ARExperimentManager.MarkerTransforms.Count > 0 || ARLockManager.IsLocked;

            // Start logic on first marker detection
            if (hasActiveMarkers && !_logicStartedOnce) {
                StartSceneExecution();
            }
            // Resume logic when markers reappear
            else if (hasActiveMarkers && _logicStartedOnce && !logicManager.HasStartedExecuting) {
                logicManager.ResumeExecuting();
            }
        }

        public void ShowDescription(string message) {
            if (sceneDescriptionGameObject != null) {
                sceneDescriptionGameObject.SetActive(true);
                var tmp = sceneDescriptionGameObject.GetComponentsInChildren<TextMeshProUGUI>()
                    .FirstOrDefault(x => x.name == "SceneDescriptionText");
                if (tmp != null) tmp.text = message;
            }
        }

        public void HideDescription() {
            if (sceneDescriptionGameObject != null) sceneDescriptionGameObject.SetActive(false);
        }

        async void Start() {
            ShowDescription("Loading experiment...");
            await sceneLoader.LoadAllScenes();

            if (sceneLoader.Scenes == null || sceneLoader.Scenes.Count == 0) {
                ShowDescription("No scenes found. Check experiment code.");
                return;
            }

            // Global Marker Discovery Setup
            var allMarkers = sceneLoader.Scenes
                .Where(s => s.markers != null)
                .SelectMany(s => s.markers).ToList();
            var arManager = FindObjectOfType<ARExperimentManager>();
            if (arManager != null) {
                ARExperimentManager.OnMarkerTracked += OnMarkerDetected;
                ARExperimentManager.OnMarkerLost += OnMarkerLost;
                if (allMarkers.Count > 0) {
                    await arManager.InitializeDynamicMarkersAsync(allMarkers);
                }
            }

            // Don't auto-load scene — show scan prompt and wait for marker
            ShowDescription("SCAN A MARKER TO START THE EXPERIMENT");
        }

        void OnDestroy() {
            ARExperimentManager.OnMarkerTracked -= OnMarkerDetected;
            ARExperimentManager.OnMarkerLost -= OnMarkerLost;
        }
    }
}
