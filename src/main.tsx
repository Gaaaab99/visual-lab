import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import { AppProvider } from './context/AppContext';
import { StoreProvider } from './store/StoreContext';
import { PrintProvider } from './components/Print';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <StoreProvider>
          <PrintProvider>
            <App />
          </PrintProvider>
        </StoreProvider>
      </AppProvider>
    </MotionConfig>
  </StrictMode>,
);
