using UnityEngine;

/// <summary>
/// Simple helper for UI buttons to load Unity scenes by name.
/// Attach to any button, then in OnClick drag this component and pick LoadScene.
/// </summary>
public class SceneNavigator : MonoBehaviour {
    public void LoadScene(string sceneName) {
        UnityEngine.SceneManagement.SceneManager.LoadScene(sceneName);
    }
}
