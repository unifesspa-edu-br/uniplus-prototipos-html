// configuracao.js — render genérico de CRUD de configuração (lista + formulário modal).

import { Collection } from './storage.js';
import { CONFIGURACOES, getConfiguracao } from './configuracao-schemas.js';
import { TIPOS_UNIDADE_VALIDOS } from './vocabulario-unidades.js';
import { Toast } from './toast.js';
import { iconNode } from './dom.js';

let currentSlug = null;
let currentDef = null;
let currentCollection = null;
let editingItem = null;

function $(sel, root = document) {
  return root.querySelector(sel);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'on') {
      for (const [evt, handler] of Object.entries(v)) {
        node.addEventListener(evt, handler);
      }
    } else if (k === 'html') node.innerHTML = v;
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function renderHeader() {
  const header = $('#configuracao-header');
  if (!header) return;
  header.innerHTML = '';
  header.appendChild(
    el(
      'div',
      { class: 'flex-between' },
      el(
        'div',
        {},
        el('h1', { class: 'section-title' }, iconNode(currentDef.icone), ` ${currentDef.titulo}`),
        el('p', { class: 'section-description', html: currentDef.descricao })
      ),
      el(
        'div',
        { class: 'flex gap-2' },
        el(
          'a',
          { href: 'configuracoes.html', class: 'btn btn-ghost' },
          '← Voltar aas configurações'
        ),
        el(
          'button',
          { type: 'button', class: 'btn btn-primary', on: { click: () => openForm() } },
          '+ Novo'
        )
      )
    )
  );
}

function formatCellValue(value, coluna) {
  if (value == null || value === '') return el('span', { class: 'text-muted' }, '—');
  if (coluna.tipo === 'bool') {
    return value
      ? el('span', { class: 'tag tag-success' }, 'Sim')
      : el('span', { class: 'tag' }, 'Não');
  }
  if (coluna.tipo === 'tags' && Array.isArray(value)) {
    if (value.length === 0) return el('span', { class: 'text-muted' }, '—');
    const wrap = el('span', { class: 'flex gap-2' });
    value.slice(0, 3).forEach((v) => wrap.appendChild(el('span', { class: 'tag tag-info' }, v)));
    if (value.length > 3) {
      wrap.appendChild(el('span', { class: 'tag' }, `+${value.length - 3}`));
    }
    return wrap;
  }
  let text = String(value);
  if (coluna.truncate && text.length > coluna.truncate) {
    text = text.substring(0, coluna.truncate) + '…';
  }
  return document.createTextNode(text);
}

function renderTable() {
  const wrapper = $('#configuracao-table');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const items = currentCollection.list();

  if (items.length === 0) {
    wrapper.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '📭'),
        el('p', {}, `Nenhuma entrada em ${currentDef.titulo.toLowerCase()}.`),
        el(
          'button',
          { type: 'button', class: 'btn btn-primary mt-4', on: { click: () => openForm() } },
          'Cadastrar primeiro'
        )
      )
    );
    return;
  }

  const table = el('table', { class: 'data-table' });
  const thead = el(
    'thead',
    {},
    el(
      'tr',
      {},
      ...currentDef.colunas.map((c) => el('th', {}, c.label)),
      el('th', { class: 'actions' }, 'Ações')
    )
  );
  const tbody = el('tbody', {});

  for (const item of items) {
    const tr = el('tr', { class: item.ativo === false ? 'is-inactive' : '' });
    for (const coluna of currentDef.colunas) {
      tr.appendChild(el('td', {}, formatCellValue(item[coluna.campo], coluna)));
    }
    tr.appendChild(
      el(
        'td',
        { class: 'actions' },
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-small',
            on: { click: () => openForm(item) },
          },
          '✏️ Editar'
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-small',
            on: {
              click: () => {
                if (item.ativo === false) {
                  currentCollection.activate(item.id);
                  Toast.success(`"${item.nome || item.codigo}" reativado.`);
                } else {
                  if (!confirm(`Inativar "${item.nome || item.codigo}"?`)) return;
                  currentCollection.inactivate(item.id);
                  Toast.warning(`"${item.nome || item.codigo}" inativado.`);
                }
                renderTable();
              },
            },
          },
          item.ativo === false ? '↻ Reativar' : '🚫 Inativar'
        )
      )
    );
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  wrapper.appendChild(el('div', { class: 'table-wrapper' }, table));
}

function getFieldValue(field, value) {
  if (field.tipo === 'multi-tag') {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
  }
  if (field.tipo === 'json') {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  }
  if (field.tipo === 'checkbox') return value ? 'true' : '';
  return value == null ? '' : String(value);
}

/**
 * Editor visual da cascata de remanejamento em 2 etapas:
 *   1) Usuário marca quais modalidades participam (checkboxes)
 *   2) Sistema gera/sincroniza a estrutura automaticamente; usuário reordena destinos
 *
 * Merge inteligente: ao marcar/desmarcar uma modalidade, preserva ordens
 * já ajustadas; adiciona novas no fim; remove as que saíram.
 * O valor salvo continua sendo um objeto { origem: [destinos...] }.
 */
function renderCascataOrdens(field, value) {
  const ordens = JSON.parse(JSON.stringify(value || {}));

  const modCol = new Collection(getConfiguracao('modalidades').key);
  const modalidades = modCol.list({ includeInactive: false });

  const wrapper = el('div', {
    name: field.campo,
    style:
      'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.75rem; background: var(--bg-surface-alt);',
  });
  wrapper._getValue = () => JSON.parse(JSON.stringify(ordens));

  function sincronizar(participantes) {
    // Origens removidas: deletar do objeto
    for (const origem of Object.keys(ordens)) {
      if (!participantes.includes(origem)) delete ordens[origem];
    }
    // Origens adicionadas: criar com destinos iniciais = outras participantes em ordem
    for (const m of participantes) {
      if (!ordens[m]) {
        ordens[m] = participantes.filter((x) => x !== m);
      } else {
        // Origem que continua: limpar destinos que saíram + adicionar novos no fim
        ordens[m] = ordens[m].filter((d) => participantes.includes(d));
        for (const novo of participantes) {
          if (novo !== m && !ordens[m].includes(novo)) ordens[m].push(novo);
        }
      }
    }
  }

  function rerender() {
    wrapper.innerHTML = '';

    // ===== Etapa 1: Seleção de participantes =====
    wrapper.appendChild(
      el(
        'div',
        { class: 'form-help', style: 'margin-bottom: 0.5rem' },
        'Marque as modalidades que vão compor a cascata. A estrutura é gerada automaticamente.'
      )
    );

    const grid = el('div', {
      style:
        'display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.25rem; margin-bottom: 0.75rem',
    });
    const participantes = Object.keys(ordens);
    for (const m of modalidades) {
      const marcado = participantes.includes(m.codigo);
      const cb = el(
        'label',
        {
          style:
            'display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 4px; cursor: pointer; font-size: 0.875rem',
        },
        (() => {
          const i = el('input', { type: 'checkbox' });
          if (marcado) i.setAttribute('checked', '');
          i.addEventListener('change', () => {
            const atualParticipantes = Object.keys(ordens);
            const novos = i.checked
              ? [...atualParticipantes, m.codigo]
              : atualParticipantes.filter((x) => x !== m.codigo);
            sincronizar(novos);
            rerender();
          });
          return i;
        })(),
        el('span', { style: 'font-family: monospace; font-weight: 600' }, m.codigo)
      );
      grid.appendChild(cb);
    }
    wrapper.appendChild(grid);

    // ===== Etapa 2: Cascata gerada =====
    const origens = Object.keys(ordens);
    if (origens.length === 0) {
      wrapper.appendChild(
        el(
          'p',
          { class: 'text-small text-muted', style: 'margin: 0' },
          'Nenhuma modalidade marcada. Marque ao menos uma acima para gerar a cascata.'
        )
      );
      return;
    }

    wrapper.appendChild(
      el(
        'div',
        { style: 'border-top: 1px solid var(--border-default); padding-top: 0.5rem; margin-bottom: 0.5rem' },
        el('strong', { style: 'font-size: 0.875rem' }, 'Cascata gerada — ajuste a ordem dos destinos:')
      )
    );

    for (const origem of origens) {
      wrapper.appendChild(renderCard(origem));
    }
  }

  function renderCard(origem) {
    const destinos = ordens[origem] || [];
    const card = el('div', {
      style:
        'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.5rem 0.75rem; margin-bottom: 0.5rem; background: var(--bg-surface);',
    });

    card.appendChild(
      el(
        'div',
        { style: 'margin-bottom: 0.25rem' },
        el('strong', { style: 'font-family: monospace' }, origem),
        el('span', { class: 'text-small text-muted' }, ' → destinos em ordem de prioridade:')
      )
    );

    if (destinos.length === 0) {
      card.appendChild(
        el(
          'div',
          { class: 'text-small text-muted', style: 'padding: 0.25rem 0; font-style: italic' },
          'Sem destinos — vagas não preenchidas vão direto para o fallback.'
        )
      );
      return card;
    }

    const lista = el('ol', { style: 'list-style: none; padding-left: 0; margin: 0.25rem 0' });
    destinos.forEach((d, idx) => {
      lista.appendChild(
        el(
          'li',
          { style: 'display: flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0' },
          el('span', { class: 'text-small text-muted', style: 'min-width: 1.5em' }, `${idx + 1}.`),
          el('span', { style: 'flex: 1; font-family: monospace; font-size: 0.875rem' }, d),
          (() => {
            const b = el(
              'button',
              {
                type: 'button',
                class: 'btn btn-ghost btn-small',
                title: 'Subir',
                on: {
                  click: () => {
                    if (idx === 0) return;
                    const novos = [...destinos];
                    [novos[idx - 1], novos[idx]] = [novos[idx], novos[idx - 1]];
                    ordens[origem] = novos;
                    rerender();
                  },
                },
              },
              '⬆'
            );
            if (idx === 0) b.setAttribute('disabled', '');
            return b;
          })(),
          (() => {
            const b = el(
              'button',
              {
                type: 'button',
                class: 'btn btn-ghost btn-small',
                title: 'Descer',
                on: {
                  click: () => {
                    if (idx === destinos.length - 1) return;
                    const novos = [...destinos];
                    [novos[idx], novos[idx + 1]] = [novos[idx + 1], novos[idx]];
                    ordens[origem] = novos;
                    rerender();
                  },
                },
              },
              '⬇'
            );
            if (idx === destinos.length - 1) b.setAttribute('disabled', '');
            return b;
          })(),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-small',
              title: 'Remover este destino desta origem',
              on: {
                click: () => {
                  ordens[origem] = destinos.filter((_, i) => i !== idx);
                  rerender();
                },
              },
            },
            '×'
          )
        )
      );
    });
    card.appendChild(lista);
    return card;
  }

  rerender();
  return wrapper;
}

function renderField(field, value) {
  const id = `field-${field.campo}`;
  const wrapper = el(
    'div',
    { class: 'form-row' },
    el(
      'label',
      { class: 'form-label', for: id },
      field.label,
      field.required ? el('span', { style: 'color: #c92a2a' }, ' *') : null
    )
  );

  let input;
  switch (field.tipo) {
    case 'textarea':
      input = el('textarea', {
        id,
        name: field.campo,
        class: 'form-textarea',
        rows: 3,
      });
      input.value = getFieldValue(field, value);
      break;

    case 'json':
      input = el('textarea', {
        id,
        name: field.campo,
        class: 'form-textarea',
        rows: 6,
        style: 'font-family: monospace; font-size: 0.8rem;',
      });
      input.value = getFieldValue(field, value);
      break;

    case 'cascata-ordens':
      input = renderCascataOrdens(field, value);
      break;

    case 'select':
      input = el('select', { id, name: field.campo, class: 'form-select' });
      input.appendChild(el('option', { value: '' }, '— selecione —'));
      for (const opt of field.options) {
        const optEl = el('option', { value: opt.value }, opt.label);
        if (opt.value === value) optEl.setAttribute('selected', '');
        input.appendChild(optEl);
      }
      break;

    case 'ref': {
      const refDef = getConfiguracao(field.refKey);
      const refColl = refDef ? new Collection(refDef.key) : null;
      const refItems = refColl ? refColl.list({ includeInactive: false }) : [];
      input = el('select', { id, name: field.campo, class: 'form-select' });
      input.appendChild(el('option', { value: '' }, '— selecione —'));
      if (field.permiteCoringa) {
        const optEl = el('option', { value: '*' }, '* (qualquer)');
        if (value === '*') optEl.setAttribute('selected', '');
        input.appendChild(optEl);
      }
      for (const ref of refItems) {
        const v = ref[field.refValue || 'codigo'];
        const l = ref[field.refLabel || 'nome'] || v;
        const optEl = el('option', { value: v }, `${v} — ${l}`);
        if (v === value) optEl.setAttribute('selected', '');
        input.appendChild(optEl);
      }
      break;
    }

    case 'checkbox': {
      const cbWrapper = el('label', { class: 'flex gap-2', style: 'cursor: pointer;' });
      const cb = el('input', { type: 'checkbox', id, name: field.campo });
      if (value) cb.setAttribute('checked', '');
      cbWrapper.appendChild(cb);
      cbWrapper.appendChild(document.createTextNode(field.label));
      // substituir label do form-row por nada (já tá no checkbox)
      wrapper.replaceChildren(cbWrapper);
      input = cb;
      break;
    }

    case 'number':
      input = el('input', {
        id,
        name: field.campo,
        type: 'number',
        class: 'form-input',
        step: '1',
      });
      input.value = getFieldValue(field, value);
      break;

    case 'date':
      input = el('input', {
        id,
        name: field.campo,
        type: 'date',
        class: 'form-input',
      });
      input.value = value || '';
      break;

    case 'multi-tag':
      input = el('input', {
        id,
        name: field.campo,
        type: 'text',
        class: 'form-input',
        placeholder: 'Separar por vírgula',
      });
      input.value = getFieldValue(field, value);
      break;

    default:
      input = el('input', {
        id,
        name: field.campo,
        type: 'text',
        class: 'form-input',
      });
      if (field.maxlength) input.setAttribute('maxlength', field.maxlength);
      input.value = getFieldValue(field, value);
  }

  if (field.tipo !== 'checkbox') wrapper.appendChild(input);

  if (field.hint) {
    wrapper.appendChild(el('div', { class: 'form-help' }, field.hint));
  }

  return wrapper;
}

function buildItemFromForm(form) {
  const item = editingItem ? { ...editingItem } : {};
  for (const field of currentDef.campos) {
    const input = form.querySelector(`[name="${field.campo}"]`);
    if (!input) continue;
    let value;
    switch (field.tipo) {
      case 'checkbox':
        value = input.checked;
        break;
      case 'number':
        value = input.value === '' ? null : Number(input.value);
        break;
      case 'multi-tag':
        value = input.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case 'json':
        if (input.value.trim() === '') {
          value = null;
        } else {
          try {
            value = JSON.parse(input.value);
          } catch (e) {
            throw new Error(`Campo "${field.label}" tem JSON inválido: ${e.message}`);
          }
        }
        break;
      case 'cascata-ordens':
        value = input._getValue ? input._getValue() : {};
        break;
      default:
        value = input.value.trim() === '' ? null : input.value.trim();
    }
    if (field.required && (value == null || value === '' || value === false)) {
      // checkbox false não é "missing"; só strings/refs vazias
      if (field.tipo !== 'checkbox') {
        throw new Error(`Campo "${field.label}" é obrigatório.`);
      }
    }
    item[field.campo] = value;
  }
  // Validações específicas por configuração.
  if (currentSlug === 'unidades') {
    validarUnidade(item);
  }
  return item;
}

// `TIPOS_UNIDADE_VALIDOS` é importada de `vocabulario-unidades.js` (fonte única).
// Validação aqui é defesa em profundidade contra entradas que pulem o formulário
// (import, console, seeds adulterados).

/**
 * Valida integridade da hierarquia de Unidade:
 *   - código único (ignorando a própria entrada em edição);
 *   - tipo obrigatório e dentro do enum canônico (decisão TL 2026-05-18);
 *   - parent_codigo (se informado) deve existir e ser diferente do código atual;
 *   - sem ciclos (subindo a cadeia parent → parent → ... até null ou auto-loop).
 * Lança Error com mensagem humanizada (não vaza stack).
 */
function validarUnidade(item) {
  const itens = currentCollection.list({ includeInactive: true });
  const codigo = item.codigo;
  // Normalização defensiva: strings vazias, espaços-em-branco e undefined viram null
  // antes da validação (e antes de persistir). Evita FK inválida vinda de CSV import,
  // formulários onde o usuário esvaziou o campo, ou seeds adulterados.
  let parent = item.parent_codigo;
  if (typeof parent === 'string') {
    parent = parent.trim();
    if (parent === '') parent = null;
  } else if (parent === undefined) {
    parent = null;
  }
  item.parent_codigo = parent;

  if (codigo) {
    const conflito = itens.find((u) => u.codigo === codigo && u.id !== item.id);
    if (conflito) {
      throw new Error(`Já existe uma unidade com o código "${codigo}". Escolha outro.`);
    }
  }

  // Tipo: obrigatório no MVP + restrito ao enum canônico.
  if (!item.tipo) {
    throw new Error('Tipo da unidade é obrigatório. Selecione um dos valores da lista.');
  }
  if (!TIPOS_UNIDADE_VALIDOS.has(item.tipo)) {
    throw new Error(
      `Tipo "${item.tipo}" não é um valor aceito. Valores válidos: ${[...TIPOS_UNIDADE_VALIDOS].join(', ')}.`
    );
  }

  if (parent) {
    if (parent === codigo) {
      throw new Error('Unidade pai não pode ser ela mesma.');
    }
    // Monta índice das entradas existentes + reflete o item atual sendo salvo,
    // para que a detecção de ciclo considere o estado pós-save.
    const porCodigo = new Map();
    for (const u of itens) {
      if (u.id !== item.id) porCodigo.set(u.codigo, u);
    }
    porCodigo.set(codigo, item);

    const parentObj = porCodigo.get(parent);
    if (!parentObj) {
      throw new Error(`Unidade pai "${parent}" não foi encontrada.`);
    }

    // Sobe a cadeia parent → parent → ... e detecta loop.
    const visitados = new Set([codigo]);
    let atual = parentObj;
    while (atual && atual.parent_codigo) {
      if (visitados.has(atual.parent_codigo)) {
        throw new Error(`Loop detectado na hierarquia (${atual.codigo} → ${atual.parent_codigo}).`);
      }
      visitados.add(atual.parent_codigo);
      atual = porCodigo.get(atual.parent_codigo);
    }
  }
}

function openForm(item = null) {
  editingItem = item;
  closeModal();

  const overlay = el('div', { class: 'modal-overlay', id: 'modal-overlay' });
  const modal = el('div', { class: 'modal modal-large' });

  const title = item ? `Editar ${currentDef.titulo}` : `Novo ${currentDef.titulo.replace(/s$/, '')}`;

  const form = el('form', { id: 'configuracao-form' });
  const formGrid = el('div', { class: 'form-grid' });
  for (const field of currentDef.campos) {
    formGrid.appendChild(renderField(field, item ? item[field.campo] : undefined));
  }
  form.appendChild(formGrid);

  modal.appendChild(
    el(
      'div',
      { class: 'modal-header' },
      el('h2', { class: 'modal-title' }, title),
      el(
        'button',
        { type: 'button', class: 'modal-close', on: { click: closeModal } },
        '×'
      )
    )
  );
  modal.appendChild(el('div', { class: 'modal-body' }, form));
  modal.appendChild(
    el(
      'div',
      { class: 'modal-footer' },
      el('button', { type: 'button', class: 'btn btn-ghost', on: { click: closeModal } }, 'Cancelar'),
      el(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary',
          on: {
            click: () => {
              try {
                const newItem = buildItemFromForm(form);
                currentCollection.upsert(newItem);
                Toast.success(item ? 'Atualizado.' : 'Cadastrado.');
                closeModal();
                renderTable();
              } catch (e) {
                Toast.error(e.message);
              }
            },
          },
        },
        'Salvar'
      )
    )
  );

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);

  // Foco no primeiro campo
  setTimeout(() => form.querySelector('input, textarea, select')?.focus(), 50);
}

function closeModal() {
  $('#modal-overlay')?.remove();
}

export function renderConfiguracao(slug) {
  currentSlug = slug;
  currentDef = getConfiguracao(slug);

  if (!currentDef) {
    $('#configuracao-header').innerHTML = `<p class="empty-state">Configuração "${slug}" não encontrado.</p>`;
    return;
  }

  currentCollection = new Collection(currentDef.key);
  document.title = `Uni+ · Configuração · ${currentDef.titulo}`;

  renderHeader();
  renderTable();

  // ESC fecha modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
