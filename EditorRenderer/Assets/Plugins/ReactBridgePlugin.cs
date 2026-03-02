using System.Runtime.InteropServices;

public static class ReactBridge
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    public static extern void SendObjectSelected(string objectName);
#else
    // Mock implementation for Unity Editor
    public static void SendObjectSelected(string objectName)
    {
        UnityEngine.Debug.Log($"[ReactBridge Mock] ObjectSelected: '{objectName}'");
    }
#endif
}
