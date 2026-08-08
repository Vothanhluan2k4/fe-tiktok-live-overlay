const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = `${SERVER_URL}/api`;

export const api = {
  // Config APIs
  getConfig: async (token) => {
    const res = await fetch(`${API_BASE}/config/${token}`);
    return res.json();
  },

  updateConfig: async (token, configData) => {
    const res = await fetch(`${API_BASE}/config/${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    return res.json();
  },

  generateToken: async () => {
    const res = await fetch(`${API_BASE}/config/generate-token`, {
      method: 'POST'
    });
    return res.json();
  },

  // TikTok Live Connection APIs
  startConnection: async (overlayToken, tiktokUsername) => {
    const res = await fetch(`${API_BASE}/connection/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overlayToken, tiktokUsername })
    });
    return res.json();
  },

  stopConnection: async (overlayToken) => {
    const res = await fetch(`${API_BASE}/connection/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overlayToken })
    });
    return res.json();
  },

  getStatus: async (token) => {
    const res = await fetch(`${API_BASE}/connection/status/${token}`);
    return res.json();
  },

  // Test live event trigger
  testEvent: async (overlayToken, eventType, data) => {
    const res = await fetch(`${API_BASE}/connection/test-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overlayToken, eventType, data })
    });
    return res.json();
  }
};
