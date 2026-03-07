using UnityEngine;
using UnityEditor;
using System.IO;

public class GenerateUISprites
{
    [MenuItem("EduAR/Generate Joystick Assets")]
    public static void Generate()
    {
        string dir = "Assets/UI/Sprites";
        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

        // Joystick Base: 256x256
        GenerateCircleTex(dir + "/JoystickBackground.png", 256, 
            new Color(0, 0, 0, 0.1f), 
            new Color(0, 0, 0, 0.5f), 
            new Color(1f, 1f, 1f, 0.5f), 6);
            
        // Joystick Knob: 128x128
        GenerateCircleTex(dir + "/JoystickHandle.png", 128, 
            new Color(1f, 1f, 1f, 0.9f), 
            new Color(0.8f, 0.8f, 0.8f, 0.9f), 
            new Color(1f, 1f, 1f, 1f), 2);
            
        // Slider Base: 64x256, corner radius 32
        GenerateRoundedRect(dir + "/SliderBg.png", 64, 256, 32, 
            new Color(0, 0, 0, 0.1f), 
            new Color(0, 0, 0, 0.5f), 
            new Color(1f, 1f, 1f, 0.5f), 4);
            
        AssetDatabase.Refresh();
    }

    private static void GenerateCircleTex(string path, int size, Color centerColor, Color edgeColor, Color borderColor, int borderThickness)
    {
        Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
        float radius = size / 2f;
        Vector2 center = new Vector2(radius, radius);
        for(int y = 0; y < size; y++)
        {
            for(int x = 0; x < size; x++)
            {
                float d = Vector2.Distance(new Vector2(x, y), center);
                if(d <= radius)
                {
                    float t = d / radius;
                    Color c = Color.Lerp(centerColor, edgeColor, t*t);
                    if (d >= radius - borderThickness) c = borderColor;
                    
                    // Anti-aliasing at the edge
                    if (d > radius - 1f) c.a *= (radius - d); 
                    
                    tex.SetPixel(x, y, c);
                }
                else
                {
                    tex.SetPixel(x, y, new Color(0,0,0,0));
                }
            }
        }
        tex.Apply();
        File.WriteAllBytes(path, tex.EncodeToPNG());
        MakeSprite(path, Vector4.zero);
    }
    
    private static void GenerateRoundedRect(string path, int width, int height, int radius, Color centerColor, Color edgeColor, Color borderColor, int borderThickness)
    {
        Texture2D tex = new Texture2D(width, height, TextureFormat.RGBA32, false);
        for(int y = 0; y < height; y++)
        {
            for(int x = 0; x < width; x++)
            {
                float cx = Mathf.Max(radius, Mathf.Min(x, width - radius - 1));
                float cy = Mathf.Max(radius, Mathf.Min(y, height - radius - 1));
                float d = Vector2.Distance(new Vector2(x, y), new Vector2(cx, cy));
                
                if (d <= radius)
                {
                    float distFromCenter = Mathf.Abs(x - (width/2f)) / (width/2f);
                    Color c = Color.Lerp(centerColor, edgeColor, distFromCenter);
                    
                    bool inBorder = d >= radius - borderThickness || x < borderThickness || x >= width - borderThickness || y < borderThickness || y >= height - borderThickness;
                    if (inBorder) c = borderColor;
                    
                    // Anti-aliasing at the corner edges
                    if (d > radius - 1f) c.a *= (radius - d); 
                    
                    tex.SetPixel(x, y, c);
                }
                else
                {
                    tex.SetPixel(x, y, new Color(0,0,0,0));
                }
            }
        }
        tex.Apply();
        File.WriteAllBytes(path, tex.EncodeToPNG());
        MakeSprite(path, new Vector4(radius, radius, radius, radius));
    }

    private static void MakeSprite(string path, Vector4 spriteBorder)
    {
        AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate);
        TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
        if (importer != null)
        {
            importer.textureType = TextureImporterType.Sprite;
            importer.alphaIsTransparency = true;
            if (spriteBorder != Vector4.zero)
                importer.spriteBorder = spriteBorder;
            importer.SaveAndReimport();
        }
    }
}
