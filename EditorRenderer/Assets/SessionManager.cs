using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

public class SessionManager : MonoBehaviour
{
    void Awake()
    {
        #if !UNITY_EDITOR && UNITY_WEBGL
        WebGLInput.captureAllKeyboardInput = false;
        #endif
    }

    void Update()
    {
        #if !UNITY_EDITOR && UNITY_WEBGL
        if (WebGLInput.captureAllKeyboardInput)
        {
            WebGLInput.captureAllKeyboardInput = false;
        }
        #endif
    }
}
