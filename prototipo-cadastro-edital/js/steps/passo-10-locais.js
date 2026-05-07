// Passo 11: Locais de prova — multi-select + capacidade override + sessões.

import { Collection, Keys } from '../storage.js';
import { el, field, input, dateInput, checkbox } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const locaisEdital = state.edital.locais || [];
  const locaisCatalogo = new Collection(Keys.LOCAIS_PROVA).list({ includeInactive: false });

  function findEntry(codigo) {
    return locaisEdital.find((l) => l.localProvaCodigo === codigo);
  }

  function toggle(local, marcado) {
    if (marcado) {
      const novo = [
        ...locaisEdital.filter((l) => l.localProvaCodigo !== local.codigo),
        {
          localProvaCodigo: local.codigo,
          capacidade: local.capacidade,
          sessoes: [],
        },
      ];
      updateState({ locais: novo });
    } else {
      updateState({ locais: locaisEdital.filter((l) => l.localProvaCodigo !== local.codigo) });
    }
    avaliarStatus();
    render(container, ctx);
  }

  function atualizar(codigo, patch) {
    const novo = locaisEdital.map((l) =>
      l.localProvaCodigo === codigo ? { ...l, ...patch } : l
    );
    updateState({ locais: novo });
  }

  function avaliarStatus() {
    const l = state.edital.locais;
    setStepStatus(l.length > 0 ? 'completed' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Polos onde o edital aplica prova. Marque os locais usados e ajuste capacidade/sessões por local.'));

  if (locaisCatalogo.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Cadastre locais de prova primeiro.'));
    return;
  }

  for (const local of locaisCatalogo) {
    const entry = findEntry(local.codigo);
    const isSelected = !!entry;

    const card = el(
      'div',
      {
        style: `background: var(--bg-surface); border: 1px solid ${isSelected ? 'var(--primary)' : 'var(--border-default)'}; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; ${isSelected ? 'box-shadow: 0 0 0 2px var(--primary-pastel-02)' : ''}`,
      }
    );

    const header = el('div', { class: 'flex-between' });
    header.appendChild(checkbox(`${local.nome} — ${local.municipio}/${local.uf}`, isSelected, (v) => toggle(local, v)));
    header.appendChild(el('span', { class: 'tag' }, `Capacidade base: ${local.capacidade}`));
    card.appendChild(header);

    if (isSelected) {
      const grid = el('div', { class: 'form-grid mt-2' });
      grid.appendChild(field('Capacidade neste edital', input(entry.capacidade, (v) => atualizar(local.codigo, { capacidade: Number(v) || 0 }), { type: 'number' })));
      card.appendChild(grid);

      // Sessões
      const sessoes = entry.sessoes || [];
      card.appendChild(el('h4', { style: 'font-size: 0.875rem; margin: 1rem 0 0.5rem' }, 'Sessões de aplicação'));

      if (sessoes.length === 0) {
        card.appendChild(el('p', { class: 'text-muted text-small' }, 'Nenhuma sessão. Adicione abaixo.'));
      } else {
        const sessTable = el('table', { class: 'data-table' });
        sessTable.appendChild(
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              el('th', {}, 'Início'),
              el('th', {}, 'Fim'),
              el('th', {}, 'Fechamento (min)'),
              el('th', { class: 'actions' }, '')
            )
          )
        );
        const sessTbody = el('tbody');
        for (let i = 0; i < sessoes.length; i++) {
          const s = sessoes[i];
          sessTbody.appendChild(
            el(
              'tr',
              {},
              el('td', {}, dateInput(s.dataInicio, (v) => atualizarSessao(local.codigo, i, 'dataInicio', v))),
              el('td', {}, dateInput(s.dataFim, (v) => atualizarSessao(local.codigo, i, 'dataFim', v))),
              el(
                'td',
                {},
                input(s.fechamentoPortoesAntesMin, (v) => atualizarSessao(local.codigo, i, 'fechamentoPortoesAntesMin', Number(v) || 0), {
                  type: 'number',
                  placeholder: '30',
                })
              ),
              el(
                'td',
                { class: 'actions' },
                el(
                  'button',
                  {
                    type: 'button',
                    class: 'btn btn-ghost btn-small',
                    on: {
                      click: () => {
                        const novas = sessoes.filter((_, k) => k !== i);
                        atualizar(local.codigo, { sessoes: novas });
                        render(container, ctx);
                      },
                    },
                  },
                  '🗑'
                )
              )
            )
          );
        }
        sessTable.appendChild(sessTbody);
        card.appendChild(el('div', { class: 'table-wrapper' }, sessTable));
      }

      card.appendChild(
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-secondary btn-small mt-2',
            on: {
              click: () => {
                const novas = [
                  ...sessoes,
                  { dataInicio: null, dataFim: null, fechamentoPortoesAntesMin: 30 },
                ];
                atualizar(local.codigo, { sessoes: novas });
                render(container, ctx);
              },
            },
          },
          '+ Adicionar sessão'
        )
      );
    }

    container.appendChild(card);
  }

  function atualizarSessao(localCod, idx, campo, valor) {
    const entry = findEntry(localCod);
    const novas = [...(entry.sessoes || [])];
    novas[idx] = { ...novas[idx], [campo]: valor };
    atualizar(localCod, { sessoes: novas });
  }

  avaliarStatus();
}
