using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using LucidLab.UI;

namespace LucidLab.UI
{
    public class LoginWebController : MonoBehaviour
    {
        public CanvasGroup loadingScreen;
        [Tooltip("Minimum seconds the splash screen is shown")]
        public float minSplashDuration = 3f;
        private WebViewObject webViewObject;

        // Persistent WebViewObject that survives scene loads
        private static WebViewObject _persistentWebView;
        // Route callbacks to whichever LoginWebController is currently active
        private static LoginWebController _activeController;

        // Splash → app loading state
        private bool _splashLoaded;
        private bool _appLoadRequested;

        private void Awake()
        {
            _activeController = this;

            // Ensure Firebase is initialized (was previously in StartupScene)
            if (FirebaseInitializer.Instance == null)
            {
                var go = new GameObject("FirebaseInitializer");
                go.AddComponent<FirebaseInitializer>();
            }
        }

        private IEnumerator Start()
        {
            // Reuse existing webview if we're returning from another scene
            if (_persistentWebView != null)
            {
                webViewObject = _persistentWebView;
                webViewObject.SetVisibility(true);
                webViewObject.SetMargins(0, 0, 0, 0);
                // Skip loading screen since the page is already loaded
                if (loadingScreen != null)
                {
                    loadingScreen.alpha = 0f;
                    loadingScreen.gameObject.SetActive(false);
                }
                yield break;
            }

            _splashLoaded = false;
            _appLoadRequested = false;

            webViewObject = (new GameObject("WebViewObject")).AddComponent<WebViewObject>();
            DontDestroyOnLoad(webViewObject.gameObject);
            _persistentWebView = webViewObject;

            webViewObject.Init(
                cb: (msg) =>
                {
                    Debug.Log($"Callback from JS: {msg}");
                    if (_activeController != null)
                        _activeController.HandleJSMessage(msg);
                },
                err: (msg) => Debug.LogError($"WebView Error: {msg}"),
                httpErr: (msg) => Debug.LogError($"WebView HTTP Error: {msg}"),
                started: (msg) => Debug.Log($"WebView Started: {msg}"),
                hooked: (msg) => Debug.Log($"WebView Hooked: {msg}"),
                ld: (msg) =>
                {
                    Debug.Log($"WebView Loaded: {msg}");
                    if (_activeController == null) return;

                    if (!_activeController._splashLoaded)
                    {
                        // Splash page finished loading — show it and fade out the Unity canvas overlay
                        _activeController._splashLoaded = true;
                        if (_persistentWebView != null)
                            _persistentWebView.SetVisibility(true);
                        if (_activeController.loadingScreen != null)
                            _activeController.StartCoroutine(_activeController.FadeOutLoader());
                        // Start the timer to transition to the real app
                        _activeController.StartCoroutine(_activeController.LoadAppAfterSplash());
                    }
                    else if (_activeController._appLoadRequested)
                    {
                        // student_app.html finished loading — splash is naturally replaced
                        Debug.Log("[Splash] App loaded, splash dismissed.");
                    }
                },
                transparent: true
            );

            // Wait for initialization
            while (!webViewObject.IsInitialized())
            {
                yield return null;
            }

            webViewObject.SetMargins(0, 0, 0, 0);

            // Load the splash screen first
            string splashUrl = System.IO.Path.Combine(Application.streamingAssetsPath, "splash_screen.html");
            splashUrl = splashUrl.Replace("\\", "/");

#if UNITY_ANDROID && !UNITY_EDITOR
            webViewObject.LoadURL("file:///android_asset/splash_screen.html");
#else
            webViewObject.LoadURL("file://" + splashUrl);
#endif
        }

        /// <summary>
        /// Wait for the minimum splash duration, then navigate to the real app shell.
        /// The WebView keeps showing splash_screen.html until student_app.html finishes loading.
        /// </summary>
        private IEnumerator LoadAppAfterSplash()
        {
            yield return new WaitForSeconds(minSplashDuration);

            _appLoadRequested = true;

            string appUrl = System.IO.Path.Combine(Application.streamingAssetsPath, "student_app.html");
            appUrl = appUrl.Replace("\\", "/");

#if UNITY_ANDROID && !UNITY_EDITOR
            webViewObject.LoadURL("file:///android_asset/student_app.html");
#else
            webViewObject.LoadURL("file://" + appUrl);
#endif
        }

        private IEnumerator FadeOutLoader()
        {
            float duration = 0.5f;
            float startAlpha = loadingScreen.alpha;
            float time = 0;

            while (time < duration)
            {
                time += Time.deltaTime;
                loadingScreen.alpha = Mathf.Lerp(startAlpha, 0f, time / duration);
                yield return null;
            }
            
            loadingScreen.alpha = 0f;
            loadingScreen.gameObject.SetActive(false);
        }

        /// <summary>
        /// Navigate the shell to the home/app screens after successful authentication.
        /// </summary>
        public void NavigateToApp()
        {
            if (webViewObject != null)
            {
                webViewObject.EvaluateJS("navigate('home');");
            }
        }

        private void HandleJSMessage(string msg)
        {
            if (msg.StartsWith("start_ar:"))
            {
                string payload = msg.Substring("start_ar:".Length);
                Debug.Log($"[App] Starting AR for: {payload}");
                // Store experiment info so AR scene can load the right content
                PlayerPrefs.SetString("current_experiment", payload);
                // Parse experimentId for SceneLoader compatibility and SubmissionManager
                try {
                    var json = JsonUtility.FromJson<ArPayload>(payload);
                    if (!string.IsNullOrEmpty(json.experimentId))
                    {
                        PlayerPrefs.SetString("expname", json.experimentId);
                        PlayerPrefs.SetString("experimentId", json.experimentId);
                    }
                    if (!string.IsNullOrEmpty(json.classroomId))
                    {
                        PlayerPrefs.SetString("classroomId", json.classroomId);
                    }
                } catch {
                    PlayerPrefs.SetString("expname", payload);
                    PlayerPrefs.SetString("experimentId", payload);
                }
                PlayerPrefs.Save();
                // Hide webview instead of destroying it so we can restore it later
                if (_persistentWebView != null)
                    _persistentWebView.SetVisibility(false);
                SceneManager.LoadScene("ARMainScene");
            }
            else if (msg == "logout")
            {
                Debug.Log("[Auth] User logged out via Firebase");
            }
            else if (msg.StartsWith("set_student_id:"))
            {
                PlayerPrefs.SetString("studentId", msg.Substring("set_student_id:".Length));
                PlayerPrefs.Save();
            }
            else
            {
                Debug.Log($"[Shell] Unhandled message: {msg}");
            }
        }

        [System.Serializable]
        private class ArPayload {
            public string experimentId;
            public string title;
            public string mode;
            public string classroomId;
        }

        private void OnDestroy()
        {
            // Clear active controller reference but do NOT destroy the
            // persistent webview — it survives across scene loads.
            if (_activeController == this)
                _activeController = null;
        }
    }
}
