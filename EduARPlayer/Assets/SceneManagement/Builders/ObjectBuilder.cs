using System.Threading.Tasks;
using Assets.Interaction;
using Assets.SceneManagement.Core;
using Assets.SceneManagement.Models;
using GLTFast;
using TMPro;
using UnityEngine;
using UnityEngine.Assertions;

namespace Assets.SceneManagement.Builders {
    public class ObjectBuilder : MonoBehaviour {
        public ModelManager modelManager;
        public GameObject bigParent;

        /// <summary>
        /// The primary marker ID for the current scene. Objects without their own
        /// markerId will be anchored to this marker so everything renders on the desk.
        /// Set by SceneBuilder before building objects.
        /// </summary>
        public string primaryMarkerId;

        public async Task<Core.Object> CreateObjectFromData(ObjectData objectData) {
            GameObject gameObj;
            bool isCustomObj = false;
            switch (objectData.objectType) {
                case "cube":
                    gameObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    break;
                case "sphere":
                    gameObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    break;
                case "cylinder":
                    gameObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    break;
                case "capsule":
                    gameObj = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                    break;
                default:
                    gameObj = new GameObject();
                    if (modelManager != null) {
                        var cachedData = await modelManager.GetModelBytes(objectData.objectType);
                        Assert.IsNotNull(cachedData);
                        var gltf = new GltfImport();
                        var success = await gltf.Load(cachedData);
                        if (success) await gltf.InstantiateMainSceneAsync(gameObj.transform);
                    }
                    foreach (var renderer in gameObj.GetComponentsInChildren<Renderer>()) {
                        var collider = renderer.gameObject.AddComponent<MeshCollider>();
                        collider.convex = true;
                    }
                    isCustomObj = true;
                    break;
            }

            gameObj.name = objectData.objectName;
            gameObj.AddComponent<Rigidbody>();

            // Determine which marker this object anchors to
            string effectiveMarkerId = !string.IsNullOrEmpty(objectData.markerId)
                ? objectData.markerId
                : primaryMarkerId;

            // AR Marker Anchoring — every object gets a MarkerAnchor
            if (!string.IsNullOrEmpty(effectiveMarkerId)) {
                var anchor = gameObj.AddComponent<MarkerAnchor>();
                anchor.markerId = effectiveMarkerId;
                // Don't parent yet — MarkerAnchor.Start() will handle parenting when marker is detected
            }

            // Fallback: if no markers at all, parent to bigParent (non-AR mode)
            if (string.IsNullOrEmpty(effectiveMarkerId) && bigParent != null) {
                gameObj.transform.parent = bigParent.transform;
            }

            // Label follows the object
            var labelGameObject = new GameObject(objectData.objectName + " Label");
            labelGameObject.transform.parent = gameObj.transform;
            var syncComp = labelGameObject.AddComponent<LabelSyncComponent>();
            syncComp.modelGameObject = gameObj;
            labelGameObject.transform.localScale = new Vector3(-1, 1, 1);
            var textMeshPro = labelGameObject.AddComponent<TextMeshPro>();
            textMeshPro.text = objectData.showDesc ? objectData.objectName : "";
            textMeshPro.fontSize = 0.1f;
            textMeshPro.alignment = TextAlignmentOptions.Center;
            textMeshPro.verticalAlignment = VerticalAlignmentOptions.Middle;

            var obj = new Core.Object(gameObj, labelGameObject, isCustomObj);

            if (objectData.scale != null) obj.UpdateScale(objectData.scale);
            obj.UpdateGravity(objectData.hasGravity);
            if (!string.IsNullOrEmpty(objectData.color)) obj.UpdateColor(objectData.color);
            if (objectData.position != null) obj.UpdatePosition(objectData.position);
            if (objectData.rotation != null) obj.UpdateRotation(objectData.rotation);
            obj.UpdateGrabable(objectData.isGrabbable);

            return obj;
        }
    }
}

