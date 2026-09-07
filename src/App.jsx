import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import OverlayPage from './pages/OverlayPage';

const STORAGE_KEY = 'tiktok_tts_streamer_token';

// Generate a clean, unique streamer token e.g. streamer_a7b9x2
function generateUniqueToken() {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `streamer_${rand}${time}`;
}

function DashboardContainer() {
  // Dashboard route: resolve token with priority:
  // 1. URL query param (?token=...)
  // 2. localStorage
  // 3. Newly generated unique token
  const [overlayToken, setOverlayToken] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramToken = urlParams.get('token');
    if (paramToken && paramToken.trim()) {
      return paramToken.trim();
    }
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken && savedToken.trim()) {
      return savedToken.trim();
    }
    const newToken = generateUniqueToken();
    try {
      localStorage.setItem(STORAGE_KEY, newToken);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return newToken;
  });

  // Keep localStorage and URL query param synchronized
  useEffect(() => {
    if (!overlayToken) return;
    try {
      localStorage.setItem(STORAGE_KEY, overlayToken);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('token') !== overlayToken) {
      currentUrl.searchParams.set('token', overlayToken);
      window.history.replaceState(null, '', currentUrl.toString());
    }
  }, [overlayToken]);

  const handleUpdateToken = (newToken) => {
    if (!newToken || !newToken.trim()) return;
    const clean = newToken.trim().replace(/^\/+/, '');
    setOverlayToken(clean);
  };

  return <Dashboard overlayToken={overlayToken} setOverlayToken={handleUpdateToken} />;
}

export default function App() {
  const path = window.location.pathname;
  const isOverlayPath = path.startsWith('/overlay');

  // If on Overlay route, extract token from pathname (/overlay/:token) or query (?token=...)
  if (isOverlayPath) {
    const segments = path.split('/overlay/')[1];
    const pathToken = segments ? segments.split('/')[0].split('?')[0].trim() : null;
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    const overlayToken = pathToken || queryToken || 'demo-overlay-token';
    return <OverlayPage token={overlayToken} />;
  }

  return <DashboardContainer />;
}
