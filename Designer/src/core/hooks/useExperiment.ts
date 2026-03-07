import { setDoc } from '@firebase/firestore';
import { useFirestore, useFirestoreCollectionData, useFirestoreDocData } from 'reactfire';
import {
  getExperimentDocRef,
  getSceneDocRef,
  getScenesCollectionRef,
} from '../states/references';

export default function useExperiment(expName: string) {
  const fsapp = useFirestore();
  const { data: experiment } = useFirestoreDocData(getExperimentDocRef(fsapp, expName));
  const { data: scenes } = useFirestoreCollectionData(
    getScenesCollectionRef(fsapp, expName),
  );

  async function createSelf() {
    const experimentRef = getExperimentDocRef(fsapp, expName);
    // Important: use merge so we don't wipe fields like instructorId/title/category/etc.
    await setDoc(
      experimentRef,
      {
        name: expName,
      },
      { merge: true },
    );
  }

  async function createScene(name: string) {
    await createSelf();

    const scenesList = (scenes as any[]) ?? [];
    const nextIndex = scenesList.length + 1;
    const sceneRef = getSceneDocRef(fsapp, expName, name);
    await setDoc(sceneRef, {
      name,
      description: '',
      index: nextIndex,
    });
  }

  return {
    experiment,
    scenes: (scenes as any[]) ?? [],
    createScene,
    createSelf,
  };
}
