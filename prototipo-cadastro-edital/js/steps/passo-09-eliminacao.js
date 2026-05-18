// Passo 9: Eliminação — nota mínima por etapa + cláusulas gerais.

import { el, field, input, checkbox } from '../dom.js';

const CLAUSULAS = [
  { codigo: 'FALTA_PROVA', label: 'Falta à prova ou entrevista' },
  { codigo: 'ATRASO', label: 'Atraso na chegada ao local da prova' },
  { codigo: 'SEM_DOCUMENTACAO', label: 'Falta de documentação obrigatória no dia da prova' },
  { codigo: 'FRAUDE', label: 'Fraude ou conduta fraudulenta' },
  { codigo: 'CONDUTA_INADEQUADA', label: 'Conduta inadequada que prejudique a aplicação' },
  { codigo: 'COMUNICACAO_EXTERNA', label: 'Comunicação com terceiros durante a prova' },
  { codigo: 'USO_ELETRONICOS', label: 'Uso de eletrônicos não autorizados' },
  { codigo: 'SEM_DECLARACAO_PERTENCIMENTO', label: 'Falta de declaração de pertencimento (PSIQ, PSE Ed. Campo)' },
  { codigo: 'NOTA_REDACAO_ZERO', label: 'Nota zero na Redação' },
  { codigo: 'NOTA_REDACAO_BRANCA', label: 'Redação em branco ou anulada' },
  { codigo: 'PLAGIO', label: 'Plágio na Redação ou Carta de Intenção' },
];

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const eliminacao = state.edital.eliminacao || { notasMinimas: {}, clausulas: [] };
  const etapas = state.edital.etapas || [];

  function update(patch) {
    updateState({ eliminacao: { ...eliminacao, ...patch } });
    avaliarStatus();
  }

  function avaliarStatus() {
    const e = state.edital.eliminacao;
    setStepStatus(e.clausulas?.length > 0 ? 'concluido' : 'emProgresso');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Critérios que eliminam o candidato do processo. Notas mínimas por etapa são opcionais; cláusulas gerais protegem a integridade do processo.'));

  // Notas mínimas por etapa (espelham o que está no passo 5, mas centralizado aqui)
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem' }, 'Notas mínimas por etapa'));
  if (etapas.length === 0) {
    container.appendChild(el('p', { class: 'text-muted text-small' }, 'Configure etapas no passo 5 primeiro.'));
  } else {
    const wrap = el('div', { class: 'table-wrapper mb-4' });
    const table = el('table', { class: 'data-table' });
    table.appendChild(
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', {}, 'Etapa'),
          el('th', {}, 'Nota mínima'),
          el('th', {}, 'Eliminatória?')
        )
      )
    );
    const tbody = el('tbody');
    for (const etapa of etapas) {
      const codigo = etapa.tipoEtapaCodigo;
      tbody.appendChild(
        el(
          'tr',
          {},
          el('td', {}, etapa.nomeCustomizado || codigo || '?'),
          el(
            'td',
            {},
            input(
              eliminacao.notasMinimas?.[codigo] ?? etapa.notaMinima,
              (v) => {
                const novas = { ...(eliminacao.notasMinimas || {}), [codigo]: v === '' ? null : Number(v) };
                update({ notasMinimas: novas });
              },
              { type: 'number', step: '0.01', placeholder: 'Sem mínima' }
            )
          ),
          el('td', {}, etapa.eliminatoria ? el('span', { class: 'tag tag-warning' }, 'Sim') : el('span', { class: 'tag' }, 'Não'))
        )
      );
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  // Cláusulas gerais
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem; margin-top: 1.5rem' }, 'Cláusulas gerais de eliminação'));
  const clausulas = eliminacao.clausulas || [];
  const grid = el('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.5rem' });
  for (const c of CLAUSULAS) {
    const checked = clausulas.includes(c.codigo);
    grid.appendChild(
      checkbox(c.label, checked, (val) => {
        const novas = val
          ? [...new Set([...clausulas, c.codigo])]
          : clausulas.filter((x) => x !== c.codigo);
        update({ clausulas: novas });
      })
    );
  }
  container.appendChild(grid);

  avaliarStatus();
}
