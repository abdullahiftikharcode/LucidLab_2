using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Assets.SceneManagement;
using Assets.Logic;
using Assets.SceneManagement;

namespace Assets.Interaction
{
    /// <summary>
    /// Manages multiple small transparent WebView overlays for the AR HUD.
    /// Each panel occupies only its screen region so Unity receives touches elsewhere.
    /// Display-only panels (instruction, task) have interaction disabled so touches
    /// pass straight through. Interactive panels (top bar, toolbelt) forward touch
    /// coordinates back to Unity so the AR scene can also process taps.
    /// </summary>
    public class ARHudController : MonoBehaviour
    {
        [Header("WebView")]
        [Tooltip("Set to true to use the HTML HUD instead of the native Canvas UI")]
        public bool useHtmlHud = true;

        [Header("Native UI (will be hidden when HTML HUD is active)")]
        public GameObject nativeCanvas;

        [Header("Layout — fractions of screen")]
        [Range(0.06f, 0.20f)] public float topBarHeight = 0.12f;
        [Range(0.10f, 0.30f)] public float modeToggleHeight = 0.06f;
        [Range(0.05f, 0.14f)] public float toolbeltWidth = 0.12f;
        [Range(0.20f, 0.55f)] public float toolbeltHeight = 0.45f;
        [Range(0.30f, 0.60f)] public float instructionWidth = 0.50f;
        [Range(0.05f, 0.15f)] public float instructionHeight = 0.10f;
        [Range(0.40f, 0.70f)] public float taskWidth = 0.55f;
        [Range(0.06f, 0.14f)] public float taskHeight = 0.10f;

        // WebViews
        private WebViewObject _topBar;
        private WebViewObject _modeToggle;
        private WebViewObject _toolbelt;
        private WebViewObject _instruction;
        private WebViewObject _task;
        private WebViewObject _confirm;   // full-screen submit-confirm overlay

        // Ready flags
        private bool _topBarReady;
        private bool _modeToggleReady;
        private bool _toolbeltReady;
        private bool _instructionReady;
        private bool _taskReady;

        private SceneNavigator _sceneNavigator;
        private TapInteractor _tapInteractor;
        private ScreenOrientation _lastOrientation;
        private int _lastScreenWidth;
        private int _lastScreenHeight;

        void Start()
        {
            if (!useHtmlHud) return;

            // Make replaced Canvas children invisible but keep them active so their
            // scripts (e.g. TrackingModeToggleUI) remain findable via FindObjectOfType.
            if (nativeCanvas != null)
            {
                foreach (Transform child in nativeCanvas.transform)
                {
                    string n = child.gameObject.name;
                    if (n == "JoystickPanel")
                        continue; // keep visible + active

                    var cg = child.gameObject.GetComponent<CanvasGroup>();
                    if (cg == null) cg = child.gameObject.AddComponent<CanvasGroup>();
                    cg.alpha = 0f;
                    cg.interactable = false;
                    cg.blocksRaycasts = false;
                }
            }

            _sceneNavigator = FindObjectOfType<SceneNavigator>();
            _tapInteractor = FindObjectOfType<TapInteractor>();

            StartCoroutine(InitAllPanels());
        }

        // ===== Initialization =====

        private IEnumerator InitAllPanels()
        {
            // Start all five panel inits in parallel via coroutines
            StartCoroutine(InitPanel("ARHud_TopBar", "ar_hud.html", HandleTopBarMsg, (wv) => _topBar = wv));
            StartCoroutine(InitPanel("ARHud_ModeToggle", "ar_mode_toggle.html", HandleModeToggleMsg, (wv) => _modeToggle = wv));
            StartCoroutine(InitPanel("ARHud_Toolbelt", "ar_toolbelt.html", HandleToolbeltMsg, (wv) => _toolbelt = wv));
            StartCoroutine(InitPanel("ARHud_Instruction", "ar_instruction.html", HandleInstructionMsg, (wv) => _instruction = wv));
            StartCoroutine(InitPanel("ARHud_Task", "ar_task.html", HandleTaskMsg, (wv) => _task = wv));

            // Wait until all are initialized (WebViewObject created), then apply margins
            yield return new WaitUntil(() => _topBar != null && _modeToggle != null && _toolbelt != null && _instruction != null && _task != null);

            ApplyAllMargins();
            _lastOrientation = Screen.orientation;
            _lastScreenWidth = Screen.width;
            _lastScreenHeight = Screen.height;

            // Disable touch interception on display-only panels — touches pass to Unity
            _instruction.SetInteractionEnabled(false);
            _task.SetInteractionEnabled(false);

            // Wait for top bar ready, then set title
            yield return new WaitUntil(() => _topBarReady);
            string expName = PlayerPrefs.GetString("expname", "AR Experiment");
            EvalOnPanel(_topBar, $"setTitle('{EscapeJS(expName)}');");
        }

        private IEnumerator InitPanel(string goName, string htmlFile,
            System.Action<string> cb, System.Action<WebViewObject> assign)
        {
            var wv = (new GameObject(goName)).AddComponent<WebViewObject>();

            wv.Init(
                cb: (msg) => cb(msg),
                err: (msg) => Debug.LogError($"[{goName}] Error: {msg}"),
                httpErr: (msg) => Debug.LogError($"[{goName}] HTTP Error: {msg}"),
                started: (msg) => Debug.Log($"[{goName}] Started: {msg}"),
                ld: (msg) =>
                {
                    Debug.Log($"[{goName}] Loaded: {msg}");
                    wv.SetVisibility(true);
                },
                transparent: true
            );

            while (!wv.IsInitialized())
                yield return null;

#if UNITY_ANDROID && !UNITY_EDITOR
            wv.LoadURL("file:///android_asset/" + htmlFile);
#else
            string url = System.IO.Path.Combine(Application.streamingAssetsPath, htmlFile).Replace("\\", "/");
            wv.LoadURL("file://" + url);
#endif

            assign(wv);
        }

        // ===== Touch Forwarding =====
        // Interactive panels send "touch_at:screenX,screenY" after handling button clicks.
        // We simulate a tap in the AR scene so objects can still be selected through the HUD.

        private void ForwardTouchToUnity(string msg)
        {
            // msg format: "touch_at:123,456" (screen pixels from top-left)
            if (!msg.StartsWith("touch_at:")) return;
            string[] parts = msg.Substring(9).Split(',');
            if (parts.Length != 2) return;
            if (!float.TryParse(parts[0], System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out float sx)) return;
            if (!float.TryParse(parts[1], System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out float sy)) return;

            // WebView reports Y from top, Unity Screen space has Y from bottom
            Vector2 screenPos = new Vector2(sx, Screen.height - sy);

            var cam = Camera.main;
            if (cam == null) return;

            if (_tapInteractor == null)
                _tapInteractor = FindObjectOfType<TapInteractor>();
            if (_tapInteractor == null) return;

            var ray = cam.ScreenPointToRay(screenPos);
            if (Physics.Raycast(ray, out RaycastHit hit, _tapInteractor.maxDistance, _tapInteractor.interactableLayer))
                _tapInteractor.OnObjectTapped?.Invoke(hit.collider.gameObject);
            else
                _tapInteractor.OnEmptyTapped?.Invoke();
        }

        // ===== Message Handlers =====

        private void HandleTopBarMsg(string msg)
        {
            if (msg.StartsWith("touch_at:")) { ForwardTouchToUnity(msg); return; }

            switch (msg)
            {
                case "hud_ready":
                    _topBarReady = true;
                    break;
                case "back":
                    if (_sceneNavigator != null)
                        _sceneNavigator.LoadScene("StartupScene");
                    else
                        UnityEngine.SceneManagement.SceneManager.LoadScene("LoginScene");
                    break;
                case "toggle_lock":
                    var lockMgr = FindObjectOfType<ARLockManager>();
                    if (lockMgr != null) lockMgr.ToggleLock();
                    break;
            }
        }

        private void HandleModeToggleMsg(string msg)
        {
            if (msg.StartsWith("touch_at:")) { ForwardTouchToUnity(msg); return; }

            switch (msg)
            {
                case "mode_toggle_ready":
                    _modeToggleReady = true;
                    break;
                case "mode_marker":
                    var t1 = FindObjectOfType<TrackingModeToggleUI>();
                    if (t1 != null && t1.CurrentMode != TrackingModeToggleUI.TrackingMode.Marker)
                        t1.Toggle();
                    break;
                case "mode_plane":
                    var t2 = FindObjectOfType<TrackingModeToggleUI>();
                    if (t2 != null && t2.CurrentMode != TrackingModeToggleUI.TrackingMode.Plane)
                        t2.Toggle();
                    break;
            }
        }

        private void HandleToolbeltMsg(string msg)
        {
            if (msg.StartsWith("touch_at:")) { ForwardTouchToUnity(msg); return; }

            switch (msg)
            {
                case "toolbelt_ready":
                    _toolbeltReady = true;
                    break;

                case "open_submit_confirm":
                    // Show the dedicated full-screen confirmation panel
                    ShowSubmitConfirm();
                    break;

                default:
                    Debug.Log($"[ARHud Toolbelt] {msg}");
                    break;
            }
        }

        // ── Submit Confirm panel lifecycle ──────────────────────────────────────

        private void ShowSubmitConfirm()
        {
            if (_confirm != null) return; // already visible

            StartCoroutine(InitConfirmPanel());
        }

        private IEnumerator InitConfirmPanel()
        {
            var wv = (new GameObject("ARHud_SubmitConfirm")).AddComponent<WebViewObject>();

            wv.Init(
                cb:      (msg) => HandleConfirmMsg(msg),
                err:     (msg) => Debug.LogError($"[ARHud_SubmitConfirm] Error: {msg}"),
                httpErr: (msg) => Debug.LogError($"[ARHud_SubmitConfirm] HTTP Error: {msg}"),
                started: (msg) => Debug.Log($"[ARHud_SubmitConfirm] Started: {msg}"),
                ld:      (msg) =>
                {
                    Debug.Log($"[ARHud_SubmitConfirm] Loaded: {msg}");
                    wv.SetVisibility(true);
                },
                transparent: true
            );

            while (!wv.IsInitialized())
                yield return null;

#if UNITY_ANDROID && !UNITY_EDITOR
            wv.LoadURL("file:///android_asset/ar_submit_confirm.html");
#else
            string url = System.IO.Path.Combine(Application.streamingAssetsPath, "ar_submit_confirm.html").Replace("\\", "/");
            wv.LoadURL("file://" + url);
#endif
            // Full-screen margins (0,0,0,0) so it covers everything
            wv.SetMargins(0, 0, 0, 0);
            _confirm = wv;
        }

        private void CloseSubmitConfirm()
        {
            if (_confirm == null) return;
            Destroy(_confirm.gameObject);
            _confirm = null;
        }

        private void HandleConfirmMsg(string msg)
        {
            if (msg == "confirm_ready")
            {
                PushContextToConfirm();
            }
            else if (msg == "close_submit_confirm")
            {
                CloseSubmitConfirm();
            }
            else if (msg == "submission_success")
            {
                Debug.Log("[ARHudController] Submission succeeded via WebView");
                CloseSubmitConfirm();
            }
            else if (msg.StartsWith("submission_failed:"))
            {
                string error = msg.Substring("submission_failed:".Length);
                Debug.LogError("[ARHudController] Submission failed via WebView: " + error);
            }
            else
            {
                Debug.Log($"[ARHud Confirm] {msg}");
            }
        }

        private void PushContextToConfirm()
        {
            if (_confirm == null) return;

            string stateJson = string.Empty;
            float progress = 0f;
            var subManager = FindObjectOfType<SubmissionManager>();
            if (subManager != null)
            {
                stateJson = subManager.GetCurrentStateJson();
            }

            var logicMgr = FindObjectOfType<LogicManager>();
            if (logicMgr != null && logicMgr.VariablesStore.TryGetValue("completion", out var comp))
            {
                float.TryParse(comp?.ToString(), out progress);
            }

            var context = new ConfirmContext
            {
                type = "confirm_context",
                progress = progress,
                status = progress >= 100f ? "Complete" : "In Progress",
                studentId = PlayerPrefs.GetString("studentId", "unknown"),
                experimentId = PlayerPrefs.GetString("experimentId", "unknown"),
                classroomId = PlayerPrefs.GetString("classroomId", "unknown"),
                expname = PlayerPrefs.GetString("expname", "Untitled"),
                stateJson = stateJson
            };

            string json = JsonUtility.ToJson(context);
            _confirm.EvaluateJS($"window.postMessage({json}, '*');");
        }

        [System.Serializable]
        private class ConfirmContext
        {
            public string type;
            public float  progress;
            public string status;
            public string studentId;
            public string experimentId;
            public string classroomId;
            public string expname;
            public string stateJson;
        }



        private void HandleInstructionMsg(string msg)
        {
            if (msg == "instruction_ready") _instructionReady = true;
        }

        private void HandleTaskMsg(string msg)
        {
            if (msg == "task_ready") _taskReady = true;
        }

        // ===== Margin Layout =====

        private void ApplyAllMargins()
        {
            int sw = Screen.width;
            int sh = Screen.height;
            bool landscape = sw > sh;

            // ---- Top bar: full width, top portion ----
            // Landscape screens are short so use a bigger fraction
            float tbFrac = landscape ? 0.16f : topBarHeight;
            int topH = Mathf.Max(70, Mathf.RoundToInt(sh * tbFrac));
            _topBar.SetMargins(0, 0, 0, sh - topH);

            // ---- Mode toggle: below top bar, left aligned ----
            float mtFracH = landscape ? 0.12f : modeToggleHeight;
            int mtH = Mathf.Max(40, Mathf.RoundToInt(sh * mtFracH));
            float mtFracW = landscape ? 0.22f : 0.45f; // portrait needs wider
            int mtW = Mathf.Max(200, Mathf.RoundToInt(sw * mtFracW));
            int mtGap = landscape ? 4 : 2; // small gap between top bar and toggle
            _modeToggle.SetMargins(0, topH + mtGap, sw - mtW, sh - topH - mtGap - mtH);

            // ---- Toolbelt: left edge, vertically centered ----
            int tbW = Mathf.Max(60, Mathf.RoundToInt(sw * toolbeltWidth));
            int tbH = Mathf.RoundToInt(sh * toolbeltHeight);
            int tbTop = (sh - tbH) / 2;
            _toolbelt.SetMargins(0, tbTop, sw - tbW, sh - tbTop - tbH);

            // ---- Instruction: centered in area right of toolbelt ----
            int insW = Mathf.RoundToInt(sw * instructionWidth);
            int insH = Mathf.RoundToInt(sh * instructionHeight);
            int availLeft = tbW;
            int insLeft = availLeft + (sw - availLeft - insW) / 2;
            insLeft = Mathf.Max(insLeft, availLeft);
            int insTop = Mathf.RoundToInt(sh * 0.38f);
            _instruction.SetMargins(insLeft, insTop, sw - insLeft - insW, sh - insTop - insH);

            // ---- Task card: centered horizontally, near bottom ----
            int taskW = Mathf.RoundToInt(sw * taskWidth);
            int taskH = Mathf.RoundToInt(sh * taskHeight);
            int taskLeft = (sw - taskW) / 2;
            int taskBottom = Mathf.RoundToInt(sh * 0.02f);
            _task.SetMargins(taskLeft, sh - taskBottom - taskH, sw - taskLeft - taskW, taskBottom);
        }

        void Update()
        {
            if (_topBar == null) return;
            if (Screen.orientation != _lastOrientation
                || Screen.width != _lastScreenWidth
                || Screen.height != _lastScreenHeight)
            {
                _lastOrientation = Screen.orientation;
                _lastScreenWidth = Screen.width;
                _lastScreenHeight = Screen.height;
                ApplyAllMargins();
            }
        }

        // ===== Public API =====

        public void SetTrackingStatus(string status)
        {
            if (!_topBarReady) return;
            EvalOnPanel(_topBar, $"setTrackingStatus('{EscapeJS(status)}');");
        }

        public void SetLockState(string state)
        {
            if (!_topBarReady) return;
            EvalOnPanel(_topBar, $"setLockState('{EscapeJS(state)}');");
        }

        public void SetMode(string mode)
        {
            if (!_modeToggleReady) return;
            EvalOnPanel(_modeToggle, $"setMode('{EscapeJS(mode)}');");
        }

        public void SetInstruction(string text)
        {
            if (!_instructionReady) return;
            EvalOnPanel(_instruction, $"setInstruction('{EscapeJS(text)}');");
        }

        public void HideInstruction()
        {
            if (!_instructionReady) return;
            EvalOnPanel(_instruction, "hideInstruction();");
        }

        public void SetTask(string text, int progressPercent)
        {
            if (!_taskReady) return;
            EvalOnPanel(_task, $"setTask('{EscapeJS(text)}', {progressPercent});");
        }

        public void SetTitle(string title)
        {
            if (!_topBarReady) return;
            EvalOnPanel(_topBar, $"setTitle('{EscapeJS(title)}');");
        }

        // ===== Helpers =====

        private void EvalOnPanel(WebViewObject wv, string js)
        {
            if (wv != null) wv.EvaluateJS(js);
        }

        private static string EscapeJS(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("'", "\\'").Replace("\n", "\\n").Replace("\r", "");
        }

        void OnDestroy()
        {
            if (_topBar     != null) Destroy(_topBar.gameObject);
            if (_modeToggle != null) Destroy(_modeToggle.gameObject);
            if (_toolbelt   != null) Destroy(_toolbelt.gameObject);
            if (_instruction!= null) Destroy(_instruction.gameObject);
            if (_task       != null) Destroy(_task.gameObject);
            if (_confirm    != null) Destroy(_confirm.gameObject);
        }
    }
}
