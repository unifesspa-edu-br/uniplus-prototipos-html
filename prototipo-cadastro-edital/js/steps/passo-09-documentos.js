// Passo 10: Documentos por modalidade — matriz TipoDocumento × Modalidade × Obrigatório.

import { Collection, Keys } from '../storage.js';
import { el, checkbox } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const documentos = state.edital.documentos || [];
  const tiposCatalogo = new Collection(Keys.TIPOS_DOCUMENTO).list({ includeInactive: false });
  const modalidadesEdital = state.edital.vagasModalidades?.modalidades || [];

  function findEntry(tipoCod, mod) {
    return documentos.find((d) => d.tipoDocumentoCodigo === tipoCod && d.modalidade === mod);
  }

  function isMarcado(tipoCod, mod) {
    return !!findEntry(tipoCod, mod)?.obrigatorio;
  }

  function toggle(tipoCod, mod, obrigatorio) {
    const sem = documentos.filter(
      (d) => !(d.tipoDocumentoCodigo === tipoCod && d.modalidade === mod)
    );
    const novo = obrigatorio
      ? [...sem, { tipoDocumentoCodigo: tipoCod, modalidade: mod, obrigatorio: true }]
      : sem;
    updateState({ documentos: novo });
    avaliarStatus();
  }

  function avaliarStatus() {
    const d = state.edital.documentos;
    setStepStatus(d.length > 0 ? 'completed' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Marque quais documentos cada modalidade exige. Mesmo documento pode ser obrigatório para algumas modalidades e opcional para outras.'));

  if (modalidadesEdital.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Configure as modalidades no passo 4 primeiro.'));
    return;
  }

  if (tiposCatalogo.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Cadastre tipos de documento primeiro.'));
    return;
  }

  // Agrupa por categoria
  const porCategoria = new Map();
  for (const t of tiposCatalogo) {
    const cat = t.categoria || 'OUTROS';
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat).push(t);
  }

  for (const [categoria, tipos] of porCategoria) {
    const wrap = el('div', { class: 'mb-4' });
    wrap.appendChild(el('h3', { style: 'font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); margin: 1rem 0 0.5rem' }, categoria));

    const tableWrap = el('div', { class: 'table-wrapper' });
    const table = el('table', { class: 'data-table' });
    const thead = el('thead');
    const headRow = el('tr', {}, el('th', {}, 'Documento'));
    for (const mod of modalidadesEdital) {
      headRow.appendChild(el('th', { style: 'width: 80px; text-align: center' }, mod));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const tipo of tipos) {
      const tr = el(
        'tr',
        {},
        el('td', {}, el('strong', {}, tipo.nome), tipo.descricao ? el('div', { class: 'text-small text-muted' }, tipo.descricao) : null)
      );
      for (const mod of modalidadesEdital) {
        const cb = el('input', { type: 'checkbox', style: 'cursor: pointer' });
        if (isMarcado(tipo.codigo, mod)) cb.setAttribute('checked', '');
        cb.addEventListener('change', () => toggle(tipo.codigo, mod, cb.checked));
        tr.appendChild(el('td', { style: 'text-align: center' }, cb));
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    container.appendChild(wrap);
  }

  avaliarStatus();
}
