// toast.js — feedback visual rápido (success/warning/error/info)

const CONTAINER_ID = 'toast-container';
const DEFAULT_DURATION = 3500;

function ensureContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info', duration = DEFAULT_DURATION) {
  const container = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

export const Toast = {
  success: (msg, dur) => toast(msg, 'success', dur),
  warning: (msg, dur) => toast(msg, 'warning', dur),
  error: (msg, dur) => toast(msg, 'error', dur),
  info: (msg, dur) => toast(msg, 'info', dur),
};
