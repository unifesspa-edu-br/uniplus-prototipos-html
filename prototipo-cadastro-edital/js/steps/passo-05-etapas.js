// Passo 5: Etapas — lista ordenada de etapas (TipoEtapa + peso + ordem + datas + nota mínima).

import { Collection, Keys } from '../storage.js';
import { el, field, input, checkbox, select, dateInput } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const etapas = state.edital.etapas;
  const tiposEtapa = new Collection(Keys.TIPOS_ETAPA).list({ includeInactive: false });
  const tipoOpts = tiposEtapa.map((t) => ({ value: t.codigo, label: `${t.codigo} — ${t.nome}` }));

  function updateEtapas(novas) {
    updateState({ etapas: novas });
    avaliarStatus();
  }

  function avaliarStatus() {
    const e = state.edital.etapas;
    const completo = e.length > 0 && e.every((x) => x.tipoEtapaCodigo && x.peso > 0);
    setStepStatus(completo ? 'completed' : e.length > 0 ? 'in-progress' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Etapas do processo seletivo, em ordem. Pesos são usados na fórmula do passo 6. Datas e nota mínima são opcionais.'));

  if (etapas.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '📝'),
        el('p', {}, 'Nenhuma etapa adicionada.')
      )
    );
  } else {
    for (let idx = 0; idx < etapas.length; idx++) {
      container.appendChild(renderEtapa(etapas[idx], idx, etapas, updateEtapas, tipoOpts, tiposEtapa));
    }
  }

  container.appendChild(
    el(
      'div',
      { class: 'mt-4 flex gap-2' },
      el(
        'button',
        {
          type: 'button',
          class: 'btn btn-secondary',
          on: {
            click: () => {
              const nova = {
                tipoEtapaCodigo: null,
                nomeCustomizado: '',
                peso: 1,
                ordem: etapas.length + 1,
                pertenceCalculo: true,
                eliminatoria: false,
                notaMinima: null,
                dataAplicacao: null,
                janelaRecursoInicio: null,
                janelaRecursoFim: null,
              };
              updateEtapas([...etapas, nova]);
              render(container, ctx);
            },
          },
        },
        '+ Adicionar etapa'
      )
    )
  );

  avaliarStatus();
}

function renderEtapa(etapa, idx, todas, updateEtapas, tipoOpts, tiposEtapa) {
  const tipo = tiposEtapa.find((t) => t.codigo === etapa.tipoEtapaCodigo);

  function update(campo, valor) {
    const novas = [...todas];
    novas[idx] = { ...novas[idx], [campo]: valor };
    updateEtapas(novas);
  }

  function remover() {
    if (!confirm('Remover esta etapa?')) return;
    const novas = todas.filter((_, i) => i !== idx);
    updateEtapas(novas);
    document.getElementById('step-body').dispatchEvent(new Event('rerender'));
    // Re-render manual via parent
    const container = document.getElementById('step-body');
    if (container) {
      const ctx = { state: { edital: { etapas: novas } }, updateState: () => {}, setStepStatus: () => {} };
      // Hack — chamar render externo seria melhor. Por simplicidade, força reload da página.
      window.location.reload();
    }
  }

  function moverCima() {
    if (idx === 0) return;
    const novas = [...todas];
    [novas[idx - 1], novas[idx]] = [novas[idx], novas[idx - 1]];
    novas.forEach((e, i) => (e.ordem = i + 1));
    updateEtapas(novas);
    window.location.reload();
  }

  function moverBaixo() {
    if (idx === todas.length - 1) return;
    const novas = [...todas];
    [novas[idx], novas[idx + 1]] = [novas[idx + 1], novas[idx]];
    novas.forEach((e, i) => (e.ordem = i + 1));
    updateEtapas(novas);
    window.location.reload();
  }

  return el(
    'div',
    {
      style: 'background: white; border: 1px solid var(--color-secondary-04, #ccc); border-radius: 8px; padding: 1rem; margin-bottom: 1rem',
    },
    el(
      'div',
      { class: 'flex-between mb-2' },
      el(
        'div',
        { class: 'flex gap-2', style: 'align-items: center' },
        el('span', { class: 'tag tag-info' }, `Etapa ${etapa.ordem}`),
        tipo ? el('strong', {}, tipo.nome) : el('span', { class: 'text-muted' }, 'Tipo não definido')
      ),
      el(
        'div',
        { class: 'flex gap-2' },
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', on: { click: moverCima }, disabled: idx === 0 }, '↑'),
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', on: { click: moverBaixo }, disabled: idx === todas.length - 1 }, '↓'),
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', on: { click: remover } }, '🗑 Remover')
      )
    ),
    el(
      'div',
      { class: 'form-grid' },
      field('Tipo de etapa *', select(etapa.tipoEtapaCodigo, tipoOpts, (v) => update('tipoEtapaCodigo', v), { placeholder: '— escolher —' })),
      field('Nome customizado (opcional)', input(etapa.nomeCustomizado, (v) => update('nomeCustomizado', v), { placeholder: tipo?.nome || '' })),
      field('Peso *', input(etapa.peso, (v) => update('peso', Number(v) || 0), { type: 'number', step: '0.1' })),
      field('Nota mínima (opcional)', input(etapa.notaMinima, (v) => update('notaMinima', v === '' ? null : Number(v)), { type: 'number', step: '0.01' })),
      field('Data de aplicação', dateInput(etapa.dataAplicacao, (v) => update('dataAplicacao', v))),
      field('Recurso — início', dateInput(etapa.janelaRecursoInicio, (v) => update('janelaRecursoInicio', v))),
      field('Recurso — fim', dateInput(etapa.janelaRecursoFim, (v) => update('janelaRecursoFim', v)))
    ),
    el(
      'div',
      { class: 'flex gap-4 mt-2', style: 'flex-wrap: wrap' },
      checkbox('Pertence ao cálculo final?', etapa.pertenceCalculo, (v) => update('pertenceCalculo', v)),
      checkbox('Eliminatória?', etapa.eliminatoria, (v) => update('eliminatoria', v))
    )
  );
}
