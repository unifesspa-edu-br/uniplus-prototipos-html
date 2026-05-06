// Passo 3: Cronograma — janelas de datas (inscrição, prova, recursos, etc.)

import { el, field, dateInput } from '../dom.js';

const JANELAS = [
  { codigo: 'inscricao', titulo: 'Período de inscrição', sempre: true },
  { codigo: 'cartao', titulo: 'Cartão de inscrição (disponível em)', sempre: false },
  { codigo: 'prova', titulo: 'Período de prova', sempre: false },
  { codigo: 'homologacao', titulo: 'Homologação de inscrições', sempre: true },
  { codigo: 'recursoHomologacao', titulo: 'Recurso de homologação', sempre: true },
  { codigo: 'classificacao', titulo: 'Classificação / divulgação de resultado', sempre: true },
  { codigo: 'recursoClassificacao', titulo: 'Recurso de classificação', sempre: true },
  { codigo: 'habilitacao', titulo: 'Habilitação institucional', sempre: false },
  { codigo: 'recursoHabilitacao', titulo: 'Recurso de habilitação', sempre: false },
  { codigo: 'confirmacaoInteresse', titulo: 'Confirmação de interesse', sempre: false },
];

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const cron = state.edital.cronograma;

  function update(janela, campo, valor) {
    const j = cron[janela] || {};
    const novoCron = { ...cron, [janela]: { ...j, [campo]: valor } };
    updateState({ cronograma: novoCron });
    avaliarStatus();
  }

  function avaliarStatus() {
    const c = state.edital.cronograma;
    const obrigatorias = JANELAS.filter((j) => j.sempre);
    const completas = obrigatorias.filter((j) => c[j.codigo]?.inicio && c[j.codigo]?.fim).length;
    if (completas === 0) setStepStatus('pending');
    else if (completas === obrigatorias.length) setStepStatus('completed');
    else setStepStatus('in-progress');
  }

  container.innerHTML = '';
  container.appendChild(
    el('p', { class: 'text-muted mb-4' }, 'Janelas de tempo do processo. Datas em laranja são obrigatórias para qualquer edital.')
  );

  const wrapper = el('div', { class: 'table-wrapper' });
  const table = el('table', { class: 'data-table' });
  table.appendChild(
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', {}, 'Janela'),
        el('th', { style: 'width: 200px' }, 'Início'),
        el('th', { style: 'width: 200px' }, 'Fim')
      )
    )
  );
  const tbody = el('tbody');
  for (const j of JANELAS) {
    const valor = cron[j.codigo] || {};
    const tr = el(
      'tr',
      {},
      el(
        'td',
        {},
        el('strong', {}, j.titulo),
        j.sempre ? el('span', { style: 'color: #d56000; margin-left: 0.5rem' }, '*') : null
      ),
      el('td', {}, dateInput(valor.inicio, (v) => update(j.codigo, 'inicio', v))),
      el('td', {}, dateInput(valor.fim, (v) => update(j.codigo, 'fim', v)))
    );
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);

  avaliarStatus();
}
