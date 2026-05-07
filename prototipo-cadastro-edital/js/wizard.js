// wizard.js — controlador do wizard (estado, navegação, autosave, render).

import { Storage, Collection, Keys } from './storage.js';
import { Toast } from './toast.js';
import { STEPS, getStep } from './wizard-steps.js';

const RASCUNHOS = new Collection(Keys.EDITAIS_RASCUNHO);

// =====================================================
// Estado
// =====================================================
let state = null;
let currentStepId = 1;
const stepModules = new Map(); // cache de módulos importados

// =====================================================
// Estado do edital (criação / leitura)
// =====================================================

function novoEstadoEdital() {
  return {
    id: crypto.randomUUID(),
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    passoAtual: 1,
    statusPorPasso: {}, // { 1: 'in-progress' | 'completed' | 'pending', ... }
    edital: {
      tipo: null, // { tipoEditalId, codigo, nome }
      identificacao: {},
      vagasModalidades: { cursos: [], modalidades: [], concorrenciaDupla: false, cascata: [] },
      etapas: [],
      formula: {},
      bonus: null,
      desempate: [],
      eliminacao: { notasMinimas: {}, clausulas: [] },
      documentos: [],
      locais: [],
      atendimento: [],
    },
  };
}

function carregarOuCriar(id) {
  if (id) {
    const existente = RASCUNHOS.byId(id);
    if (existente) return existente;
    Toast.warning('Rascunho não encontrado, criando novo.');
  }
  return novoEstadoEdital();
}

export function salvar() {
  state.atualizadoEm = new Date().toISOString();
  RASCUNHOS.upsert(state);
}

// =====================================================
// API exposta para os passos
// =====================================================

export function getState() {
  return state;
}

export function updateState(patch) {
  Object.assign(state.edital, patch);
  state.atualizadoEm = new Date().toISOString();
  salvar();
}

export function setStepStatus(stepId, status) {
  state.statusPorPasso[stepId] = status;
  salvar();
  renderSidebar();
}

// =====================================================
// Navegação
// =====================================================

function podeAcessar(stepId) {
  // Passo 1 sempre acessível.
  if (stepId === 1) return true;
  // Outros: precisa do tipo definido.
  if (!state.edital.tipo) return false;
  return true;
}

async function navigateTo(stepId) {
  if (!podeAcessar(stepId)) {
    Toast.warning('Conclua o passo anterior antes de avançar.');
    return;
  }
  currentStepId = stepId;
  state.passoAtual = stepId;
  salvar();
  await renderStep();
  renderSidebar();
  // Atualizar URL (hash)
  history.replaceState(null, '', `?id=${state.id}#passo-${stepId}`);
}

// =====================================================
// Render
// =====================================================

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'on') {
      for (const [evt, h] of Object.entries(v)) node.addEventListener(evt, h);
    } else if (k === 'html') node.innerHTML = v;
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function statusIcon(status) {
  switch (status) {
    case 'completed': return '✅';
    case 'in-progress': return '⏳';
    case 'warning': return '⚠️';
    case 'blocked': return '🔒';
    default: return '○';
  }
}

function renderSidebar() {
  const sidebar = document.getElementById('wizard-sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = '';
  sidebar.appendChild(el('div', { class: 'wizard-sidebar-title' }, 'Passos'));

  const ul = el('ul', { class: 'wizard-steps' });
  for (const step of STEPS) {
    const isCurrent = step.id === currentStepId;
    const isBlocked = !podeAcessar(step.id);
    const status = isBlocked
      ? 'blocked'
      : state.statusPorPasso[step.id] || 'pending';

    const button = el(
      'button',
      {
        type: 'button',
        class: `wizard-step status-${status} ${isCurrent ? 'is-current' : ''}`,
        on: { click: () => navigateTo(step.id) },
      },
      el('span', { class: 'wizard-step-icon' }, statusIcon(status)),
      el(
        'span',
        { class: 'wizard-step-label' },
        el('span', { class: 'wizard-step-number' }, `${String(step.id).padStart(2, '0')} `),
        step.titulo
      )
    );
    if (isBlocked) {
      button.setAttribute('disabled', '');
      button.setAttribute('title', 'Defina o tipo de edital primeiro.');
    }
    const li = el('li', {}, button);
    ul.appendChild(li);
  }
  sidebar.appendChild(ul);

  // Footer com info de rascunho
  sidebar.appendChild(
    el(
      'div',
      { style: 'padding: 1rem 1.5rem; border-top: 1px solid var(--color-secondary-04, #ccc); margin-top: 1rem; font-size: 0.75rem;' },
      el('div', { class: 'text-muted' }, 'Rascunho'),
      el('div', { style: 'font-family: monospace; font-size: 0.7rem;' }, state.id.substring(0, 8))
    )
  );
}

async function loadStepModule(step) {
  if (stepModules.has(step.id)) return stepModules.get(step.id);
  try {
    const mod = await import(step.modulo);
    stepModules.set(step.id, mod);
    return mod;
  } catch (e) {
    console.warn(`Passo ${step.id} ainda não implementado:`, e.message);
    // Fallback: módulo placeholder
    const fallback = {
      render: (container, ctx) => {
        container.innerHTML = '';
        container.appendChild(
          el(
            'div',
            { class: 'empty-state' },
            el('div', { class: 'empty-state-icon' }, step.icone),
            el('h3', {}, step.titulo),
            el('p', {}, `Conteúdo do passo ${step.id} ainda não implementado neste protótipo.`),
            el('p', { class: 'text-small text-muted' }, 'Será adicionado na Etapa 4.')
          )
        );
      },
    };
    stepModules.set(step.id, fallback);
    return fallback;
  }
}

async function renderStep() {
  const step = getStep(currentStepId);
  const content = document.getElementById('wizard-content');
  if (!step || !content) return;

  content.innerHTML = '';
  const header = el(
    'div',
    { class: 'wizard-step-header' },
    el('h2', { class: 'wizard-step-title' }, `${step.icone}  Passo ${step.id}: ${step.titulo}`)
  );
  content.appendChild(header);

  const body = el('div', { id: 'step-body' });
  content.appendChild(body);

  const actions = el(
    'div',
    { class: 'wizard-actions' },
    el(
      'div',
      { class: 'wizard-actions-secondary' },
      el(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost',
          on: { click: () => salvar() && Toast.success('Rascunho salvo.') },
        },
        '💾 Salvar rascunho'
      ),
      el(
        'a',
        { href: 'editais.html', class: 'btn btn-ghost' },
        'Sair'
      )
    ),
    el(
      'div',
      { class: 'flex gap-2' },
      step.id > 1
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              on: { click: () => navigateTo(step.id - 1) },
            },
            '← Voltar'
          )
        : null,
      step.id < STEPS.length
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn btn-primary',
              on: { click: () => navigateTo(step.id + 1) },
            },
            'Próximo →'
          )
        : null
    )
  );
  content.appendChild(actions);

  // Carrega módulo do passo (lazy)
  const mod = await loadStepModule(step);
  if (mod.render) {
    await mod.render(body, {
      state,
      updateState,
      setStepStatus: (s) => setStepStatus(step.id, s),
      navigateTo,
      salvar,
    });
  }
}

// =====================================================
// Boot
// =====================================================

export async function bootWizard(idParam) {
  state = carregarOuCriar(idParam);

  // Se rascunho novo, mostra modal de abertura ao invés do passo 1
  if (!idParam && Object.keys(state.statusPorPasso).length === 0 && !state.edital.tipo) {
    showModalAbertura();
  }

  salvar();

  // Determina passo atual
  const hashMatch = window.location.hash.match(/passo-(\d+)/);
  if (hashMatch) {
    const requested = Number(hashMatch[1]);
    if (podeAcessar(requested)) currentStepId = requested;
  } else {
    currentStepId = state.passoAtual || 1;
  }

  renderSidebar();
  await renderStep();
}

async function showModalAbertura() {
  const { cloneFromModelo, cloneFromEditalPublicado } = await import('./clone.js');
  const modelos = new Collection(Keys.MODELOS).list({ includeInactive: false });
  const publicados = new Collection(Keys.EDITAIS_PUBLICADO).list({ includeInactive: true });

  const overlay = el('div', { class: 'modal-overlay' });

  function aplicarClone(novoEstado) {
    state = novoEstado;
    salvar();
    overlay.remove();
    currentStepId = state.passoAtual || 1;
    renderSidebar();
    renderStep();
    history.replaceState(null, '', `?id=${state.id}#passo-${currentStepId}`);
  }

  function escolherModelo() {
    const modal2 = el(
      'div',
      { class: 'modal modal-large' },
      el(
        'div',
        { class: 'modal-header' },
        el('h2', { class: 'modal-title' }, '📋 Escolher modelo'),
        el('button', { type: 'button', class: 'modal-close', on: { click: () => overlay.remove() } }, '×')
      )
    );
    const body = el('div', { class: 'modal-body' });
    if (modelos.length === 0) {
      body.appendChild(el('p', { class: 'text-muted' }, 'Nenhum modelo cadastrado.'));
    } else {
      const list = el('div', { class: 'card-grid' });
      for (const m of modelos) {
        list.appendChild(
          el(
            'button',
            {
              type: 'button',
              class: 'br-card card-link',
              on: {
                click: () => {
                  try {
                    const novo = cloneFromModelo(m.id);
                    aplicarClone(novo);
                    Toast.success(`Rascunho criado a partir do modelo "${m.nome}".`);
                  } catch (e) {
                    Toast.error(e.message);
                  }
                },
              },
            },
            el(
              'div',
              { class: 'card-content' },
              el('h3', { class: 'card-title' }, m.nome),
              el('p', { class: 'card-text' }, `Tipo: ${m.tipo_edital_codigo || '?'}`),
              el(
                'p',
                { class: 'text-small text-muted' },
                `Criado em ${new Date(m.criadoEm).toLocaleDateString('pt-BR')}`
              )
            )
          )
        );
      }
      body.appendChild(list);
    }
    modal2.appendChild(body);
    overlay.replaceChildren(modal2);
  }

  function escolherEdital() {
    const modal2 = el(
      'div',
      { class: 'modal modal-large' },
      el(
        'div',
        { class: 'modal-header' },
        el('h2', { class: 'modal-title' }, '📑 Escolher edital publicado'),
        el('button', { type: 'button', class: 'modal-close', on: { click: () => overlay.remove() } }, '×')
      )
    );
    const body = el('div', { class: 'modal-body' });
    if (publicados.length === 0) {
      body.appendChild(el('p', { class: 'text-muted' }, 'Nenhum edital publicado.'));
    } else {
      const list = el('div', { class: 'card-grid' });
      for (const ed of publicados) {
        const ident = ed.snapshot?.identificacao || {};
        list.appendChild(
          el(
            'button',
            {
              type: 'button',
              class: 'br-card card-link',
              on: {
                click: () => {
                  try {
                    const novo = cloneFromEditalPublicado(ed.id);
                    aplicarClone(novo);
                    Toast.success('Rascunho criado a partir do edital publicado.');
                  } catch (e) {
                    Toast.error(e.message);
                  }
                },
              },
            },
            el(
              'div',
              { class: 'card-content' },
              el('h3', { class: 'card-title' }, `${ident.numero || '?'}/${ident.ano || '?'}`),
              el('p', { class: 'card-text' }, ident.nomeProcesso || '(sem nome)'),
              el(
                'p',
                { class: 'text-small text-muted' },
                `Tipo ${ed.snapshot?.tipo?.codigo || '?'} · Hash ${(ed.hash || '').substring(0, 8)}…`
              )
            )
          )
        );
      }
      body.appendChild(list);
    }
    modal2.appendChild(body);
    overlay.replaceChildren(modal2);
  }

  const modal = el(
    'div',
    { class: 'modal' },
    el(
      'div',
      { class: 'modal-header' },
      el('h2', { class: 'modal-title' }, '🌱 Como começar?'),
      el('button', { type: 'button', class: 'modal-close', on: { click: () => overlay.remove() } }, '×')
    ),
    el(
      'div',
      { class: 'modal-body' },
      el('p', { class: 'mb-4' }, 'Escolha como iniciar seu rascunho de edital:'),
      el(
        'div',
        { class: 'card-grid' },
        el(
          'button',
          {
            type: 'button',
            class: 'br-card card-link',
            on: { click: () => overlay.remove() },
          },
          el(
            'div',
            { class: 'card-content' },
            el('h3', { class: 'card-title' }, '📄 Em branco'),
            el('p', { class: 'card-text' }, 'Iniciar do zero — escolher tipo no passo 1.')
          )
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'br-card card-link',
            on: { click: escolherModelo },
          },
          el(
            'div',
            { class: 'card-content' },
            el('h3', { class: 'card-title' }, '📋 Clonar de modelo'),
            el(
              'p',
              { class: 'card-text' },
              `${modelos.length} modelo(s) cadastrado(s). Datas e vagas vêm em branco.`
            )
          )
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'br-card card-link',
            on: { click: escolherEdital },
          },
          el(
            'div',
            { class: 'card-content' },
            el('h3', { class: 'card-title' }, '📑 Clonar edital existente'),
            el(
              'p',
              { class: 'card-text' },
              `${publicados.length} edital(is) publicado(s). Mantém vagas e estrutura.`
            )
          )
        )
      )
    )
  );
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
