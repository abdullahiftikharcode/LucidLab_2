import * as React from 'react';
import { Button, useToast } from '@chakra-ui/react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { UnityContextHook } from 'react-unity-webgl/distribution/types/unity-context-hook';
import useUnityAndDbSync from '../../core/hooks/useUnityAndDbSync';
import { buildSceneLogicPayload } from '../../core/sceneLogicPayload';
import type { ExportedNodes } from '../logic_designer/node_exporter';
import type { SceneObjectState } from '../../core/states/types';
import { UnityToolbar } from '../unity_toolbar/UnityToolbar';
import { TOOL_CURSORS } from '../unity_toolbar/toolbar.types';
import { ToolbarProvider, useToolbar } from '../unity_toolbar/useToolbarStore';
import { useUnityObjectManagement } from '../../core/hooks/unity/function_hooks';

type props = {
  style?: React.CSSProperties | undefined;
  expName: string;
  sceneName: string;
  sceneLogic?: ExportedNodes | null;
  objects?: SceneObjectState[] | undefined;
};

function UnityAndDbSyncComp({
  unityContext,
  expName,
  sceneName,
  isSimulating,
}: {
  unityContext: UnityContextHook;
  expName: string;
  sceneName: string;
  isSimulating: boolean;
}) {
  useUnityAndDbSync({
    unityContext,
    expName,
    sceneName,
    isSimulating,
  });
  return <></>;
}

export default function UnityViewer({ style, expName, sceneName, sceneLogic, objects }: props) {
  const unityContext = useUnityContext({
    loaderUrl: '/renderer/Build/renderer.loader.js',
    dataUrl: '/renderer/Build/renderer.data',
    frameworkUrl: '/renderer/Build/renderer.framework.js',
    codeUrl: '/renderer/Build/renderer.wasm',
    streamingAssetsUrl: 'StreamingAssets',
    companyName: 'DefaultCompany',
    productName: 'LucidLabDesigner',
    productVersion: '0.1',
  });

  const { activeTool, setSelectedObject } = useToolbar();
  const [isHovered, setIsHovered] = React.useState(false);
  const [isMouseDown, setIsMouseDown] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const toast = useToast();
  const unityActions = useUnityObjectManagement({ unityContext });
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const canPlay = Boolean(unityContext.isLoaded && sceneLogic && Object.keys(sceneLogic).length > 0);

  React.useEffect(() => {
    const onShowMessage = (e: Event) => {
      const ev = e as CustomEvent<string>;
      toast({ title: 'Message', description: ev.detail ?? '', duration: 4000, isClosable: true });
    };
    window.addEventListener('unityShowMessage', onShowMessage);
    return () => window.removeEventListener('unityShowMessage', onShowMessage);
  }, [toast]);

  const handlePlay = React.useCallback(() => {
    if (!canPlay || !sceneLogic || !unityContext.isLoaded) return;
    const payload = buildSceneLogicPayload(sceneLogic);
    unityContext.sendMessage('SceneController', 'StartSimulation', JSON.stringify(payload));
    setIsSimulating(true);
  }, [canPlay, sceneLogic, unityContext]);

  const handleStop = React.useCallback(() => {
    unityContext.sendMessage('SceneController', 'StopSimulation', '');
    setIsSimulating(false);
    if (objects) {
      for (const o of objects) {
        unityActions.setObjectPosition(o.objectName, o.position[0], o.position[1], o.position[2]);
        unityActions.setObjectRotation(o.objectName, o.rotation[0], o.rotation[1], o.rotation[2]);
        unityActions.setObjectScale(o.objectName, o.scale[0], o.scale[1], o.scale[2]);
        unityActions.setObjectColor(o.objectName, o.color ?? '#ffffff');
      }
    }
  }, [objects, unityActions, unityContext]);

  React.useEffect(() => {
    const handleGesture = () => {
      const audioContexts = [
        // @ts-ignore
        window.AudioContext || window.webkitAudioContext
      ];
      if (audioContexts.length > 0) {
        // Resume all suspended audio contexts
        // @ts-ignore
        if (window.unityAudioContext && window.unityAudioContext.state === 'suspended') {
          // @ts-ignore
          window.unityAudioContext.resume();
        }
      }
    };

    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Listen for custom events from Unity's ReactBridgePlugin
  React.useEffect(() => {
    const handleObjectSelected = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      // If empty string or null, clear selection
      setSelectedObject(customEvent.detail || null);
    };

    window.addEventListener('unityObjectSelected', handleObjectSelected);
    return () => window.removeEventListener('unityObjectSelected', handleObjectSelected);
  }, [setSelectedObject]);

  // Hierarchy double-click: focus camera on object in Unity.
  React.useEffect(() => {
    const onFocusObject = (e: Event) => {
      const ev = e as CustomEvent<string>;
      if (!unityContext.isLoaded || !ev.detail) return;
      // Main Camera is the GameObject that has FreeFlyCamera attached.
      unityContext.sendMessage('Main Camera', 'FocusOnObject', ev.detail);
    };
    window.addEventListener('designerFocusObject', onFocusObject);
    return () => window.removeEventListener('designerFocusObject', onFocusObject);
  }, [unityContext]);

  // Determine actual cursor
  let currentCursor = 'default';
  if (isHovered) {
    currentCursor = TOOL_CURSORS[activeTool];
    if (activeTool === 'Hand' && isMouseDown) {
      currentCursor = 'grabbing';
    }
  }

  return (
    <div
      style={{
        ...style,
        position: 'relative',
        userSelect: activeTool === 'Hand' ? 'none' : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMouseDown(false);
      }}
      onMouseDown={(e) => {
        setIsMouseDown(true);
        if (e.button === 0 && activeTool === 'Hand' && (e.target as HTMLElement)?.tagName === 'CANVAS') {
          e.preventDefault();
        }
      }}
      onMouseUp={() => setIsMouseDown(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Unity
        ref={canvasRef}
        tabIndex={2}
        unityProvider={unityContext.unityProvider}
        style={{ width: '100%', height: '100%', cursor: currentCursor }}
      />
      {/* Run scene (Play/Stop) overlay - always visible top-left */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Button
          size="sm"
          colorScheme="green"
          isDisabled={!canPlay || isSimulating}
          onClick={handlePlay}
        >
          Run scene
        </Button>
        <Button
          size="sm"
          colorScheme="red"
          variant="outline"
          isDisabled={!isSimulating}
          onClick={handleStop}
        >
          Stop
        </Button>
        {canPlay && !isSimulating && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            Preview logic for students
          </span>
        )}
      </div>
      <UnityToolbar unityContext={unityContext} />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)',
          pointerEvents: 'none',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        Right-drag: orbit · Alt+right-drag: in/out · Scroll: zoom · Shift+right-drag: pan · WASD/QE: move · R: reset
      </div>
      {unityContext.isLoaded && (
        <UnityAndDbSyncComp
          unityContext={unityContext}
          expName={expName}
          sceneName={sceneName}
          isSimulating={isSimulating}
        />
      )}
    </div>
  );
}
