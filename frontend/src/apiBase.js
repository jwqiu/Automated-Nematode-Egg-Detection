// frontend/src/apiBase.js
function isElectron() {
  return typeof window !== 'undefined' && (
    window.api ||
    window.process?.type === 'renderer' ||
    (navigator.userAgent || '').includes('Electron')
  );
}

export function getApiBase() {
  const mode = import.meta.env.MODE; // 'development' or 'production'
  if (isElectron()) {
    return import.meta.env.VITE_DESKTOP_API_BASE || 'http://127.0.0.1:5178';
  }
  return mode === 'development'
    // ? (import.meta.env.VITE_API_BASE_DEV || 'http://localhost:7071/api')
    ? (import.meta.env.VITE_API_BASE_DEV || 'http://127.0.0.1:5178')
    : (import.meta.env.VITE_API_BASE_PROD || 'https://eggdetection-dnepbjb0fychajh6.australiaeast-01.azurewebsites.net/api');
}

export const API_BASE = getApiBase();
