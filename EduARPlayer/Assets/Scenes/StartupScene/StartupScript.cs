using System.Collections.Generic;
using System.Threading.Tasks;
using Firebase.Firestore;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class StartupScript : MonoBehaviour {
    private FirebaseFirestore _db;
    public GameObject ParentGameObject;
    public GameObject ButtonPrefab;

    private TMP_InputField _codeInput;
    private TextMeshProUGUI _statusText;
    private Button _submitButton;
    private bool _isLoading;

    private async void Start() {
        Debug.Log("[StartupScript] Start sequence initiated.");
        if (ParentGameObject == null) {
            Debug.LogError("[StartupScript] ParentGameObject is null!");
            return;
        }

        // Initialize Firebase and wait for dependencies
        Debug.Log("[StartupScript] Checking Firebase dependencies...");
        var dependencyStatus = await Firebase.FirebaseApp.CheckAndFixDependenciesAsync();
        Debug.Log($"[StartupScript] Dependency status: {dependencyStatus}");

        if (dependencyStatus != Firebase.DependencyStatus.Available) {
            Debug.LogError($"[StartupScript] Could not resolve all Firebase dependencies: {dependencyStatus}");
            return;
        }

        if (Firebase.FirebaseApp.DefaultInstance == null) {
            Debug.LogError("[StartupScript] FirebaseApp.DefaultInstance is NULL!");
            return;
        }

        Debug.Log("[StartupScript] Initializing Firestore...");
        try {
            _db = FirebaseFirestore.DefaultInstance;
            if (_db == null) {
                Debug.LogError("[StartupScript] FirebaseFirestore.DefaultInstance returned null!");
                return;
            }
            Debug.Log("[StartupScript] Firestore initialized.");
        } catch (System.Exception ex) {
            Debug.LogError($"[StartupScript] CRITICAL: Exception during Firestore initialization: {ex.Message}\n{ex.StackTrace}");
            return;
        }

        BuildCodeEntryUI();
    }

    private void BuildCodeEntryUI() {
        // Clear existing children
        foreach (Transform child in ParentGameObject.transform) {
            Destroy(child.gameObject);
        }

        // Remove any existing layout components that might interfere
        var oldLayout = ParentGameObject.GetComponent<VerticalLayoutGroup>();
        if (oldLayout != null) Destroy(oldLayout);
        var oldFitter = ParentGameObject.GetComponent<ContentSizeFitter>();
        if (oldFitter != null) Destroy(oldFitter);

        // === BACKGROUND PANEL ===
        var bgImage = ParentGameObject.GetComponent<Image>();
        if (bgImage == null) bgImage = ParentGameObject.AddComponent<Image>();
        bgImage.color = new Color(0.06f, 0.06f, 0.12f, 1f);

        // === APP TITLE ===
        var titleObj = CreateUIElement("Title", ParentGameObject.transform);
        var titleRect = titleObj.GetComponent<RectTransform>();
        titleRect.anchorMin = new Vector2(0.1f, 0.72f);
        titleRect.anchorMax = new Vector2(0.9f, 0.88f);
        titleRect.offsetMin = Vector2.zero;
        titleRect.offsetMax = Vector2.zero;
        var titleText = titleObj.AddComponent<TextMeshProUGUI>();
        titleText.text = "EduAR";
        titleText.fontSize = 64;
        titleText.fontStyle = FontStyles.Bold;
        titleText.alignment = TextAlignmentOptions.Center;
        titleText.color = Color.white;

        // === SUBTITLE ===
        var subtitleObj = CreateUIElement("Subtitle", ParentGameObject.transform);
        var subtitleRect = subtitleObj.GetComponent<RectTransform>();
        subtitleRect.anchorMin = new Vector2(0.1f, 0.64f);
        subtitleRect.anchorMax = new Vector2(0.9f, 0.72f);
        subtitleRect.offsetMin = Vector2.zero;
        subtitleRect.offsetMax = Vector2.zero;
        var subtitleText = subtitleObj.AddComponent<TextMeshProUGUI>();
        subtitleText.text = "AR Science Experiments Platform";
        subtitleText.fontSize = 22;
        subtitleText.alignment = TextAlignmentOptions.Center;
        subtitleText.color = new Color(0.7f, 0.7f, 0.85f, 1f);

        // === INSTRUCTION LABEL ===
        var labelObj = CreateUIElement("Label", ParentGameObject.transform);
        var labelRect = labelObj.GetComponent<RectTransform>();
        labelRect.anchorMin = new Vector2(0.1f, 0.52f);
        labelRect.anchorMax = new Vector2(0.9f, 0.60f);
        labelRect.offsetMin = Vector2.zero;
        labelRect.offsetMax = Vector2.zero;
        var labelText = labelObj.AddComponent<TextMeshProUGUI>();
        labelText.text = "Enter Experiment Code";
        labelText.fontSize = 24;
        labelText.alignment = TextAlignmentOptions.Center;
        labelText.color = new Color(0.85f, 0.85f, 0.95f, 1f);

        // === INPUT FIELD CONTAINER (rounded background) ===
        var inputContainer = CreateUIElement("InputContainer", ParentGameObject.transform);
        var inputContainerRect = inputContainer.GetComponent<RectTransform>();
        inputContainerRect.anchorMin = new Vector2(0.12f, 0.42f);
        inputContainerRect.anchorMax = new Vector2(0.88f, 0.52f);
        inputContainerRect.offsetMin = Vector2.zero;
        inputContainerRect.offsetMax = Vector2.zero;
        var inputBg = inputContainer.AddComponent<Image>();
        inputBg.color = new Color(0.15f, 0.15f, 0.25f, 1f);

        // === INPUT FIELD ===
        var inputFieldObj = CreateUIElement("CodeInputField", inputContainer.transform);
        var inputFieldRect = inputFieldObj.GetComponent<RectTransform>();
        inputFieldRect.anchorMin = Vector2.zero;
        inputFieldRect.anchorMax = Vector2.one;
        inputFieldRect.offsetMin = new Vector2(20, 5);
        inputFieldRect.offsetMax = new Vector2(-20, -5);

        // Text Area child
        var textAreaObj = CreateUIElement("Text Area", inputFieldObj.transform);
        var textAreaRect = textAreaObj.GetComponent<RectTransform>();
        textAreaRect.anchorMin = Vector2.zero;
        textAreaRect.anchorMax = Vector2.one;
        textAreaRect.offsetMin = Vector2.zero;
        textAreaRect.offsetMax = Vector2.zero;

        // Placeholder
        var placeholderObj = CreateUIElement("Placeholder", textAreaObj.transform);
        var placeholderRect = placeholderObj.GetComponent<RectTransform>();
        placeholderRect.anchorMin = Vector2.zero;
        placeholderRect.anchorMax = Vector2.one;
        placeholderRect.offsetMin = Vector2.zero;
        placeholderRect.offsetMax = Vector2.zero;
        var placeholderTMP = placeholderObj.AddComponent<TextMeshProUGUI>();
        placeholderTMP.text = "e.g. CHEM-042";
        placeholderTMP.fontSize = 28;
        placeholderTMP.fontStyle = FontStyles.Italic;
        placeholderTMP.color = new Color(0.5f, 0.5f, 0.6f, 0.7f);
        placeholderTMP.alignment = TextAlignmentOptions.Center;

        // Input Text
        var inputTextObj = CreateUIElement("Text", textAreaObj.transform);
        var inputTextRect = inputTextObj.GetComponent<RectTransform>();
        inputTextRect.anchorMin = Vector2.zero;
        inputTextRect.anchorMax = Vector2.one;
        inputTextRect.offsetMin = Vector2.zero;
        inputTextRect.offsetMax = Vector2.zero;
        var inputTMP = inputTextObj.AddComponent<TextMeshProUGUI>();
        inputTMP.fontSize = 28;
        inputTMP.color = Color.white;
        inputTMP.alignment = TextAlignmentOptions.Center;

        _codeInput = inputFieldObj.AddComponent<TMP_InputField>();
        _codeInput.textViewport = textAreaRect;
        _codeInput.textComponent = inputTMP;
        _codeInput.placeholder = placeholderTMP;
        _codeInput.characterValidation = TMP_InputField.CharacterValidation.None;
        _codeInput.contentType = TMP_InputField.ContentType.Standard;
        _codeInput.onSubmit.AddListener((_) => OnSubmitCode());

        // === SUBMIT BUTTON ===
        var buttonObj = CreateUIElement("SubmitButton", ParentGameObject.transform);
        var buttonRect = buttonObj.GetComponent<RectTransform>();
        buttonRect.anchorMin = new Vector2(0.2f, 0.30f);
        buttonRect.anchorMax = new Vector2(0.8f, 0.40f);
        buttonRect.offsetMin = Vector2.zero;
        buttonRect.offsetMax = Vector2.zero;
        var btnImage = buttonObj.AddComponent<Image>();
        btnImage.color = new Color(0.2f, 0.5f, 1f, 1f);

        var btnTextObj = CreateUIElement("ButtonText", buttonObj.transform);
        var btnTextRect = btnTextObj.GetComponent<RectTransform>();
        btnTextRect.anchorMin = Vector2.zero;
        btnTextRect.anchorMax = Vector2.one;
        btnTextRect.offsetMin = Vector2.zero;
        btnTextRect.offsetMax = Vector2.zero;
        var btnText = btnTextObj.AddComponent<TextMeshProUGUI>();
        btnText.text = "LAUNCH EXPERIMENT";
        btnText.fontSize = 26;
        btnText.fontStyle = FontStyles.Bold;
        btnText.alignment = TextAlignmentOptions.Center;
        btnText.color = Color.white;

        _submitButton = buttonObj.AddComponent<Button>();
        _submitButton.targetGraphic = btnImage;
        var btnColors = _submitButton.colors;
        btnColors.normalColor = new Color(0.2f, 0.5f, 1f, 1f);
        btnColors.highlightedColor = new Color(0.3f, 0.6f, 1f, 1f);
        btnColors.pressedColor = new Color(0.1f, 0.35f, 0.8f, 1f);
        btnColors.disabledColor = new Color(0.3f, 0.3f, 0.4f, 1f);
        _submitButton.colors = btnColors;
        _submitButton.onClick.AddListener(OnSubmitCode);

        // === STATUS TEXT ===
        var statusObj = CreateUIElement("StatusText", ParentGameObject.transform);
        var statusRect = statusObj.GetComponent<RectTransform>();
        statusRect.anchorMin = new Vector2(0.1f, 0.20f);
        statusRect.anchorMax = new Vector2(0.9f, 0.28f);
        statusRect.offsetMin = Vector2.zero;
        statusRect.offsetMax = Vector2.zero;
        _statusText = statusObj.AddComponent<TextMeshProUGUI>();
        _statusText.text = "";
        _statusText.fontSize = 20;
        _statusText.alignment = TextAlignmentOptions.Center;
        _statusText.color = new Color(1f, 0.4f, 0.4f, 1f);

        // === FOOTER ===
        var footerObj = CreateUIElement("Footer", ParentGameObject.transform);
        var footerRect = footerObj.GetComponent<RectTransform>();
        footerRect.anchorMin = new Vector2(0.1f, 0.04f);
        footerRect.anchorMax = new Vector2(0.9f, 0.10f);
        footerRect.offsetMin = Vector2.zero;
        footerRect.offsetMax = Vector2.zero;
        var footerText = footerObj.AddComponent<TextMeshProUGUI>();
        footerText.text = "Point your camera at the marker sheet after loading";
        footerText.fontSize = 16;
        footerText.alignment = TextAlignmentOptions.Center;
        footerText.color = new Color(0.5f, 0.5f, 0.6f, 0.8f);
    }

    private GameObject CreateUIElement(string name, Transform parent) {
        var obj = new GameObject(name, typeof(RectTransform));
        obj.transform.SetParent(parent, false);
        return obj;
    }

    private async void OnSubmitCode() {
        if (_isLoading) return;

        var code = _codeInput.text.Trim();
        if (string.IsNullOrEmpty(code)) {
            _statusText.text = "Please enter an experiment code.";
            _statusText.color = new Color(1f, 0.4f, 0.4f, 1f);
            return;
        }

        _isLoading = true;
        _submitButton.interactable = false;
        _statusText.text = "Loading experiment...";
        _statusText.color = new Color(0.7f, 0.85f, 1f, 1f);

        try {
            var docRef = _db.Collection("experiments").Document(code);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) {
                _statusText.text = "Experiment not found. Check the code and try again.";
                _statusText.color = new Color(1f, 0.4f, 0.4f, 1f);
                _isLoading = false;
                _submitButton.interactable = true;
                return;
            }

            _statusText.text = "Experiment found! Launching AR...";
            _statusText.color = new Color(0.4f, 1f, 0.6f, 1f);

            PlayerPrefs.SetString("expname", code);
            PlayerPrefs.Save();

            // Small delay so user sees the success message
            await Task.Delay(500);
            UnityEngine.SceneManagement.SceneManager.LoadScene("ARMainScene");
        } catch (System.Exception e) {
            Debug.LogError($"[StartupScript] Error validating experiment: {e.Message}\n{e.StackTrace}");
            _statusText.text = $"Error: {e.Message}";
            _statusText.color = new Color(1f, 0.4f, 0.4f, 1f);
            _isLoading = false;
            _submitButton.interactable = true;
        }
    }
}
