import * as React from 'react';
import { ToolMode, TOOL_SHORTCUTS } from './toolbar.types';
import { useToolbar } from './useToolbarStore';
import { ToolbarButton } from './ToolbarButton';
import {
    HandIcon,
    MoveIcon,
    RotateIcon,
    ScaleIcon,
    RectIcon,
    TransformIcon,
} from './ToolbarIcons';
import { UnityContextHook } from 'react-unity-webgl/distribution/types/unity-context-hook';

interface UnityToolbarProps {
    unityContext: UnityContextHook;
}

export function UnityToolbar({ unityContext }: UnityToolbarProps) {
    const { activeTool, setActiveTool } = useToolbar();

    // Keyboard shortcuts
    React.useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ignore if user is typing in an input field
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return;
            }

            const key = e.key.toLowerCase();
            const mappedTool = TOOL_SHORTCUTS[key];
            if (mappedTool) {
                handleToolSelect(mappedTool);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool, unityContext]); // Re-bind if activeTool changes so we send right state

    const handleToolSelect = (tool: ToolMode) => {
        setActiveTool(tool);
        if (unityContext.isLoaded) {
            unityContext.sendMessage('SceneController', 'SetToolMode', tool);
        }
    };

    return (
        <div className="unity-toolbar-container">
            {/* Hand / Pan */}
            <div className="unity-toolbar-group">
                <ToolbarButton
                    icon={<HandIcon color={activeTool === ToolMode.Hand ? '#fff' : '#c8c8c8'} />}
                    tool={ToolMode.Hand}
                    shortcut="q"
                    isActive={activeTool === ToolMode.Hand}
                    onClick={() => handleToolSelect(ToolMode.Hand)}
                />
            </div>

            {/* Transforms */}
            <div className="unity-toolbar-group">
                <ToolbarButton
                    icon={<MoveIcon color={activeTool === ToolMode.Move ? '#fff' : '#c8c8c8'} />}
                    tool={ToolMode.Move}
                    shortcut="w"
                    isActive={activeTool === ToolMode.Move}
                    onClick={() => handleToolSelect(ToolMode.Move)}
                />
                <ToolbarButton
                    icon={<RotateIcon color={activeTool === ToolMode.Rotate ? '#fff' : '#c8c8c8'} />}
                    tool={ToolMode.Rotate}
                    shortcut="e"
                    isActive={activeTool === ToolMode.Rotate}
                    onClick={() => handleToolSelect(ToolMode.Rotate)}
                />
                <ToolbarButton
                    icon={<ScaleIcon color={activeTool === ToolMode.Scale ? '#fff' : '#c8c8c8'} />}
                    tool={ToolMode.Scale}
                    shortcut="r"
                    isActive={activeTool === ToolMode.Scale}
                    onClick={() => handleToolSelect(ToolMode.Scale)}
                />
                <ToolbarButton
                    icon={<RectIcon color={activeTool === ToolMode.Rect ? '#fff' : '#c8c8c8'} />}
                    tool={ToolMode.Rect}
                    shortcut="t"
                    isActive={activeTool === ToolMode.Rect}
                    onClick={() => handleToolSelect(ToolMode.Rect)}
                />
                <ToolbarButton
                    icon={<TransformIcon color={activeTool === ToolMode.Transform ? '#fff' : '#c8c8c8'} />}
                    tool={ToolMode.Transform}
                    shortcut="y"
                    isActive={activeTool === ToolMode.Transform}
                    onClick={() => handleToolSelect(ToolMode.Transform)}
                />
            </div>
        </div>
    );
}
