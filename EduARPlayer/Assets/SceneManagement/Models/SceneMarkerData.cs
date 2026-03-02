using System;
using Firebase.Firestore;

namespace Assets.SceneManagement.Models {
    [Serializable]
    [FirestoreData]
    public class SceneMarkerData {
        [FirestoreProperty] public string id { get; set; }
        [FirestoreProperty] public string name { get; set; }
        [FirestoreProperty] public string imageUrl { get; set; }
    }
}
