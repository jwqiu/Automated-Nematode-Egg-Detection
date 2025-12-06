// export function isElectron() {
//   return typeof window !== 'undefined' && (
//     window.api ||
//     window.process?.type === 'renderer' ||
//     (navigator.userAgent || '').includes('Electron')
//   );
// }

// detect whether the current environment is Electron
export function isElectron(){
  // check if running in a browser-like environment, includes regular browser and electron renderers
  if (typeof window === 'undefined') return false;

  // if running in Electron rendered process, at least one of the following conditions will be true
  if (window.api) return true;
  if (window.process && window.process.type === 'renderer') return true;
  if (navigator.userAgent.includes('Electron')) return true;

  return false;
}

// return the correct backend API base URL based on the current environment
export function getApiBase() {

  // check the current mode set by Vite
  const mode = import.meta.env.MODE; // 'development' or 'production'

  // call the isElectron function to check if running in Electron
  if (isElectron()) {
    // VITE_DESKTOP_API_BASE is the same as the local Flask backend
    // because the Electron app is a standalone application that runs together with the local flask backend.
    return import.meta.env.VITE_DESKTOP_API_BASE;
  }
  return mode === 'development'
    // if in development model, use the dev API base, could be azure function or flask local backend
    ? (import.meta.env.VITE_API_BASE_DEV)
    // if in production model, use the prod API base(azure function backend)
    : (import.meta.env.VITE_API_BASE_PROD || 'https://eggdetection-dnepbjb0fychajh6.australiaeast-01.azurewebsites.net/api');
}

export const API_BASE = getApiBase();
export const IS_ELECTRON = isElectron();

// log the detected API_BASE and environment info for debugging
console.log('[API_BASE]', API_BASE, {
  IS_ELECTRON,
  MODE: import.meta.env.MODE,
  VITE_API_BASE_DEV: import.meta.env.VITE_API_BASE_DEV,
  VITE_API_BASE_PROD: import.meta.env.VITE_API_BASE_PROD,
  VITE_DESKTOP_API_BASE: import.meta.env.VITE_DESKTOP_API_BASE
});
