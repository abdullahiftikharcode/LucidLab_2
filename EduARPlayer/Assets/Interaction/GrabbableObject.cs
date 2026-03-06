using UnityEngine;

namespace Assets.Interaction
{
    public class GrabbableObject : MonoBehaviour
    {
        public bool isGrabbable = true;
        public float moveSpeed = 0.5f;
        public float rotateSpeed = 90f;
        public float heightSpeed = 0.4f;

        public void ApplyMovement(Vector2 delta, float dt)
        {
            var cam = Camera.main.transform;
            var forward = Vector3.ProjectOnPlane(cam.forward, Vector3.up).normalized;
            var right = Vector3.ProjectOnPlane(cam.right, Vector3.up).normalized;
            transform.position += (forward * delta.y + right * delta.x) * moveSpeed * dt;
        }

        public void ApplyRotation(Vector2 delta, float dt)
        {
            transform.Rotate(Vector3.up, delta.x * rotateSpeed * dt, Space.World);
            // Optional: Pitch from delta.y could be added here
        }

        public void ApplyHeightChange(float delta, float dt)
        {
            transform.position += Vector3.up * delta * heightSpeed * dt;
        }
    }
}
