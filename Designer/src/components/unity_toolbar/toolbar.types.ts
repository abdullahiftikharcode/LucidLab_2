/**
 * Unity Editor Toolbar Types
 * Replicates the 6 tools from Unity Editor's top-left toolbar.
 */

export enum ToolMode {
    /** Q — Pan/orbit camera, no gizmo on objects */
    Hand = 'Hand',
    /** W — Position gizmo: 3 arrows (X/Y/Z) + 3 plane squares */
    Move = 'Move',
    /** E — Rotation gizmo: 3 rings (X/Y/Z) */
    Rotate = 'Rotate',
    /** R — Scale gizmo: 3 axis cubes + center cube */
    Scale = 'Scale',
    /** T — 2D rect tool: corner/edge handles */
    Rect = 'Rect',
    /** Y — Combined Move + Rotate + Scale */
    Transform = 'Transform',
}

/** Maps keyboard shortcut keys to their tool mode */
export const TOOL_SHORTCUTS: Record<string, ToolMode> = {
    q: ToolMode.Hand,
    w: ToolMode.Move,
    e: ToolMode.Rotate,
    r: ToolMode.Scale,
    t: ToolMode.Rect,
    y: ToolMode.Transform,
};

/** Cursor styles for each tool mode when hovering over WebGL canvas */
export const TOOL_CURSORS: Record<ToolMode, string> = {
    [ToolMode.Hand]: 'grab',
    [ToolMode.Move]: 'crosshair',
    [ToolMode.Rotate]: 'crosshair',
    [ToolMode.Scale]: 'crosshair',
    [ToolMode.Rect]: 'crosshair',
    [ToolMode.Transform]: 'crosshair',
};

export interface ToolbarContextValue {
    activeTool: ToolMode;
    selectedObjectName: string | null;
    setActiveTool: (tool: ToolMode) => void;
    setSelectedObject: (name: string | null) => void;
}
