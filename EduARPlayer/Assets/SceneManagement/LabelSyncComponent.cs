using UnityEngine;

namespace Assets.SceneManagement {
    public class LabelSyncComponent : MonoBehaviour {
        public GameObject modelGameObject;

        void Update() {
            if (!modelGameObject) return;

            if (!modelGameObject.activeSelf) {
                transform.position = new Vector3(0, 100, 0);
                return;
            }

            transform.LookAt(Camera.main != null ? Camera.main.transform : transform);

            var parentRenderers = modelGameObject.GetComponentsInChildren<Renderer>();
            if (parentRenderers.Length == 0) return;

            var bigBound = parentRenderers[0].bounds;
            foreach (var rr in parentRenderers)
                bigBound.Encapsulate(rr.bounds);

            transform.position = new Vector3(bigBound.center.x, bigBound.max.y + 0.02f, bigBound.center.z);
        }
    }
}
