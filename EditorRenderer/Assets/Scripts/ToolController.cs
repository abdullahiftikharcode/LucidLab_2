using UnityEngine;
using RuntimeHandle;

public class ToolController : MonoBehaviour
{
    // These strings must exactly match the ToolMode enum in React
    public enum ToolMode
    {
        Hand,
        Move,
        Rotate,
        Scale,
        Rect,
        Transform
    }

    [SerializeField]
    public ToolMode currentTool = ToolMode.Hand;

    private string selectedObjectName = "";
    private ObjectManagement objectManager;
    private Camera mainCamera;
    private RuntimeTransformHandle runtimeHandle;

    void Start()
    {
        objectManager = GetComponent<ObjectManagement>();
        mainCamera = Camera.main;

        // Try to find an existing RuntimeTransformHandle in the scene; if not, create one
        runtimeHandle = FindObjectOfType<RuntimeTransformHandle>();
        if (runtimeHandle == null)
        {
            runtimeHandle = RuntimeTransformHandle.Create(null, HandleType.POSITION);
            runtimeHandle.gameObject.name = "RuntimeTransformHandle";
        }

        runtimeHandle.gameObject.SetActive(false);
    }

    /// <summary>
    /// Called from React via UnityContext.sendMessage("SceneController", "SetToolMode", "Move")
    /// </summary>
    public void SetToolMode(string modeString)
    {
        if (System.Enum.TryParse(modeString, out ToolMode newMode))
        {
            currentTool = newMode;
            Debug.Log($"[ToolController] Tool mode changed to: {currentTool}");
            SyncHandleMode();
        }
        else
        {
            Debug.LogWarning($"[ToolController] Unknown tool mode: {modeString}");
        }
    }

    void Update()
    {
        // Handle object selection via Raycast on left mouse click
        // Only allow selection if the mouse is not captured by a camera pan (which uses right/middle click typically, or we can just check if Hand tool is active, but selection is usually always allowed)
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = mainCamera.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out RaycastHit hit))
            {
                // If we clicked on a RuntimeTransformHandle gizmo, don't change selection
                var handleHit = hit.collider.gameObject.GetComponentInParent<HandleBase>();
                if (handleHit != null)
                {
                    return;
                }

                string hitObjectName = hit.collider.gameObject.name;
                
                // Exclude the ground from selection if needed, assuming ground has a specific name or layer
                if (hitObjectName != "Ground" && hitObjectName != "Plane") 
                {
                    SelectObject(hitObjectName);
                }
                else
                {
                    DeselectObject();
                }
            }
            else
            {
                // Clicked on empty space
                DeselectObject();
            }
        }
    }

    private void SelectObject(string objectName)
    {
        if (selectedObjectName == objectName) return; // Already selected

        selectedObjectName = objectName;
        Debug.Log($"[ToolController] Selected object: {selectedObjectName}");

        // Attach runtime handle to the selected object
        if (runtimeHandle != null)
        {
            var selectedGo = GameObject.Find(selectedObjectName);
            if (selectedGo != null)
            {
                runtimeHandle.SetTarget(selectedGo);
                runtimeHandle.gameObject.SetActive(true);
                SyncHandleMode();
            }
        }
        
        // Notify React
        ReactBridge.SendObjectSelected(selectedObjectName);
    }

    private void DeselectObject()
    {
        if (string.IsNullOrEmpty(selectedObjectName)) return; // Already deselected

        selectedObjectName = "";
        Debug.Log("[ToolController] Deselected object");

        if (runtimeHandle != null)
        {
            runtimeHandle.gameObject.SetActive(false);
        }
        
        // Notify React (sending empty string)
        ReactBridge.SendObjectSelected("");
    }

    private void SyncHandleMode()
    {
        if (runtimeHandle == null)
        {
            return;
        }

        // Default to all axes enabled
        runtimeHandle.SetAxis(HandleAxes.XYZ);

        // Enable/disable handle based on current tool
        switch (currentTool)
        {
            case ToolMode.Move:
                runtimeHandle.SetHandleMode(HandleType.POSITION);
                runtimeHandle.gameObject.SetActive(!string.IsNullOrEmpty(selectedObjectName));
                break;
            case ToolMode.Rotate:
                runtimeHandle.SetHandleMode(HandleType.ROTATION);
                runtimeHandle.gameObject.SetActive(!string.IsNullOrEmpty(selectedObjectName));
                break;
            case ToolMode.Scale:
                runtimeHandle.SetHandleMode(HandleType.SCALE);
                runtimeHandle.gameObject.SetActive(!string.IsNullOrEmpty(selectedObjectName));
                break;
            default:
                // Hand / Rect / Transform not wired yet – hide gizmo
                runtimeHandle.gameObject.SetActive(false);
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Gizmo rendering placeholder
    // In a real implementation, you would use a runtime transform gizmo asset 
    // like RuntimeTransformHandle. Since we don't have that asset imported, 
    // we use OnDrawGizmos to visualize the intent in the editor, and a proper
    // built-in solution would render meshes at runtime.
    // -------------------------------------------------------------------------
    void OnDrawGizmos()
    {
        if (string.IsNullOrEmpty(selectedObjectName) || objectManager == null) return;
        
        GameObject selectedGo = GameObject.Find(selectedObjectName);
        if (selectedGo == null) return;

        Vector3 pos = selectedGo.transform.position;
        float size = 1.0f; // Gizmo size

        switch (currentTool)
        {
            case ToolMode.Move:
                Gizmos.color = Color.red; Gizmos.DrawRay(pos, selectedGo.transform.right * size);
                Gizmos.color = Color.green; Gizmos.DrawRay(pos, selectedGo.transform.up * size);
                Gizmos.color = Color.blue; Gizmos.DrawRay(pos, selectedGo.transform.forward * size);
                break;
            case ToolMode.Rotate:
                Gizmos.color = Color.yellow; 
                Gizmos.DrawWireSphere(pos, size * 0.8f);
                break;
            case ToolMode.Scale:
                Gizmos.color = Color.white;
                Gizmos.DrawWireCube(pos, Vector3.one * (size * 1.2f));
                break;
            // Add remaining tools logic here
        }
    }
}
