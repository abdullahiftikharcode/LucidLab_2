using UnityEngine;
using UnityEditor;
using System.Collections.Generic;

public class AddSceneToBuild
{
    [MenuItem("Tools/Add AtomicReaction To Build")]
    public static void AddScene()
    {
        string scenePath = "Assets/Scenes/AtomicReaction.unity";
        
        List<EditorBuildSettingsScene> scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
        
        bool found = false;
        foreach (var s in scenes)
        {
            if (s.path == scenePath)
            {
                found = true;
                break;
            }
        }
        
        if (!found)
        {
            scenes.Add(new EditorBuildSettingsScene(scenePath, true));
            EditorBuildSettings.scenes = scenes.ToArray();
            Debug.Log("Added " + scenePath + " to Build Settings.");
        }
        else
        {
            Debug.Log(scenePath + " is already in Build Settings.");
        }
    }
}