// dom.js — helpers compartilhados para construir DOM e formulários

export function el(tag, attrs = {}, ...children) {
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
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean') {
      node.appendChild(document.createTextNode(String(c)));
    } else if (c instanceof Node) {
      node.appendChild(c);
    } else {
      node.appendChild(document.createTextNode(String(c)));
    }
  }
  return node;
}

export function field(label, control, hint) {
  return el(
    'div',
    { class: 'form-row' },
    el('label', { class: 'form-label' }, label),
    control,
    hint ? el('div', { class: 'form-help' }, hint) : null
  );
}

export function input(value, onChange, opts = {}) {
  const i = el('input', {
    type: opts.type || 'text',
    class: 'form-input',
    placeholder: opts.placeholder || '',
  });
  if (opts.maxlength) i.setAttribute('maxlength', opts.maxlength);
  if (opts.step) i.setAttribute('step', opts.step);
  i.value = value == null ? '' : value;
  i.addEventListener('input', () => onChange(opts.type === 'number' && i.value !== '' ? Number(i.value) : i.value));
  return i;
}

export function textarea(value, onChange, opts = {}) {
  const t = el('textarea', { class: 'form-textarea', rows: opts.rows || 3 });
  t.value = value || '';
  t.addEventListener('input', () => onChange(t.value));
  return t;
}

export function checkbox(label, value, onChange) {
  const wrap = el('label', { class: 'flex gap-2', style: 'cursor: pointer; align-items: center;' });
  const cb = el('input', { type: 'checkbox' });
  if (value) cb.setAttribute('checked', '');
  cb.addEventListener('change', () => onChange(cb.checked));
  wrap.appendChild(cb);
  // Aceita Node (ex.: <strong>) ou string como label
  if (label instanceof Node) {
    wrap.appendChild(document.createTextNode(' '));
    wrap.appendChild(label);
  } else {
    wrap.appendChild(document.createTextNode(' ' + label));
  }
  return wrap;
}

export function select(value, options, onChange, opts = {}) {
  const s = el('select', { class: 'form-select' });
  if (opts.placeholder) {
    const placeholder = el('option', { value: '' }, opts.placeholder);
    if (value == null || value === '') placeholder.setAttribute('selected', '');
    s.appendChild(placeholder);
  }
  for (const opt of options) {
    const o = el('option', { value: opt.value }, opt.label);
    if (opt.value === value) o.setAttribute('selected', '');
    s.appendChild(o);
  }
  s.addEventListener('change', () => onChange(s.value || null));
  return s;
}

export function dateInput(value, onChange) {
  return input(value, onChange, { type: 'date' });
}

/**
 * Renderiza um ícone como Node — `<img>` quando o valor termina em `.svg`
 * (caminho de arquivo) ou nó de texto para emojis. Permite que campos `icone`
 * das configurações/passos aceitem tanto emoji quanto SVG sem ramificações no chamador.
 */
export function iconNode(icone) {
  if (typeof icone === 'string' && icone.endsWith('.svg')) {
    const img = document.createElement('img');
    img.src = icone;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.className = 'step-icon-img';
    return img;
  }
  return document.createTextNode(icone);
}

export function badge(text, type = 'info') {
  return el('span', { class: `tag tag-${type}` }, text);
}

export function emptyState(icone, texto) {
  return el(
    'div',
    { class: 'empty-state' },
    el('div', { class: 'empty-state-icon' }, icone),
    el('p', {}, texto)
  );
}
