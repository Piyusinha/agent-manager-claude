/** Appearance: system (default) | light | dark. Persists in localStorage. */

export const THEME_STORAGE_KEY = 'agent-manager-theme';

const VALID = new Set(['system', 'light', 'dark']);

export function getThemePreference() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v && VALID.has(v)) return v;
  } catch { /* private mode */ }
  return 'system';
}

function resolveEffective(preference) {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getEffectiveTheme() {
  return resolveEffective(getThemePreference());
}

export function applyThemeFromPreference() {
  const pref = getThemePreference();
  const effective = resolveEffective(pref);
  document.documentElement.dataset.theme = effective;
  document.documentElement.dataset.themePreference = pref;
  document.documentElement.style.colorScheme = effective;
  window.dispatchEvent(new CustomEvent('agent-manager-theme', { detail: { effective, preference: pref } }));
}

export function setThemePreference(mode) {
  if (!VALID.has(mode)) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch { /* ignore */ }
  applyThemeFromPreference();
}

/** Cycles: system → light → dark → system */
export function cycleThemePreference() {
  const order = ['system', 'light', 'dark'];
  const cur = getThemePreference();
  const i = order.indexOf(cur);
  const next = order[(i + 1) % order.length];
  setThemePreference(next);
  return next;
}

let mqListener;

export function initTheme() {
  applyThemeFromPreference();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mqListener = () => {
    if (getThemePreference() === 'system') applyThemeFromPreference();
  };
  mq.addEventListener('change', mqListener);
}
