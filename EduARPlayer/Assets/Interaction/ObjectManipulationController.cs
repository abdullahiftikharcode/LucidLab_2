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
            if (ARLockManager.IsLocked) return;

            var grabbable = go.GetComponentInParent<GrabbableObject>();
            if (grabbable == null)
            {
                var xrGrab = go.GetComponentInParent<UnityEngine.XR.Interaction.Toolkit.Interactables.XRGrabInteractable>();
                if (xrGrab != null)
                {
                    grabbable = xrGrab.gameObject.AddComponent<GrabbableObject>();
                }
            }

            if (grabbable == null || !grabbable.isGrabbable)
            {
                Deselect();
                return;
            }

            if (go == _selectedObject)
            {
                Deselect(); // toggle
                return;
            }

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
            if (ARLockManager.IsLocked) return;

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
