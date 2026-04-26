import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { FirebaseAppProvider } from 'reactfire';
import App from './app';
import { firebaseConfig } from './firebaseConfig';
import './styles/global.css';

const setViewportHeightVar = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--app-vh', `${vh}px`);
};

setViewportHeightVar();
window.addEventListener('resize', setViewportHeightVar);
window.addEventListener('load', setViewportHeightVar);
window.visualViewport?.addEventListener('resize', setViewportHeightVar);

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <FirebaseAppProvider firebaseConfig={firebaseConfig} suspense={true}>
      <App />
    </FirebaseAppProvider>
  </React.StrictMode>,
);
