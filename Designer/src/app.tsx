import {
  Box,
  ChakraProvider,
  ColorModeScript,
  Skeleton,
  theme,
} from '@chakra-ui/react';
import { getFirestore } from '@firebase/firestore';
import React, { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { FirestoreProvider, useFirebaseApp } from 'reactfire';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import ExperimentRoot from './routes/experiment_root';
const Scene = lazy(() => import('./routes/Scene/scene'));
const SceneManager = lazy(() => import('./routes/scene_manager'));
const LoginPage = lazy(() => import('./routes/Login'));
const RegisterPage = lazy(() => import('./routes/Register'));
const LandingPage = lazy(() => import('./routes/Landing'));
const DashboardHome = lazy(() => import('./routes/Dashboard'));
const ClassroomDetail = lazy(() => import('./routes/ClassroomDetail'));
const ExperimentsList = lazy(() => import('./routes/ExperimentsList'));
const ExperimentSetup = lazy(() => import('./routes/ExperimentSetup'));
const EvaluationPage = lazy(() => import('./routes/Evaluation'));
const NotificationsPage = lazy(() => import('./routes/Notifications'));

const router = createBrowserRouter([
  // Landing page as default
  { path: '/', element: <React.Suspense fallback={<Skeleton />}><LandingPage /></React.Suspense> },
  { path: '/login', element: <React.Suspense fallback={<Skeleton />}><LoginPage /></React.Suspense> },
  { path: '/register', element: <React.Suspense fallback={<Skeleton />}><RegisterPage /></React.Suspense> },

  // New authenticated routes
  { path: '/dashboard', element: <React.Suspense fallback={<Skeleton />}><AuthGuard><DashboardHome /></AuthGuard></React.Suspense> },
  { path: '/classrooms/:classroomId', element: <React.Suspense fallback={<Skeleton />}><AuthGuard><ClassroomDetail /></AuthGuard></React.Suspense> },
  { path: '/experiments', element: <React.Suspense fallback={<Skeleton />}><AuthGuard><ExperimentsList /></AuthGuard></React.Suspense> },
  { path: '/experiment/:expName/setup', element: <React.Suspense fallback={<Skeleton />}><AuthGuard><ExperimentSetup /></AuthGuard></React.Suspense> },
  { path: '/evaluation/:classroomId/:experimentId', element: <React.Suspense fallback={<Skeleton />}><AuthGuard><EvaluationPage /></AuthGuard></React.Suspense> },
  { path: '/notifications', element: <React.Suspense fallback={<Skeleton />}><AuthGuard><NotificationsPage /></AuthGuard></React.Suspense> },

  // EXISTING — DO NOT TOUCH
  { path: '/experiment/:expName', element: <React.Suspense fallback={<Skeleton />}><SceneManager /></React.Suspense> },
  { path: '/experiment/:expName/scene/:sceneName', element: <React.Suspense fallback={<Skeleton />}><Scene /></React.Suspense> },
]);

export const LucidLabContext = React.createContext<{
  username: string;
}>(null!);

function AppShell() {
  const { currentUser } = useAuth();
  const username = currentUser?.uid || 'mainuser';

  return (
    <LucidLabContext.Provider value={{ username }}>
      <ExperimentRoot>
        <ColorModeScript />
        <ChakraProvider theme={theme}>
          <React.Suspense fallback={<div className="w-screen h-screen skeleton-shimmer" />}>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </React.Suspense>
        </ChakraProvider>
      </ExperimentRoot>
    </LucidLabContext.Provider>
  );
}

export default function App() {
  const firebaseApp = useFirebaseApp();
  const firestoreInstance = getFirestore(firebaseApp);

  return (
    <Box width="100%" minHeight="calc(var(--app-vh, 1vh) * 100)" margin="0" padding="0" overflowX="hidden">
      <AuthProvider>
        <FirestoreProvider sdk={firestoreInstance}>
          <AppShell />
        </FirestoreProvider>
      </AuthProvider>
    </Box>
  );
}
