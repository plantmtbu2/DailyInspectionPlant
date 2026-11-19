import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ScreenLayoutProvider } from './context/ScreenLayoutContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AuthProvider>
      <SettingsProvider>
        <ScreenLayoutProvider>
          <App />
        </ScreenLayoutProvider>
      </SettingsProvider>
    </AuthProvider>
  </ThemeProvider>
);
