// theme.js — toggle claro/escuro com persistência em localStorage e detecção de
// preferência do sistema. Aplica tema antes do paint para evitar flash.

const STORAGE_KEY = 'uniplus.app.theme';
const root = document.documentElement;

function preferenciaSistema() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function lerPreferencia() {
  try {
    return localStorage.getItem(STORAGE_KEY) || preferenciaSistema();
  } catch {
    return 'light';
  }
}

function aplicarTema(tema) {
  root.dataset.theme = tema;
  root.style.colorScheme = tema;
  try {
    localStorage.setItem(STORAGE_KEY, tema);
  } catch {
    /* ignore */
  }
  atualizarBotao(tema);
}

function atualizarBotao(tema) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = tema === 'dark';
  btn.setAttribute(
    'aria-label',
    isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'
  );
  btn.title = btn.getAttribute('aria-label');
  btn.textContent = isDark ? '☀️' : '🌙';
}

function injetarBotao() {
  const slot = document.querySelector('.header-actions');
  if (!slot || document.getElementById('theme-toggle')) return;

  const btn = document.createElement('button');
  btn.id = 'theme-toggle';
  btn.type = 'button';
  btn.className = 'theme-toggle-btn';
  btn.addEventListener('click', () => {
    const proximo = root.dataset.theme === 'dark' ? 'light' : 'dark';
    aplicarTema(proximo);
  });

  // Insere antes do badge-prototipo (ou no fim se não houver)
  const badge = slot.querySelector('.badge-prototipo');
  if (badge) {
    slot.insertBefore(btn, badge);
  } else {
    slot.appendChild(btn);
  }
  atualizarBotao(root.dataset.theme || 'light');
}

// Aplica tema imediatamente (antes do DOMContentLoaded) para evitar flash
aplicarTema(lerPreferencia());

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injetarBotao);
} else {
  injetarBotao();
}

// Reage à mudança de preferência do sistema (apenas se usuário não definiu)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      aplicarTema(e.matches ? 'dark' : 'light');
    }
  } catch {
    /* ignore */
  }
});
