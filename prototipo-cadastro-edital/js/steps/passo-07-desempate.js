// Passo 8: Desempate — ordem configurável dos critérios.

import { Collection, Keys } from '../storage.js';
import { el, field, select } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const desempate = state.edital.desempate || [];
  const criteriosCatalogo = new Collection(Keys.CRITERIOS_DESEMPATE).list({ includeInactive: false });
  const etapas = state.edital.etapas || [];

  function updateDesempate(novo) {
    updateState({ desempate: novo });
    avaliarStatus();
  }

  function avaliarStatus() {
    const d = state.edital.desempate;
    setStepStatus(d.length > 0 ? 'completed' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Ordem dos critérios de desempate. O primeiro da lista é avaliado primeiro. Use ↑↓ para reordenar.'));

  if (desempate.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' }, el('div', { class: 'empty-state-icon' }, '⚖️'), el('p', {}, 'Nenhum critério adicionado.')));
  } else {
    const list = el('ol', { style: 'list-style: none; padding: 0; counter-reset: desempate' });
    for (let i = 0; i < desempate.length; i++) {
      const item = desempate[i];
      const def = criteriosCatalogo.find((c) => c.codigo === item.codigo);

      const li = el(
        'li',
        {
          style: 'background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; counter-increment: desempate',
        },
        el(
          'div',
          { class: 'flex-between' },
          el(
            'div',
            { class: 'flex gap-2', style: 'align-items: center' },
            el('span', { class: 'tag tag-info' }, `${i + 1}º`),
            el(
              'div',
              {},
              el('strong', {}, def ? def.nome : item.codigo),
              def ? el('div', { class: 'text-small text-muted' }, def.base_legal || '') : null
            )
          ),
          el(
            'div',
            { class: 'flex gap-2' },
            el('button', { type: 'button', class: 'btn btn-ghost btn-small', on: { click: () => mover(i, -1) }, disabled: i === 0 }, '↑'),
            el('button', { type: 'button', class: 'btn btn-ghost btn-small', on: { click: () => mover(i, 1) }, disabled: i === desempate.length - 1 }, '↓'),
            el('button', { type: 'button', class: 'btn btn-ghost btn-small', on: { click: () => remover(i) } }, '🗑')
          )
        ),
        def?.requer_etapa_referencia
          ? el(
              'div',
              { class: 'mt-2' },
              field(
                'Etapa de referência',
                select(
                  item.etapaRef,
                  etapas.map((e, idx) => ({ value: e.tipoEtapaCodigo, label: `Etapa ${e.ordem || idx + 1} — ${e.tipoEtapaCodigo || '?'}` })),
                  (v) => atualizarItem(i, 'etapaRef', v),
                  { placeholder: '— escolher etapa —' }
                )
              )
            )
          : null
      );
      list.appendChild(li);
    }
    container.appendChild(list);
  }

  function mover(idx, delta) {
    const j = idx + delta;
    if (j < 0 || j >= desempate.length) return;
    const novo = [...desempate];
    [novo[idx], novo[j]] = [novo[j], novo[idx]];
    updateDesempate(novo);
    render(container, ctx);
  }

  function remover(idx) {
    if (!confirm('Remover este critério?')) return;
    const novo = desempate.filter((_, i) => i !== idx);
    updateDesempate(novo);
    render(container, ctx);
  }

  function atualizarItem(idx, campo, valor) {
    const novo = [...desempate];
    novo[idx] = { ...novo[idx], [campo]: valor };
    updateDesempate(novo);
  }

  // Adicionar critério
  const disponiveis = criteriosCatalogo.filter((c) => !desempate.find((d) => d.codigo === c.codigo));
  if (disponiveis.length > 0) {
    container.appendChild(
      field(
        'Adicionar critério',
        select(
          null,
          disponiveis.map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.nome}` })),
          (codigo) => {
            if (!codigo) return;
            const novo = [...desempate, { codigo, ordem: desempate.length + 1 }];
            updateDesempate(novo);
            render(container, ctx);
          },
          { placeholder: '— escolher critério —' }
        )
      )
    );
  }

  avaliarStatus();
}
