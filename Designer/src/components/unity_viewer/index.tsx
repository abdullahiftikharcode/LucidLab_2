import * as React from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { UnityContextHook } from 'react-unity-webgl/distribution/types/unity-context-hook';
import useUnityAndDbSync from '../../core/hooks/useUnityAndDbSync';
import { UnityToolbar } from '../unity_toolbar/UnityToolbar';
import { TOOL_CURSORS } from '../unity_toolbar/toolbar.types';
import { ToolbarProvider, useToolbar } from '../unity_toolbar/useToolbarStore';

type props = {
  style?: React.CSSProperties | undefined;
  expName: string;
  sceneName: string;
};

function UnityAndDbSyncComp({
  unityContext,
  expName,
  sceneName,
}: {
  unityContext: UnityContextHook;
  expName: string;
  sceneName: string;
}) {
  useUnityAndDbSync({
    unityContext,
    expName,
    sceneName,
  });
  return <></>;
}

export default function UnityViewer({ style, expName, sceneName }: props) {
  const unityContext = useUnityContext({
    loaderUrl: '/renderer/Build/renderer.loader.js',
    dataUrl: '/renderer/Build/renderer.data',
    frameworkUrl: '/renderer/Build/renderer.framework.js',
    codeUrl: '/renderer/Build/renderer.wasm',
    streamingAssetsUrl: 'StreamingAssets',
    companyName: 'DefaultCompany',
    productName: 'EduXRDesigner',
    productVersion: '0.1',
  });

  const { activeTool, setSelectedObject } = useToolbar();
  const [isHovered, setIsHovered] = React.useState(false);
  const [isMouseDown, setIsMouseDown] = React.useState(false);

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
      style={{ ...style, position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMouseDown(false);
      }}
      onMouseDown={() => setIsMouseDown(true)}
      onMouseUp={() => setIsMouseDown(false)}
    >
      <Unity
        tabIndex={2}
        unityProvider={unityContext.unityProvider}
        style={{ width: '100%', height: '100%', cursor: currentCursor }}
      />
      <UnityToolbar unityContext={unityContext} />
      {unityContext.isLoaded && (
        <UnityAndDbSyncComp
          unityContext={unityContext}
          expName={expName}
          sceneName={sceneName}
        />
      )}
    </div>
  );
}
