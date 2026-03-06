using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using System.IO;
using System.Collections;

namespace Assets.Structures {
    public class SceneObject {
        public string objectName;
        public string objectType;
        public string color;
        public List<float> position;
        public List<float> rotation;
        public List<float> scale;
        public bool hasGravity;
        public bool isGrabbable;


        private GameObject _gameObject = null;
        private Dictionary<Renderer, Material> _colorMaterials;

        private bool IsPrimitiveObject() {
            return objectType is "cube" or "sphere" or "cylinder" or "capsule";
        }

        public async void InitGameobject() {
            switch (objectType) {
                case "cube":
                    _gameObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    break;
                case "sphere":
                    _gameObject = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    break;
                case "cylinder":
                    _gameObject = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    break;
                case "capsule":
                    _gameObject = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                    break;
                default:
                    _gameObject = new GameObject(objectName);
                    await ModelDownloader.ApplyModelToObject(objectType, _gameObject);

                    foreach (var renderer in _gameObject.GetComponentsInChildren<Renderer>()) {
                        var collider = renderer.gameObject.AddComponent<MeshCollider>();
                        collider.convex = true;
                    }
                    break;
            }

            _gameObject.AddComponent<Rigidbody>();

            UpdateColor();
            UpdateGravity();
            UpdatePosition();
            UpdateScale();
            UpdateRotation();
        }

        private static Shader _cachedStandardShader = null;
        private static Shader GetColorableShader() {
            if (_cachedStandardShader != null) return _cachedStandardShader;
            _cachedStandardShader = Shader.Find("Standard");
            if (_cachedStandardShader == null) _cachedStandardShader = Shader.Find("Legacy Shaders/Diffuse");
            if (_cachedStandardShader == null) _cachedStandardShader = Shader.Find("Unlit/Color");
            Debug.Log($"[SceneObject] Resolved color shader: '{_cachedStandardShader?.name ?? "NULL"}'");
            return _cachedStandardShader;
        }

        public void UpdateColor() {
            if (!_gameObject) throw new Exception("InitGameobject first!");

            if (!ColorUtility.TryParseHtmlString(color, out Color clr)) {
                Debug.LogWarning($"[SceneObject] Invalid color string for '{objectName}': {color}");
                return;
            }

            var renderers = _gameObject.GetComponentsInChildren<Renderer>();
            Debug.Log($"[SceneObject] UpdateColor '{objectName}' ({objectType}) -> {color}, renderers={renderers.Length}");

            if (_colorMaterials == null)
                _colorMaterials = new Dictionary<Renderer, Material>();

            foreach (var rend in renderers) {
                if (rend == null) continue;

                Material mat;
                if (!_colorMaterials.TryGetValue(rend, out mat) || mat == null) {
                    // Always create from a known-good shader, never copy from sharedMaterial
                    // (sharedMaterial can be InternalErrorShader in WebGL if the original shader didn't compile)
                    Shader shader = GetColorableShader();
                    if (shader == null) {
                        Debug.LogError($"[SceneObject] No usable shader found — cannot apply color to '{rend.gameObject.name}'");
                        continue;
                    }
                    mat = new Material(shader);
                    mat.name = $"{objectName}_colorMat";
                    _colorMaterials[rend] = mat;
                    Debug.Log($"[SceneObject]   Created new material for '{rend.gameObject.name}' using shader='{shader.name}'");
                }

                mat.color = clr;
                if (mat.HasProperty("_Color")) mat.SetColor("_Color", clr);
                if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", clr);

                rend.material = mat;
                Debug.Log($"[SceneObject]   Assigned color {clr} to '{rend.gameObject.name}', mat='{mat.name}'");
            }
        }

        public void UpdatePosition() {
            if (!_gameObject) throw new Exception("InitGameobject first!");

            float xPos = position[0] / 10.0f * (0.716f - -0.438f) + -0.438f;
            float zPos = position[2] / 10.0f * (-0.579f - -0.017f) + -0.017f;
            _gameObject.transform.localPosition = new Vector3(xPos, position[1], zPos);
        }

        public void UpdateScale() {
            if (!_gameObject) throw new Exception("InitGameobject first!");

            _gameObject.transform.localScale = new Vector3(scale[0], scale[1], scale[2]);
        }

        public void UpdateRotation() {
            if (!_gameObject) throw new Exception("InitGameobject first!");

            _gameObject.transform.rotation = Quaternion.Euler(rotation[0], rotation[1], rotation[2]);
        }

        public void UpdateGravity() {
            if (!_gameObject) throw new Exception("InitGameobject first!");

            var rigidBody = _gameObject.GetComponent<Rigidbody>();
            rigidBody.useGravity = hasGravity;
            rigidBody.isKinematic = true;
        }

        public void Dispose() {
            if (_colorMaterials != null) {
                foreach (var mat in _colorMaterials.Values) {
                    if (mat != null) UnityEngine.Object.Destroy(mat);
                }
                _colorMaterials.Clear();
            }
            if (_gameObject != null) {
                foreach (Transform child in _gameObject.transform) {
                    if (child != null) {
                        UnityEngine.Object.Destroy(child.gameObject);
                    }
                }
                UnityEngine.Object.Destroy(_gameObject);
                _gameObject = null;
            }
        }
    }
}
