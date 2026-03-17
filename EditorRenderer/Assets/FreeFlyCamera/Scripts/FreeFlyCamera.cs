//===========================================================================//
//                       FreeFlyCamera (Version 1.2)                         //
//                        (c) 2019 Sergey Stafeyev                           //
//===========================================================================//

using UnityEngine;

[RequireComponent(typeof(Camera))]
public class FreeFlyCamera : MonoBehaviour
{
    #region UI

    [Space]

    [SerializeField]
    [Tooltip("The script is currently active")]
    private bool _active = true;

    [Space]

    [SerializeField]
    [Tooltip("Camera rotation by mouse movement is active")]
    private bool _enableRotation = true;

    [SerializeField]
    [Tooltip("Sensitivity of mouse rotation (orbit)")]
    private float _mouseSense = 2.8f;

    [SerializeField]
    [Tooltip("Clamp vertical angle (pitch) to avoid flipping. Degrees from horizontal.")]
    private float _pitchClamp = 88f;

    [Space]

    [SerializeField]
    [Tooltip("Camera zooming in/out by 'Mouse Scroll Wheel' is active")]
    private bool _enableTranslation = true;

    [SerializeField]
    [Tooltip("Velocity of camera zooming in/out")]
    private float _translationSpeed = 80f;

    [SerializeField]
    [Tooltip("Pan speed when using middle mouse or Shift+right-drag")]
    private float _panSpeed = 0.4f;

    [SerializeField]
    [Tooltip("Dolly speed when using Alt+right-drag (vertical) to move in/out")]
    private float _dollySpeed = 0.08f;

    [Space]

    [SerializeField]
    [Tooltip("Camera movement by 'W','A','S','D','Q','E' keys is active")]
    private bool _enableMovement = true;

    [SerializeField]
    [Tooltip("Camera movement speed")]
    private float _movementSpeed = 10f;

    [SerializeField]
    [Tooltip("Speed of the quick camera movement when holding the 'Left Shift' key")]
    private float _boostedSpeed = 50f;

    [SerializeField]
    [Tooltip("Boost speed")]
    private KeyCode _boostSpeed = KeyCode.LeftShift;

    [SerializeField]
    [Tooltip("Move up")]
    private KeyCode _moveUp = KeyCode.E;

    [SerializeField]
    [Tooltip("Move down")]
    private KeyCode _moveDown = KeyCode.Q;

    [Space]

    [SerializeField]
    [Tooltip("Acceleration at camera movement is active")]
    private bool _enableSpeedAcceleration = true;

    [SerializeField]
    [Tooltip("Rate which is applied during camera movement")]
    private float _speedAccelerationFactor = 1.5f;

    [Space]

    [SerializeField]
    [Tooltip("This keypress will move the camera to initialization position")]
    private KeyCode _initPositonButton = KeyCode.R;

    #endregion UI

    private float _currentIncrease = 1;
    private float _currentIncreaseMem = 0;

    private Vector3 _initPosition;
    private Vector3 _initRotation;

    private ToolController _toolController;

    private Vector3 _lastPanMousePos;
    private bool _isPanning;

#if UNITY_EDITOR
    private void OnValidate()
    {
        if (_boostedSpeed < _movementSpeed)
            _boostedSpeed = _movementSpeed;
    }
#endif

    private void Start()
    {
        _initPosition = transform.position;
        _initRotation = transform.eulerAngles;
        _toolController = FindObjectOfType<ToolController>();
    }

    private void CalculateCurrentIncrease(bool moving)
    {
        _currentIncrease = Time.deltaTime;

        if (!_enableSpeedAcceleration || _enableSpeedAcceleration && !moving)
        {
            _currentIncreaseMem = 0;
            return;
        }

        _currentIncreaseMem += Time.deltaTime * (_speedAccelerationFactor - 1);
        _currentIncrease = Time.deltaTime + Mathf.Pow(_currentIncreaseMem, 3) * Time.deltaTime;
    }

    private void Update()
    {
        if (!_active)
            return;

        bool isHandTool = _toolController != null && _toolController.currentTool == ToolController.ToolMode.Hand;
        bool isLeftMouseDown = Input.GetMouseButton(0);
        bool isRightMouseDown = Input.GetMouseButton(1);
        bool isMiddleMouseDown = Input.GetMouseButton(2);
        bool alt = Input.GetKey(KeyCode.LeftAlt) || Input.GetKey(KeyCode.RightAlt);

        // Dolly (move in depth): Alt+right-drag vertical
        bool wantDolly = isRightMouseDown && alt;
        if (wantDolly)
        {
            float dy = Input.GetAxis("Mouse Y");
            transform.position += transform.forward * (dy * _dollySpeed);
        }

        // Pan: left-drag when Hand tool is active, or middle mouse
        bool wantPan = !wantDolly && (isMiddleMouseDown || (isHandTool && isLeftMouseDown));
        if (wantPan)
        {
            if (!_isPanning)
            {
                _isPanning = true;
                _lastPanMousePos = Input.mousePosition;
            }
            Vector3 delta = Input.mousePosition - _lastPanMousePos;
            _lastPanMousePos = Input.mousePosition;
            float scale = _panSpeed * 0.01f;
            transform.position -= transform.right * (delta.x * scale);
            transform.position -= transform.up * (delta.y * scale);
        }
        else
        {
            _isPanning = false;
        }

        // Orbit + move only when Hand tool or right mouse (and not panning/dolly)
        bool shouldProcessMoveAndOrbit = (isHandTool || isRightMouseDown) && !wantPan && !wantDolly;

        if (shouldProcessMoveAndOrbit)
        {
            // Scroll zoom
            if (_enableTranslation)
                transform.Translate(Vector3.forward * Input.mouseScrollDelta.y * Time.deltaTime * _translationSpeed);

            // Movement: A/D = left/right, W/S = up/down, Q/E = depth in/out
            if (_enableMovement)
            {
                Vector3 deltaPosition = Vector3.zero;
                float currentSpeed = _movementSpeed;
                if (Input.GetKey(_boostSpeed))
                    currentSpeed = _boostedSpeed;
                // Horizontal
                if (Input.GetKey(KeyCode.A)) deltaPosition -= transform.right;
                if (Input.GetKey(KeyCode.D)) deltaPosition += transform.right;
                // Vertical (world up/down)
                if (Input.GetKey(KeyCode.W)) deltaPosition += transform.up;
                if (Input.GetKey(KeyCode.S)) deltaPosition -= transform.up;
                // Depth (forward/back)
                if (Input.GetKey(KeyCode.E)) deltaPosition += transform.forward;
                if (Input.GetKey(KeyCode.Q)) deltaPosition -= transform.forward;
                CalculateCurrentIncrease(deltaPosition != Vector3.zero);
                transform.position += deltaPosition * currentSpeed * _currentIncrease;
            }

            // Orbit: right-mouse drag only
            bool allowOrbit = _enableRotation && isRightMouseDown;
            if (allowOrbit)
            {
                float pitch = -Input.GetAxis("Mouse Y") * _mouseSense;
                float yaw = Input.GetAxis("Mouse X") * _mouseSense;
                transform.rotation *= Quaternion.AngleAxis(pitch, Vector3.right);
                transform.rotation = Quaternion.Euler(transform.eulerAngles.x, transform.eulerAngles.y + yaw, transform.eulerAngles.z);
                float x = transform.eulerAngles.x;
                if (x > 180f) x -= 360f;
                x = Mathf.Clamp(x, -_pitchClamp, _pitchClamp);
                transform.rotation = Quaternion.Euler(x, transform.eulerAngles.y, transform.eulerAngles.z);
            }
        }
        else if (!wantPan)
        {
            _isPanning = false;
        }

        if (Input.GetKeyDown(_initPositonButton))
        {
            transform.position = _initPosition;
            transform.eulerAngles = _initRotation;
        }
    }

    // Focus camera on a given scene object name (used by hierarchy double-click)
    public void FocusOnObject(string objectName)
    {
        if (string.IsNullOrEmpty(objectName)) return;
        var target = GameObject.Find(objectName);
        if (target == null) return;

        var targetPos = target.transform.position;
        // Position camera a bit above and behind the object, then look at it.
        Vector3 offset = new Vector3(0f, 1.5f, -4f);
        transform.position = targetPos + transform.rotation * offset;
        transform.LookAt(targetPos);
    }
}
