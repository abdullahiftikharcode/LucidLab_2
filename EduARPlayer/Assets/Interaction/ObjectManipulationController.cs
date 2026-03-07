using UnityEngine;
using Assets.UI;

namespace Assets.Interaction
{
    public class ObjectManipulationController : MonoBehaviour
    {
        public VirtualJoystick leftJoystick;
        public VirtualJoystick rightJoystick;
        public HeightSlider heightSlider;
        public CanvasGroup joystickPanel;

        private GameObject _selectedObject;
        private GrabbableObject _grabbable;

        void Start()
        {
            HidePanel();
            
            var tapInteractor = FindObjectOfType<TapInteractor>();
            if (tapInteractor != null)
            {
                tapInteractor.OnObjectTapped.AddListener(OnObjectTapped);
                tapInteractor.OnEmptyTapped.AddListener(OnEmptyTapped);
            }
            
            ARExperimentManager.OnMarkerLost += OnMarkerLost;
        }

        void OnDestroy()
        {
            ARExperimentManager.OnMarkerLost -= OnMarkerLost;
            var tapInteractor = FindObjectOfType<TapInteractor>();
            if (tapInteractor != null)
            {
                tapInteractor.OnObjectTapped.RemoveListener(OnObjectTapped);
                tapInteractor.OnEmptyTapped.RemoveListener(OnEmptyTapped);
            }
        }

        public void OnObjectTapped(GameObject go)
        {
            Debug.Log($"[ObjectManipulationController] OnObjectTapped called for: {go.name}");
            //if (ARLockManager.IsLocked) 
            //{
            //    Debug.Log("[ObjectManipulationController] Scene is locked, ignoring tap.");
            //    return;
            //}

            var grabbable = go.GetComponentInParent<GrabbableObject>();
            if (grabbable == null)
            {
                var xrGrab = go.GetComponentInParent<UnityEngine.XR.Interaction.Toolkit.Interactables.XRGrabInteractable>();
                if (xrGrab != null)
                {
                    Debug.Log($"[ObjectManipulationController] Found XRGrabInteractable on {xrGrab.gameObject.name}, adding GrabbableObject component.");
                    grabbable = xrGrab.gameObject.AddComponent<GrabbableObject>();
                }
            }

            if (grabbable == null)
            {
                Debug.Log($"[ObjectManipulationController] Could not find or add GrabbableObject for {go.name}. Deselecting.");
                Deselect();
                return;
            }

            if (!grabbable.isGrabbable)
            {
                Debug.Log($"[ObjectManipulationController] Object {grabbable.name} has isGrabbable = false. Deselecting.");
                Deselect();
                return;
            }

            if (go == _selectedObject)
            {
                Debug.Log($"[ObjectManipulationController] Object {go.name} is already selected. Toggling off.");
                Deselect(); // toggle
                return;
            }

            Debug.Log($"[ObjectManipulationController] Submitting object {go.name} for Selection.");
            Select(go, grabbable);
        }

        public void OnEmptyTapped() => Deselect();
        
        private void OnMarkerLost(string markerName) => Deselect();

        private void Select(GameObject go, GrabbableObject grabbable)
        {
            _selectedObject = go;
            _grabbable = grabbable;
            ShowPanel();
        }

        private void Deselect()
        {
            _selectedObject = null;
            _grabbable = null;
            HidePanel();
        }

        private void ShowPanel()
        {
            Debug.Log($"[ObjectManipulationController] ShowPanel called. JoystickPanel assigned: {joystickPanel != null}");
            if (joystickPanel != null)
            {
                joystickPanel.alpha = 1;
                joystickPanel.interactable = true;
                joystickPanel.blocksRaycasts = true;
            }
        }

        private void HidePanel()
        {
            if (joystickPanel != null)
            {
                joystickPanel.alpha = 0;
                joystickPanel.interactable = false;
                joystickPanel.blocksRaycasts = false;
            }
        }

        void Update()
        {
            if (_selectedObject == null || _grabbable == null) return;
            //if (ARLockManager.IsLocked) return;

            if (rightJoystick != null && rightJoystick.Direction != Vector2.zero)
            {
                _grabbable.ApplyMovement(rightJoystick.Direction, Time.deltaTime);
            }

            if (leftJoystick != null && leftJoystick.Direction != Vector2.zero)
            {
                _grabbable.ApplyRotation(leftJoystick.Direction, Time.deltaTime);
            }

            if (heightSlider != null && heightSlider.Value != 0f)
            {
                _grabbable.ApplyHeightChange(heightSlider.Value, Time.deltaTime);
            }
        }
    }
}
