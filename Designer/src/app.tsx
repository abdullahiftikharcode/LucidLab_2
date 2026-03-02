import {
  ChakraProvider,
  ColorModeScript,
  Container,
  Skeleton,
  theme,
} from '@chakra-ui/react';
import { getFirestore } from '@firebase/firestore';
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { FirestoreProvider, useFirebaseApp } from 'reactfire';
import ExperimentRoot from './routes/experiment_root';
import Scene from './routes/Scene/scene';
import SceneManager from './routes/scene_manager';


const router = createBrowserRouter([
  {
    path: '/experiment/:expName',
    element: <SceneManager />,
  },
  {
    path: '/experiment/:expName/scene/:sceneName',
    element: <Scene />,
  },
]);

export const EduXRContext = React.createContext<{
  username: string;
}>(null!);

export default function App() {
  const firebaseApp = useFirebaseApp();
  const firestoreInstance = getFirestore(firebaseApp);

  return (
    <Container width="100vw" height="100vh">
      <EduXRContext.Provider value={{ username: 'mainuser' }}>
        <FirestoreProvider sdk={firestoreInstance}>
          <ExperimentRoot>
            <ColorModeScript />
            <ChakraProvider theme={theme}>
              <React.Suspense fallback={<Skeleton />}>
                <RouterProvider router={router} />
              </React.Suspense>
            </ChakraProvider>
          </ExperimentRoot>
        </FirestoreProvider>
      </EduXRContext.Provider>
    </Container>
  );
}
