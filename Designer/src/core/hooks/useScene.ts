import { useFirestore, useFirestoreCollectionData, useFirestoreDocData } from 'reactfire';
import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { supabase } from '../../supabaseClient';
import { ExportedNodes } from '../../components/logic_designer/node_exporter';
import {
  getSceneDocRef,
  getSceneObjectDocRef,
  getSceneObjectsCollectionRef
} from '../states/references';
import { SceneMarker, SceneObjectState } from '../states/types';


export interface SceneObjectInterface {
  object: SceneObjectState | undefined;
  setPosition: (position: [number, number, number]) => void;
  setRotation: (rotation: [number, number, number]) => void;
  setScale: (scale: [number, number, number]) => void;
  setHasGravity: (hasGravity: boolean) => void;
  setGrabbable: (isGrabbable: boolean) => void;
  setColor: (color: string) => void;
  deleteSelf: () => void;
  setShowDesc: (showDesc: boolean) => void;
  setMarkerId: (markerId: string) => void;
}

export default function useScene(expName: string, sceneName: string) {
  const fsapp = useFirestore();
  const { data: scene } = useFirestoreDocData(getSceneDocRef(fsapp, expName, sceneName));
  const { data: objects } = useFirestoreCollectionData(
    getSceneObjectsCollectionRef(fsapp, expName, sceneName),
  );

  function addObject(name: string, type: string) {
    const obj: SceneObjectState = {
      objectName: name,
      objectType: type,
      color: '#00FF00',
      position: [0, 0.28, 0],
      rotation: [0, 0, 0],
      scale: [0.08, 0.08, 0.08],
      hasGravity: false,
      isGrabbable: true,
      showDesc: true,
    };

    setDoc(getSceneObjectDocRef(fsapp, expName, sceneName, name), obj);
  }

  async function addMarker(name: string, file: File) {
    const defaultMarkers = scene?.markers ?? [];
    const markerId = `marker_${Date.now()}`;

    try {
      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('markers')
        .upload(`${markerId}`, file);

      if (error) {
        console.error('Error uploading marker to Supabase:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('markers')
        .getPublicUrl(data.path);

      const newMarker: SceneMarker = {
        id: markerId,
        name,
        imageUrl: publicUrl,
      };

      // Update Firestore with marker metadata
      await updateDoc(getSceneDocRef(fsapp, expName, sceneName), {
        markers: [...defaultMarkers, newMarker],
      });
      
      console.log('Marker added successfully:', markerId);
    } catch (error) {
      console.error('Failed to add marker:', error);
      // Re-throw to let the UI handle the error
      throw error;
    }
  }

  async function listMarkers() {
    const { data, error } = await supabase.storage
      .from('markers')
      .list();

    if (error) {
      console.error('Error listing markers from Supabase:', error);
      return [];
    }

    return data.map(item => ({
      id: item.name,
      name: item.name,
      imageUrl: supabase.storage.from('markers').getPublicUrl(item.name).data.publicUrl
    }));
  }

  async function deleteMarker(markerId: string) {
    try {
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('markers')
        .remove([markerId]);

      if (storageError) {
        console.error('Error deleting marker from Supabase:', storageError);
        // Continue to update Firestore even if storage deletion fails
      }

      // Update Firestore to remove marker metadata
      const currentMarkers: SceneMarker[] = scene?.markers ?? [];
      const updatedMarkers = currentMarkers.filter(m => m.id !== markerId);
      await updateDoc(getSceneDocRef(fsapp, expName, sceneName), {
        markers: updatedMarkers,
      });
      
      console.log('Marker deleted successfully:', markerId);
    } catch (error) {
      console.error('Failed to delete marker:', error);
      throw error;
    }
  }

  function setSceneLogic(nodes: ExportedNodes) {
    updateDoc(getSceneDocRef(fsapp, expName, sceneName), {
      // @ts-ignore
      sceneLogic: nodes,
    });
  }

  function setDescription(description: string) {
    updateDoc(getSceneDocRef(fsapp, expName, sceneName), {
      description: description,
    });
  }

  function getObject(objectName: string): SceneObjectInterface {
    const object = objects?.find(object => object.objectName === objectName);

    function setPosition(position: [number, number, number]) {
      console.log('[useScene] setPosition', {
        expName,
        sceneName,
        objectName,
        position,
      });
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        position: position,
      });
    }

    function setScale(scale: [number, number, number]) {
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        scale: scale,
      });
    }

    function setRotation(rotation: [number, number, number]) {
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        rotation: rotation,
      });
    }

    function setHasGravity(hasGravity: boolean) {
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        hasGravity: hasGravity,
      });
    }

    function setGrabbable(isGrabbable: boolean) {
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        isGrabbable: isGrabbable,
      });
    }

    function setShowDesc(showDesc: boolean) {
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        showDesc: showDesc,
      });
    }

    function setColor(color: string) {
      console.log('[useScene] setColor', {
        expName,
        sceneName,
        objectName,
        color,
      });
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        color: color,
      });
    }

    function setMarkerId(markerId: string) {
      updateDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName), {
        markerId: markerId,
      });
    }

    function deleteSelf() {
      deleteDoc(getSceneObjectDocRef(fsapp, expName, sceneName, objectName));
    }

    return {
      object,
      setPosition,
      setRotation,
      setScale,
      setHasGravity,
      setGrabbable,
      setColor,
      deleteSelf,
      setShowDesc,
      setMarkerId,
    };
  }

  function addMarkerManual(marker: SceneMarker) {
    const defaultMarkers = scene?.markers ?? [];
    updateDoc(getSceneDocRef(fsapp, expName, sceneName), {
      markers: [...defaultMarkers, marker],
    });
  }

  return {
    scene,
    objects,
    addObject,
    addMarker,
    addMarkerManual,
    deleteMarker,
    listMarkers,
    setSceneLogic,
    getObject,
    setDescription,
  };
}
