using System.Collections.Generic;
using System.Threading.Tasks;
using Assets.SceneManagement.Models;
using Firebase.Extensions;
using Firebase.Firestore;
using UnityEngine;

namespace Assets.SceneManagement {
    public class SceneLoader : MonoBehaviour {
        private FirebaseFirestore _db {
            get {
                if (__db == null) __db = FirebaseFirestore.DefaultInstance;
                return __db;
            }
        }
        private FirebaseFirestore __db;
        public string experimentName;
        public List<SceneData> Scenes { get; private set; }

        public async Task LoadAllScenes() {
            if (string.IsNullOrEmpty(experimentName)) {
                Debug.LogError("[SceneLoader] experimentName is null or empty!");
                return;
            }

            Scenes = new List<SceneData>();
            try {
                var scenesRef = _db.Collection($"experiments/{experimentName}/scenes");
                var snapshot = await scenesRef.GetSnapshotAsync();
                foreach (var documentSnapshot in snapshot.Documents) {
                    var scene = documentSnapshot.ConvertTo<SceneData>();
                    scene = await LoadScene(scene);
                    Scenes.Add(scene);
                }
                Scenes.Sort((a, b) => a.index - b.index);
            } catch (System.Exception e) {
                Debug.LogError($"[SceneLoader] Error loading scenes: {e.Message}");
            }
        }

        public async Task<SceneData> LoadScene(SceneData scene) {
            try {
                var objectsRef = _db.Collection($"experiments/{experimentName}/scenes/{scene.name}/objects");
                var snapshot = await objectsRef.GetSnapshotAsync();
                scene.objects = new List<ObjectData>();
                foreach (var documentSnapshot in snapshot.Documents) {
                    var obj = documentSnapshot.ConvertTo<ObjectData>();
                    scene.objects.Add(obj);
                }
            } catch (System.Exception e) {
                Debug.LogError($"[SceneLoader] Error loading scene {scene.name}: {e.Message}");
            }
            return scene;
        }

        public SceneData GetSceneIndex(int idx) => idx < Scenes?.Count ? Scenes[idx] : null;

        public SceneData GetSceneWithName(string nme) => Scenes?.Find(x => x.name == nme);

        void Start() {
            // Initialization handled via property getter
        }

        void Awake() {
            if (PlayerPrefs.HasKey("expname"))
                experimentName = PlayerPrefs.GetString("expname");
        }
    }
}
