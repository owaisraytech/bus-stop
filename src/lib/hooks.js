import { useEffect, useState, useCallback } from 'react';

const THEME_KEY = 'bsa-theme';
const MODES = ['system', 'light', 'dark'];

function read(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export function useTheme() {
  const [mode, setMode] = useState(() => {
    const m = read(THEME_KEY, 'system');
    return MODES.includes(m) ? m : 'system';
  });
  useEffect(() => {
    const el = document.documentElement;
    if (mode === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', mode);
    write(THEME_KEY, mode);
  }, [mode]);
  const cycle = useCallback(() => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]), []);
  return [mode, cycle];
}

export const lastStop = {
  get: () => read('bsa-last-stop', ''),
  set: (code) => write('bsa-last-stop', code),
};

// Keeps the screen on while active. Returns 'on', 'off' or 'unsupported'.
export function useWakeLock(active) {
  const [state, setState] = useState('off');
  useEffect(() => {
    if (!active) return undefined;
    if (!('wakeLock' in navigator)) { setState('unsupported'); return undefined; }
    let lock = null;
    let done = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (done) { lock.release(); return; }
        setState('on');
        lock.addEventListener('release', () => { if (!done) setState('off'); });
      } catch {
        setState('off');
      }
    };
    request();
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
      setState('off');
    };
  }, [active]);
  return state;
}
