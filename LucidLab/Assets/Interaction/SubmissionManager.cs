using System;
using System.Collections;
using System.Collections.Generic;
using Firebase.Auth;
using Firebase.Extensions;
using Firebase.Firestore;
using UnityEngine;
using Assets.Logic;
using Assets.SceneManagement.Models;

namespace Assets.Interaction
{
    /// <summary>
    /// Handles student experiment submissions.
    /// Called by ARHudController when the student confirms the Submit action,
    /// or when called directly from SubmitExperiment().
    ///
    /// Submission format mirrors how experiments are downloaded/stored so that
    /// the instructor's WebGL preview can load the same JSON without conversion.
    /// </summary>
    public class SubmissionManager : MonoBehaviour
    {
        // ── Public Events ─────────────────────────────────────────────────────
        public static event Action OnSubmissionStarted;
        public static event Action OnSubmissionSuccess;
        public static event Action<string> OnSubmissionFailed;

        // ── State ─────────────────────────────────────────────────────────────
        private bool _isSubmitting = false;

        // ── Public API ────────────────────────────────────────────────────────

        /// <summary>
        /// Trigger a submission for the current AR experiment session.
        /// Called by ARHudController.HandleToolbeltMsg when "submit_experiment" arrives.
        /// </summary>
        public void SubmitExperiment()
        {
            if (_isSubmitting)
            {
                Debug.LogWarning("[SubmissionManager] Already submitting — ignoring duplicate call.");
                return;
            }
            StartCoroutine(SubmitCoroutine());
        }

        /// <summary>
        /// Gets the current experiment state as a JSON string for WebView submission.
        /// </summary>
        public string GetCurrentStateJson()
        {
            var state = BuildSubmissionState();
            return JsonUtility.ToJson(state, prettyPrint: false);
        }


        // ── Private Coroutine ─────────────────────────────────────────────────

        private IEnumerator SubmitCoroutine()
        {
            _isSubmitting = true;
            OnSubmissionStarted?.Invoke();
            Debug.Log("[SubmissionManager] Submission started.");

            // 1. Read studentId from PlayerPrefs (passed down from the web UI)
            string studentId = PlayerPrefs.GetString("studentId", "");
            if (string.IsNullOrEmpty(studentId))
            {
                var err = "No authenticated studentId found in PlayerPrefs. Cannot submit.";
                Debug.LogError($"[SubmissionManager] {err}");
                OnSubmissionFailed?.Invoke(err);
                _isSubmitting = false;
                yield break;
            }
            string experimentId = PlayerPrefs.GetString("experimentId", "");
            string classroomId  = PlayerPrefs.GetString("classroomId", "");
            string expName      = PlayerPrefs.GetString("expname", "AR Experiment");

            if (string.IsNullOrEmpty(experimentId))
            {
                var err = "experimentId not set in PlayerPrefs. Cannot submit.";
                Debug.LogError($"[SubmissionManager] {err}");
                OnSubmissionFailed?.Invoke(err);
                _isSubmitting = false;
                yield break;
            }

            // 2. Collect current scene state from LogicManager (variables) + loaded SceneData
            var submissionState = BuildSubmissionState();

            // 3. Serialise to JSON (same format as the downloaded experiment JSON)
            string stateJson = JsonUtility.ToJson(submissionState, prettyPrint: false);

            // 4. Upload the submission document to Firestore `submissions` collection.
            //    The state JSON is stored inline (Firestore doc ≤ 1MB for typical scenes).
            //    If scenes become large, upload to Firebase Storage first and store the URL.
            var db = FirebaseFirestore.DefaultInstance;

            var docRef = db.Collection("submissions").Document();
            var submissionData = new Dictionary<string, object>
            {
                { "studentId",           studentId },
                { "experimentId",        experimentId },
                { "classroomId",         classroomId },
                { "experimentName",      expName },
                { "status",              "submitted" },
                { "stateJson",           stateJson },
                { "completionPct",       submissionState.completionPercentage },
                { "submittedAt",         FieldValue.ServerTimestamp },
                { "updatedAt",           FieldValue.ServerTimestamp },
                { "recordingUrl",        "" },   // placeholder — populate if recording exists
                { "instructorFeedback",  "" },
                { "grade",               "" },
            };

            bool uploadDone = false;
            string uploadError = null;

            docRef.SetAsync(submissionData).ContinueWithOnMainThread(task =>
            {
                if (task.IsFaulted || task.IsCanceled)
                {
                    uploadError = task.Exception?.Flatten().Message ?? "Unknown Firestore error";
                }
                uploadDone = true;
            });

            // Wait for the async Firestore call to complete
            yield return new WaitUntil(() => uploadDone);

            if (uploadError != null)
            {
                Debug.LogError($"[SubmissionManager] Upload failed: {uploadError}");
                OnSubmissionFailed?.Invoke(uploadError);
                _isSubmitting = false;
                yield break;
            }

            Debug.Log($"[SubmissionManager] Submission successful — doc: {docRef.Id}");
            OnSubmissionSuccess?.Invoke();
            _isSubmitting = false;
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        /// <summary>
        /// Collects the current experiment state from the LogicManager's variable store
        /// and any other runtime data available, and packages it in the same SubmissionState
        /// format that experiments are stored/downloaded in so the instructor WebGL viewer
        /// can consume it without conversion.
        /// </summary>
        private SubmissionState BuildSubmissionState()
        {
            var state = new SubmissionState();

            // Read scene name / index from PlayerPrefs (set by SceneNavigator when loading)
            state.sceneName  = PlayerPrefs.GetString("currentScene", "");
            state.experimentId = PlayerPrefs.GetString("experimentId", "");

            // Try to pull variable values from the active LogicManager
            var logicMgr = FindObjectOfType<LogicManager>();
            if (logicMgr != null && logicMgr.VariablesStore != null)
            {
                state.variables = new List<VariableSnapshot>();
                foreach (var kvp in logicMgr.VariablesStore)
                {
                    state.variables.Add(new VariableSnapshot
                    {
                        key   = kvp.Key,
                        value = kvp.Value?.ToString() ?? ""
                    });
                }
            }

            // Completion percentage — derive from variable "completion" if present, else 0
            if (logicMgr != null && logicMgr.VariablesStore != null &&
                logicMgr.VariablesStore.TryGetValue("completion", out var comp))
            {
                if (float.TryParse(comp?.ToString(), out float pct))
                    state.completionPercentage = pct;
            }

            state.submittedAt = DateTime.UtcNow.ToString("o"); // ISO-8601
            return state;
        }
    }

    // ── Data types used in the submission payload ─────────────────────────────

    [Serializable]
    public class SubmissionState
    {
        public string               experimentId;
        public string               sceneName;
        public float                completionPercentage;
        public string               submittedAt;
        public List<VariableSnapshot> variables;
    }

    [Serializable]
    public class VariableSnapshot
    {
        public string key;
        public string value;
    }
}
