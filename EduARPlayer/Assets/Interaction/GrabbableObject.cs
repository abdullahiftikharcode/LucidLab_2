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
            var cam = Camera.main.transform;
            var forward = Vector3.ProjectOnPlane(cam.forward, Vector3.up).normalized;
            var right = Vector3.ProjectOnPlane(cam.right, Vector3.up).normalized;

            // X-axis joystick input translates to rotating around the camera's up axis (Yaw)
            transform.Rotate(Vector3.up, -delta.x * rotateSpeed * dt, Space.World);

            // Y-axis joystick input translates to rotating around the camera's right axis (Pitch)
            // We use -delta.y so pushing up rotates the object "backward" (away from you), which feels natural
            transform.Rotate(right, delta.y * rotateSpeed * dt, Space.World);
        }

        public void ApplyHeightChange(float delta, float dt)
        {
            transform.position += Vector3.up * delta * heightSpeed * dt;
        }
    }
}
