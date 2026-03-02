import { collection, doc, Firestore } from 'firebase/firestore';
import { experimentConverter, sceneConverter, sceneObjectConverter } from './converters';

export function getExperimentDocRef(fs: Firestore, expName: string) {
  return doc(fs, 'experiments', expName).withConverter(experimentConverter);
}

export function getScenesCollectionRef(fs: Firestore, expName: string) {
  return collection(fs, 'experiments', expName, 'scenes').withConverter(sceneConverter);
}

export function getSceneDocRef(fs: Firestore, expName: string, sceneName: string) {
  return doc(fs, 'experiments', expName, 'scenes', sceneName).withConverter(
    sceneConverter,
  );
}

export function getSceneObjectsCollectionRef(
  fs: Firestore,
  expName: string,
  sceneName: string,
) {
  return collection(
    fs,
    'experiments',
    expName,
    'scenes',
    sceneName,
    'objects',
  ).withConverter(sceneObjectConverter);
}

export function getSceneObjectDocRef(
  fs: Firestore,
  expName: string,
  sceneName: string,
  objectName: string,
) {
  if (!objectName) {
    // Return a dummy ref that won't cause the 5-segment error if called accidentally.
    // This points to a non-existent document in the 'objects' collection.
    return doc(fs, 'experiments', expName, 'scenes', sceneName, 'objects', '_invalid_');
  }
  return doc(
    fs,
    'experiments',
    expName,
    'scenes',
    sceneName,
    'objects',
    objectName,
  ).withConverter(sceneObjectConverter);
}
