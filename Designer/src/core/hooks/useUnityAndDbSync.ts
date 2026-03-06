import { useContext, useEffect, useRef, useState } from 'react';
import { UnityContextHook } from 'react-unity-webgl/distribution/types/unity-context-hook';
import { useFirestore, useFirestoreCollection } from 'reactfire';
import { ObjectTypesManagerContext } from '../../routes/experiment_root';
import { getSceneObjectsCollectionRef } from '../states/references';
import { SceneObjectState } from '../states/types';
import { useUnityObjectManagement } from './unity/function_hooks';

type props = {
  unityContext: UnityContextHook;
  expName: string;
  sceneName: string;
};

export default function useUnityAndDbSync({ unityContext, expName, sceneName }: props) {
  const fsapp = useFirestore();
  const dataStore = useFirestoreCollection(
    getSceneObjectsCollectionRef(fsapp, expName, sceneName),
  );

  const unityObjectManager = useUnityObjectManagement({
    unityContext,
  });

  const objectTypeManager = useContext(ObjectTypesManagerContext);

  const [objectsList, setObjectsList] = useState<SceneObjectState[]>([]);
  const previousObjectsRef = useRef<Map<string, SceneObjectState>>(new Map());

  useEffect(() => {
    for (let change of dataStore.data.docChanges()) {
      switch (change.type) {
        case 'added': {
          const obj = change.doc.data() as SceneObjectState;
          const model = objectTypeManager.objects.find(o => o.name === obj.objectType);
          if (model) {
            unityObjectManager.setObjectModelURL(
              obj.objectType,
              model.objFile,
              model.mtlFile,
            );
          }
          unityObjectManager.createObject(obj);
          previousObjectsRef.current.set(obj.objectName, obj);
          break;
        }
        case 'removed': {
          const removedName = change.doc.data().objectName;
          unityObjectManager.deleteObject(removedName);
          previousObjectsRef.current.delete(removedName);
          break;
        }
        case 'modified': {
          const newObj = change.doc.data() as SceneObjectState;
          const oldObj = previousObjectsRef.current.get(newObj.objectName);

          if (!oldObj || newObj.position !== oldObj.position) {
            unityObjectManager.setObjectPosition(
              newObj.objectName,
              newObj.position[0],
              newObj.position[1],
              newObj.position[2],
            );
          }

          if (!oldObj || newObj.rotation !== oldObj.rotation) {
            unityObjectManager.setObjectRotation(
              newObj.objectName,
              newObj.rotation[0],
              newObj.rotation[1],
              newObj.rotation[2],
            );
          }

          if (!oldObj || newObj.scale !== oldObj.scale) {
            unityObjectManager.setObjectScale(
              newObj.objectName,
              newObj.scale[0],
              newObj.scale[1],
              newObj.scale[2],
            );
          }

          if (!oldObj || newObj.color !== oldObj.color) {
            // Note: color could be undefined initially depending on data schema
            const colorToSet = newObj.color || "#000000";
            console.log('[useUnityAndDbSync] setObjectColor', {
              objectName: newObj.objectName,
              oldColor: oldObj?.color,
              newColor: newObj.color,
              colorToSet,
            });
            unityObjectManager.setObjectColor(newObj.objectName, colorToSet);
          }

          previousObjectsRef.current.set(newObj.objectName, newObj);
          break;
        }
      }
    }

    // Convert current map to array for the UI state, rather than using dataStore.docs
    // Since Firebase dataStore might have duplicates if not carefully handled, but docs map is fine.
    setObjectsList(dataStore.data.docs.map(doc => doc.data() as SceneObjectState));
  }, [dataStore, objectTypeManager, unityObjectManager]); // Object reference stability guarantees

  return { objectsList }; // Expose objectsList if needed, or we can just leave it as it was (no return)
}
