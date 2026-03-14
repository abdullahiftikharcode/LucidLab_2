import {
  ChakraProvider,
  ColorModeScript,
  Container,
  Skeleton,
  theme,
} from '@chakra-ui/react';
import { getFirestore } from '@firebase/firestore';
import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { FirestoreProvider, useFirebaseApp } from 'reactfire';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import ExperimentRoot from './routes/experiment_root';
import Scene from './routes/Scene/scene';
import SceneManager from './routes/scene_manager';
import LoginPage from './routes/Login';
import RegisterPage from './routes/Register';
import LandingPage from './routes/Landing';
import DashboardHome from './routes/Dashboard';
import ClassroomDetail from './routes/ClassroomDetail';
import ExperimentsList from './routes/ExperimentsList';
import EvaluationPage from './routes/Evaluation';
import NotificationsPage from './routes/Notifications';

const router = createBrowserRouter([
  // Landing page as default
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // New authenticated routes
  { path: '/dashboard', element: <AuthGuard><DashboardHome /></AuthGuard> },
  { path: '/classrooms/:classroomId', element: <AuthGuard><ClassroomDetail /></AuthGuard> },
  { path: '/experiments', element: <AuthGuard><ExperimentsList /></AuthGuard> },
  { path: '/evaluation/:classroomId/:experimentId', element: <AuthGuard><EvaluationPage /></AuthGuard> },
  { path: '/notifications', element: <AuthGuard><NotificationsPage /></AuthGuard> },

  // EXISTING — DO NOT TOUCH
  {
    path: '/experiment/:expName',
    element: <SceneManager />,
  },
  {
    path: '/experiment/:expName/scene/:sceneName',
    element: <Scene />,
  },
]);

export const LucidLabContext = React.createContext<{
  username: string;
}>(null!);

export default function App() {
  const firebaseApp = useFirebaseApp();
  const firestoreInstance = getFirestore(firebaseApp);

  return (
    <Container width="100vw" height="100vh">
      <AuthProvider>
        <LucidLabContext.Provider value={{ username: 'mainuser' }}>
          <FirestoreProvider sdk={firestoreInstance}>
            <ExperimentRoot>
              <ColorModeScript />
              <ChakraProvider theme={theme}>
                <React.Suspense fallback={<div className="w-screen h-screen skeleton-shimmer" />}>
                  <RouterProvider router={router} />
                </React.Suspense>
              </ChakraProvider>
            </ExperimentRoot>
          </FirestoreProvider>
        </LucidLabContext.Provider>
      </AuthProvider>
    </Container>
  );
}
