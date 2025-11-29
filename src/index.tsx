import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import SwapVariant from './SwapVariant';

setTimeout(() => {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}, 1000);
