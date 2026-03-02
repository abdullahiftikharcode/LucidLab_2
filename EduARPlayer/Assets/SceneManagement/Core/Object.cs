using System;
using System.Collections.Generic;
using Assets.SceneManagement.Builders;
using Assets.SceneManagement.Misc;
using Assets.SceneManagement.Models;
using TMPro;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit.Interactables;

namespace Assets.SceneManagement.Core {
    public class Object {
        public readonly string Name;
        private readonly bool _hasCustomMaterial;
        private readonly GameObject _gameObject;
        private readonly GameObject _labelGameObject;

        public Object(GameObject obj, GameObject label, bool customMaterial) {
            _gameObject = obj;
            _labelGameObject = label;
            _hasCustomMaterial = customMaterial;
            Name = obj.name;
        }

        public void Destroy() {
            UnityEngine.Object.Destroy(_gameObject);
            if (_labelGameObject != null)
                UnityEngine.Object.Destroy(_labelGameObject);
        }

        public void UpdateColor(string color) {
            if (!ColorUtility.TryParseHtmlString(color, out Color clr)) return;
            if (!_hasCustomMaterial && _gameObject != null) {
                var renderer = _gameObject.GetComponent<Renderer>();
                if (renderer != null) renderer.material.color = clr;
            }
        }

        public void UpdateColor(float r, float g, float b) {
            if (!_hasCustomMaterial && _gameObject != null) {
                var renderer = _gameObject.GetComponent<Renderer>();
                if (renderer != null) renderer.material.color = new Color(r, g, b);
            }
        }

        public Vector3 GetPosition() {
            return PositionConverter.ToDesigner(_gameObject.transform.localPosition.x,
                _gameObject.transform.localPosition.y, _gameObject.transform.localPosition.z);
        }

        public void UpdatePosition(List<float> position) {
            if (position != null && position.Count >= 3)
                _gameObject.transform.localPosition = PositionConverter.FromDesigner(position[0], position[1], position[2]);
        }

        public Vector3 GetScale() => _gameObject.transform.localScale;

        public void UpdateScale(List<float> scale) {
            if (scale != null && scale.Count >= 3)
                _gameObject.transform.localScale = new Vector3(scale[0], scale[1], scale[2]);
        }

        public Vector3 GetRotation() => _gameObject.transform.rotation.eulerAngles;

        public void UpdateRotation(List<float> rotation) {
            if (rotation != null && rotation.Count >= 3)
                _gameObject.transform.rotation = Quaternion.Euler(rotation[0], rotation[1], rotation[2]);
        }

        public void UpdateGravity(bool hasGravity) {
            var rigidBody = _gameObject.GetComponent<Rigidbody>();
            if (rigidBody != null) {
                rigidBody.useGravity = hasGravity;
                rigidBody.isKinematic = !hasGravity;
            }
        }

        public void UpdateGrabable(bool isGrabable) {
            if (_gameObject == null) return;

            var grabbable = _gameObject.GetComponent<XRGrabInteractable>();
            if (isGrabable) {
                if (grabbable == null) {
                    grabbable = _gameObject.AddComponent<XRGrabInteractable>();
                    // Configure for better mobile AR feel
                    grabbable.movementType = XRBaseInteractable.MovementType.VelocityTracking;
                    grabbable.throwOnDetach = false; // Usually cleaner for educational apps
                }
            } else {
                if (grabbable != null) UnityEngine.Object.Destroy(grabbable);
            }
        }

        public void UpdateVisible(bool state) => _gameObject.SetActive(state);

        public void UpdateStaticFriction(float value) {
            foreach (var collider in _gameObject.GetComponentsInChildren<Collider>()) {
                if (collider.material == null) collider.material = new PhysicMaterial();
                collider.material.staticFriction = value;
            }
        }

        public void UpdateDynamicFriction(float value) {
            foreach (var collider in _gameObject.GetComponentsInChildren<Collider>()) {
                if (collider.material == null) collider.material = new PhysicMaterial();
                collider.material.dynamicFriction = value;
            }
        }

        public void UpdateBounciness(float value) {
            foreach (var collider in _gameObject.GetComponentsInChildren<Collider>()) {
                if (collider.material == null) collider.material = new PhysicMaterial();
                collider.material.bounciness = value;
            }
        }

        public void UpdateMass(float value) {
            var rigidBody = _gameObject.GetComponent<Rigidbody>();
            if (rigidBody != null) rigidBody.mass = value;
        }

        public float GetSpeed() {
            var rigidBody = _gameObject.GetComponent<Rigidbody>();
            return rigidBody != null ? rigidBody.velocity.magnitude : 0f;
        }

        public void SetDescription(string desc) {
            if (_labelGameObject != null) {
                var tmp = _labelGameObject.GetComponent<TextMeshPro>();
                if (tmp != null) tmp.text = desc;
            }
        }

        public void ApplyForce(Vector3 force) {
            var rigidBody = _gameObject.GetComponent<Rigidbody>();
            if (rigidBody != null) rigidBody.AddForce(force);
        }

        public Vector3 GetRealPosition() => _gameObject.transform.localPosition;

        public GameObject GetGameObject() => _gameObject;
    }
}
