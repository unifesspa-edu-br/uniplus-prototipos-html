/* inspector.js — bancada de inspeção visual do protótipo */

import { Prefs } from './prefs.js';
import { ratio, resolveCSSVar, classifyRatio } from './contrast.js';

/* =========================================================================
   Estado
   ========================================================================= */
const state = {
  design: Prefs.get('design', 'briefing'),    // 'figma' | 'briefing'
  fontscale: Prefs.get('fontscale', 'padrao'), // 'diminuir' | 'padrao' | 'aumentar'
  contrast: Prefs.get('contrast', 'normal'),   // 'normal' | 'alto'
  tema: Prefs.get('tema', 'claro'),            // 'claro' | 'escuro'
  fonte: Prefs.get('fonte', 'institucional'),  // 'institucional' | 'legivel'
  viewport: Prefs.get('viewport', 'desktop'),  // 'mobile' | 'tablet' | 'desktop'
};

/* =========================================================================
   Aplicação dos atributos no DOM
   ========================================================================= */
function apply() {
  const root = document.documentElement;
  const page = document.querySelector('.page-frame');

  // O modo de design afeta apenas o page-frame (não o inspector)
  if (page) page.setAttribute('data-design', state.design);

  // Modos de a11y: aplicam tanto ao root quanto ao page-frame para herdar tokens
  for (const target of [root, page].filter(Boolean)) {
    target.setAttribute('data-a11y-fontscale', state.fontscale);
    target.setAttribute('data-a11y-contrast', state.contrast);
    target.setAttribute('data-a11y-tema', state.tema);
    target.setAttribute('data-a11y-fonte', state.fonte);
  }

  const frame = document.querySelector('.viewport-frame');
  if (frame) frame.setAttribute('data-viewport', state.viewport);

  syncButtons();
  refreshInspector();
}

function syncButtons() {
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    const [group, value] = btn.dataset.toggle.split(':');
    const active = state[group] === value;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

/* =========================================================================
   Listeners
   ========================================================================= */
function setupToggles() {
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [group, value] = btn.dataset.toggle.split(':');

      // Toggles binários (alto contraste, fonte legível, escuro): clicar quando ativo desliga
      if (group === 'contrast' && value === 'alto') {
        state.contrast = state.contrast === 'alto' ? 'normal' : 'alto';
      } else if (group === 'tema' && value === 'escuro') {
        state.tema = state.tema === 'escuro' ? 'claro' : 'escuro';
      } else if (group === 'fonte' && value === 'legivel') {
        state.fonte = state.fonte === 'legivel' ? 'institucional' : 'legivel';
      } else {
        state[group] = value;
      }

      Prefs.set(group, state[group]);
      apply();
    });
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'reset') {
        Object.keys(state).forEach((k) => Prefs.remove(k));
        Object.assign(state, {
          design: 'briefing',
          fontscale: 'padrao',
          contrast: 'normal',
          tema: 'claro',
          fonte: 'institucional',
          viewport: 'desktop',
        });
        apply();
      }
      if (action === 'toggle-inspector') {
        const insp = document.querySelector('.inspector');
        const open = insp.getAttribute('data-open') === 'true';
        insp.setAttribute('data-open', open ? 'false' : 'true');
      }
    });
  });
}

/* =========================================================================
   Refresh do painel: tokens ativos + matriz de contraste
   ========================================================================= */
function refreshInspector() {
  refreshTokens();
  refreshContrast();
  refreshDiff();
}

const TOKENS_TO_SHOW = [
  ['--font-body', false],
  ['--text-base', false],
  ['--text-2xl', false],
  ['--leading-base', false],
  ['--text-default', true],
  ['--text-secondary', true],
  ['--text-title', true],
  ['--color-azure-39', true],
  ['--color-azure-14', true],
  ['--color-divider', true],
  ['--bg-page', true],
  ['--bg-card', true],
  ['--focus-color', true],
  ['--a11y-btn-size', false],
  ['--line-max', false],
];

function refreshTokens() {
  const root = document.querySelector('.page-frame') || document.documentElement;
  const list = document.getElementById('inspector-tokens');
  if (!list) return;

  // Para o modo Figma, mapear nomes equivalentes
  const designAtual = state.design;
  const TOKENS = designAtual === 'figma'
    ? [
        ['--font-body', false],
        ['--text-fig-base', false],
        ['--text-fig-2xl', false],
        ['--leading-fig-base', false],
        ['--text-default', true],
        ['--text-secondary', true],
        ['--text-title', true],
        ['--color-azure-39', true],
        ['--color-azure-14', true],
        ['--color-divider', true],
        ['--bg-page', true],
        ['--bg-card', true],
        ['--focus-color', true],
        ['--a11y-btn-size', false],
      ]
    : TOKENS_TO_SHOW;

  list.innerHTML = TOKENS.map(([name, isColor]) => {
    const value = getComputedStyle(root).getPropertyValue(name).trim() || '—';
    const swatch = isColor && value.startsWith('#')
      ? `<span class="token-swatch" style="background:${value}"></span>`
      : '';
    return `
      <li class="token-list__item">
        <span class="token-list__name">${name}</span>
        <span class="token-list__value">${swatch}<span>${value || '—'}</span></span>
      </li>`;
  }).join('');
}

const CONTRAST_PAIRS = [
  { fg: '--text-default', bg: '--bg-page', label: 'Body / fundo' },
  { fg: '--text-secondary', bg: '--bg-page', label: 'Secundário / fundo' },
  { fg: '--text-title', bg: '--bg-page', label: 'Título / fundo' },
  { fg: '--text-default', bg: '--bg-card', label: 'Body / card' },
  { fg: '--text-secondary', bg: '--bg-card', label: 'Secundário / card' },
  { fg: '--text-on-primary', bg: '--color-azure-39', label: 'Texto / CTA azul' },
  { fg: '--text-on-primary', bg: '--color-azure-14', label: 'Header / azul escuro' },
];

function refreshContrast() {
  const root = document.querySelector('.page-frame') || document.documentElement;
  const list = document.getElementById('inspector-contrast');
  if (!list) return;

  list.innerHTML = CONTRAST_PAIRS.map((p) => {
    const fgHex = resolveCSSVar(p.fg, root);
    const bgHex = resolveCSSVar(p.bg, root);
    if (!fgHex || !bgHex || !fgHex.startsWith('#') || !bgHex.startsWith('#')) {
      return `<li class="contrast-row"><span>—</span><span class="contrast-row__label">${p.label}</span><span class="contrast-row__ratio">—</span><span></span></li>`;
    }
    const r = ratio(fgHex, bgHex);
    const tag = classifyRatio(r);
    return `
      <li class="contrast-row">
        <span class="contrast-sample" style="background:${bgHex};color:${fgHex}">Aa</span>
        <span class="contrast-row__label">${p.label}<br><small>${fgHex} / ${bgHex}</small></span>
        <span class="contrast-row__ratio">${r.toFixed(2)}:1</span>
        <span class="contrast-badge ${tag.cls}">${tag.tag}</span>
      </li>`;
  }).join('');
}

const DIFF_ITEMS = [
  {
    from: 'Inter (default Figma)',
    to: 'Rawline → Public Sans → Inter',
    why: 'ADR-0019 obriga Rawline; Public Sans humanista substitui Raleway geométrica (ruim para baixa visão).',
  },
  {
    from: 'Tamanhos fracionários (15.5, 17.1, 21, 27 px)',
    to: 'Escala tokenizada (12.8/14/16/18/20/24/32 px)',
    why: 'Tokens nomeados; corpo mínimo 16px, alinhado à foundation Gov.br.',
  },
  {
    from: 'Cinza secundário #636363 (5.74:1, AA)',
    to: '#595959 (7.04:1, AAA)',
    why: 'AAA torna texto secundário legível para baixa visão sem zoom.',
  },
  {
    from: 'Botões A−/A/A+ ~32×32 px',
    to: '≥44×44 px (touch target)',
    why: 'WCAG 2.5.5 — toque acessível para deficiência motora e dedos grandes.',
  },
  {
    from: 'Linha sem limite (estica até a borda)',
    to: 'max-inline-size 75ch (~80 caracteres)',
    why: 'WCAG 1.4.8 AAA — leitura confortável em telas largas.',
  },
  {
    from: 'Sem toggle de fonte legível',
    to: 'Toggle Atkinson Hyperlegible (Braille Institute)',
    why: 'Fonte desenhada para baixa visão; default institucional preserva Gov.br.',
  },
  {
    from: 'Line-height implícito (~1.36)',
    to: 'Line-height 1.5',
    why: 'WCAG 1.4.12 — espaçamento override-friendly sem quebrar layout.',
  },
];

function refreshDiff() {
  const list = document.getElementById('inspector-diff');
  if (!list) return;
  list.innerHTML = DIFF_ITEMS.map(
    (d) => `
    <li class="diff-list__item">
      <span class="diff-list__from">${d.from}</span>
      <span class="diff-list__to">→ ${d.to}</span>
      <span class="diff-list__why">${d.why}</span>
    </li>`
  ).join('');
}

/* =========================================================================
   Modo demo limpo: ?clean=1 esconde o Inspector inteiro (para screenshots
   e apresentações). Continua respondendo a localStorage e atributos data-*
   no page-frame, mas sem a UI da bancada.
   ========================================================================= */
function applyDemoClean() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('clean') === '1') {
    document.body.classList.add('demo-clean');
  }
}

/* =========================================================================
   Popovers (mobile): hamburger do user menu + acessibilidade.
   ========================================================================= */
function setupPopovers() {
  const triggers = document.querySelectorAll('[data-popover-trigger]');
  const closes = document.querySelectorAll('[data-popover-close]');

  let backdrop = document.querySelector('.popover-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'popover-backdrop';
    backdrop.hidden = true;
    document.body.appendChild(backdrop);
  }

  function openPopover(id) {
    const popover = document.getElementById(id);
    if (!popover) return;
    closeAllPopovers(); // mutuamente exclusivos
    popover.hidden = false;
    backdrop.hidden = false;
    const trigger = document.querySelector(`[data-popover-trigger="${id}"]`);
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    // Move foco para primeiro botão do popover
    const focusable = popover.querySelector('button, a, [tabindex]');
    if (focusable instanceof HTMLElement) focusable.focus();
  }

  function closePopover(id) {
    const popover = document.getElementById(id);
    if (!popover) return;
    popover.hidden = true;
    const trigger = document.querySelector(`[data-popover-trigger="${id}"]`);
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      if (trigger instanceof HTMLElement) trigger.focus();
    }
    if (!document.querySelector('.popover:not([hidden])')) {
      backdrop.hidden = true;
    }
  }

  function closeAllPopovers() {
    let lastTrigger = null;
    document.querySelectorAll('.popover:not([hidden])').forEach((p) => {
      p.hidden = true;
      const trigger = document.querySelector(`[data-popover-trigger="${p.id}"]`);
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        lastTrigger = trigger;
      }
    });
    backdrop.hidden = true;
    // Devolve o foco ao último trigger fechado — boa prática a11y para
    // dialogs que fecham por Escape / click-outside
    if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const id = trigger.getAttribute('data-popover-trigger');
      if (!id) return;
      const popover = document.getElementById(id);
      if (popover && !popover.hidden) {
        closePopover(id);
      } else {
        openPopover(id);
      }
    });
  });

  closes.forEach((closeBtn) => {
    closeBtn.addEventListener('click', () => {
      const id = closeBtn.getAttribute('data-popover-close');
      if (id) closePopover(id);
    });
  });

  backdrop.addEventListener('click', closeAllPopovers);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers();
  });
}

/* =========================================================================
   Boot
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  applyDemoClean();
  setupToggles();
  setupPopovers();
  apply();
});
