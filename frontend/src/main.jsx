import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AudioProvider } from './context/AudioContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </AuthProvider>
  </React.StrictMode>
);

