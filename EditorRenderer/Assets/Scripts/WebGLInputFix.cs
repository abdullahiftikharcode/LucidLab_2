using UnityEngine;

public class WebGLInputFix : MonoBehaviour
{
    void Awake()
    {
        #if !UNITY_EDITOR && UNITY_WEBGL
        WebGLInput.captureAllKeyboardInput = false;
        #endif
    }
}
