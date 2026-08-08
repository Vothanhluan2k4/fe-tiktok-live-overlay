import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import OverlayPage from './pages/OverlayPage';

export default function App() {
  const path = window.location.pathname;
  const isOverlayPath = path.startsWith('/overlay/');

  // Extract token from URL or default to 'demo-overlay-token'
  const tokenFromUrl = isOverlayPath ? path.split('/overlay/')[1] : null;
  const [overlayToken, setOverlayToken] = useState(tokenFromUrl || 'demo-overlay-token');

  if (isOverlayPath) {
    return <OverlayPage token={overlayToken} />;
  }

  return <Dashboard overlayToken={overlayToken} setOverlayToken={setOverlayToken} />;
}
