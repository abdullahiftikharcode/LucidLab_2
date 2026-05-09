using UnityEngine;
using UnityEditor;

public class FixPurpleMaterials
{
    [MenuItem("Tools/Fix Purple Materials")]
    public static void FixMaterials()
    {
        string[] guids = AssetDatabase.FindAssets("t:Material", new[] { "Assets/Materials" });
        int count = 0;
        Shader urpLit = Shader.Find("Universal Render Pipeline/Lit");
        
        if (urpLit == null)
        {
            Debug.LogError("URP Lit shader not found!");
            return;
        }

        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            Material mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat != null)
            {
                // Force reassign the shader
                mat.shader = urpLit;
                EditorUtility.SetDirty(mat);
                count++;
            }
        }
        
        // Also check if any text mesh pro materials need fixing
        string[] tmpGuids = AssetDatabase.FindAssets("t:Material", new[] { "Assets/TextMesh Pro/Resources/Fonts & Materials" });
        Shader tmpShader = Shader.Find("TextMeshPro/Distance Field");
        if (tmpShader != null)
        {
            foreach (string guid in tmpGuids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                Material mat = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (mat != null && mat.shader != null && mat.shader.name.Contains("TextMeshPro"))
                {
                    // Force refresh TMP shader
                    mat.shader = Shader.Find(mat.shader.name);
                    EditorUtility.SetDirty(mat);
                }
            }
        }

        AssetDatabase.SaveAssets();
        Debug.Log($"Fixed {count} materials in Assets/Materials.");
    }
}
