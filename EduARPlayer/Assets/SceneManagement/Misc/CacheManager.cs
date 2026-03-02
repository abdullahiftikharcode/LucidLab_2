using System.IO;
using UnityEngine;

namespace Assets.SceneManagement.Misc {
    public static class CacheManager {
        public static byte[] GetFileFromCache(string fileName) {
            var path = Path.Combine(Application.persistentDataPath, fileName);
            return File.Exists(path) ? File.ReadAllBytes(path) : null;
        }

        public static void PutFileInCache(string fileName, byte[] file) {
            File.WriteAllBytes(Path.Combine(Application.persistentDataPath, fileName), file);
        }
    }
}
