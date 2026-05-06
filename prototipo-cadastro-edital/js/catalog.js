// catalog.js — render genérico de CRUD de catálogo (lista + formulário modal).

import { Collection } from './storage.js';
import { CATALOGOS, getCatalogo } from './catalog-schemas.js';
import { Toast } from './toast.js';

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
  const header = $('#catalogo-header');
  if (!header) return;
  header.innerHTML = '';
  header.appendChild(
    el(
      'div',
      { class: 'flex-between' },
      el(
        'div',
        {},
        el('h1', { class: 'section-title' }, `${currentDef.icone} ${currentDef.titulo}`),
        el('p', { class: 'section-description', html: currentDef.descricao })
      ),
      el(
        'div',
        { class: 'flex gap-2' },
        el(
          'a',
          { href: 'catalogos.html', class: 'btn btn-ghost' },
          '← Voltar aos catálogos'
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
  const wrapper = $('#catalogo-table');
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
      const refDef = getCatalogo(field.refKey);
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
  return item;
}

function openForm(item = null) {
  editingItem = item;
  closeModal();

  const overlay = el('div', { class: 'modal-overlay', id: 'modal-overlay' });
  const modal = el('div', { class: 'modal modal-large' });

  const title = item ? `Editar ${currentDef.titulo}` : `Novo ${currentDef.titulo.replace(/s$/, '')}`;

  const form = el('form', { id: 'catalogo-form' });
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

export function renderCatalogo(slug) {
  currentSlug = slug;
  currentDef = getCatalogo(slug);

  if (!currentDef) {
    $('#catalogo-header').innerHTML = `<p class="empty-state">Catálogo "${slug}" não encontrado.</p>`;
    return;
  }

  currentCollection = new Collection(currentDef.key);
  document.title = `Uni+ · Catálogo · ${currentDef.titulo}`;

  renderHeader();
  renderTable();

  // ESC fecha modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
