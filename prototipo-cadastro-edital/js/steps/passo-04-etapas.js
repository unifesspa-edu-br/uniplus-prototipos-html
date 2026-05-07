// Passo 5: Etapas — lista ordenada de etapas com janela e recurso opcional.
// Toda janela do edital é uma etapa: administrativa (inscrição, homologação, divulgação),
// avaliativa (prova, redação, banca) ou de importação automática (notas ENEM).
// Campos exibidos variam por categoria do TipoEtapa.

import { Collection, Keys } from '../storage.js';
import { el, field, input, checkbox, select, dateInput, badge } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const etapas = state.edital.etapas;
  const tiposEtapa = new Collection(Keys.TIPOS_ETAPA).list({ includeInactive: false });
  const tipoOpts = tiposEtapa.map((t) => ({
    value: t.codigo,
    label: `${t.codigo} — ${t.nome}`,
  }));

  function updateEtapas(novas) {
    updateState({ etapas: novas });
    avaliarStatus();
  }

  function avaliarStatus() {
    const e = state.edital.etapas;
    const completo =
      e.length > 0 &&
      e.every((x) => {
        if (!x.tipoEtapaCodigo) return false;
        const tipo = tiposEtapa.find((t) => t.codigo === x.tipoEtapaCodigo);
        if (!tipo) return false;
        // Avaliativas precisam de peso > 0
        if (tipo.categoria === 'AVALIATIVA' && !(x.peso > 0)) return false;
        return true;
      });
    setStepStatus(completo ? 'completed' : e.length > 0 ? 'in-progress' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(
    el(
      'p',
      { class: 'text-muted mb-4' },
      'Toda janela do edital é uma etapa, em ordem cronológica: inscrição, homologação, etapas avaliativas (prova, redação, banca…) e divulgações. Cada etapa tem janela início/fim e recurso opcional.'
    )
  );

  if (etapas.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '📝'),
        el('p', {}, 'Nenhuma etapa adicionada.'),
        el(
          'p',
          { class: 'text-small text-muted' },
          'Comece pela inscrição (sempre primeira) e siga a ordem cronológica.'
        )
      )
    );
  } else {
    for (let idx = 0; idx < etapas.length; idx++) {
      container.appendChild(
        renderEtapa(etapas[idx], idx, etapas, updateEtapas, tipoOpts, tiposEtapa)
      );
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
                ordem: etapas.length + 1,
                janelaInicio: null,
                janelaFim: null,
                recurso: null,
                // Campos avaliativos (preenchidos quando categoria = AVALIATIVA)
                peso: 1,
                pertenceCalculo: true,
                eliminatoria: false,
                notaMinima: null,
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
  const categoria = tipo?.categoria || null;

  function update(campo, valor) {
    const novas = [...todas];
    novas[idx] = { ...novas[idx], [campo]: valor };
    updateEtapas(novas);
  }

  function updateRecurso(campo, valor) {
    const novas = [...todas];
    const recursoAtual = novas[idx].recurso || { inicio: null, fim: null };
    novas[idx] = { ...novas[idx], recurso: { ...recursoAtual, [campo]: valor } };
    updateEtapas(novas);
  }

  function toggleRecurso(habilitado) {
    const novas = [...todas];
    novas[idx] = {
      ...novas[idx],
      recurso: habilitado ? { inicio: null, fim: null } : null,
    };
    updateEtapas(novas);
    window.location.reload();
  }

  function remover() {
    if (!confirm('Remover esta etapa?')) return;
    const novas = todas.filter((_, i) => i !== idx);
    novas.forEach((e, i) => (e.ordem = i + 1));
    updateEtapas(novas);
    window.location.reload();
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

  const isAvaliativa = categoria === 'AVALIATIVA';
  const isImportacao = categoria === 'IMPORTACAO_AUTOMATICA';
  const podeRecurso = tipo?.permite_recurso_default !== false;

  return el(
    'div',
    {
      style:
        'background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; padding: 1rem; margin-bottom: 1rem',
    },
    el(
      'div',
      { class: 'flex-between mb-2' },
      el(
        'div',
        { class: 'flex gap-2', style: 'align-items: center; flex-wrap: wrap' },
        el('span', { class: 'tag tag-info' }, `Etapa ${etapa.ordem}`),
        categoria ? badgeCategoria(categoria) : null,
        tipo
          ? el('strong', {}, tipo.nome)
          : el('span', { class: 'text-muted' }, 'Tipo não definido')
      ),
      el(
        'div',
        { class: 'flex gap-2' },
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-small',
            on: { click: moverCima },
            disabled: idx === 0,
          },
          '↑'
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-small',
            on: { click: moverBaixo },
            disabled: idx === todas.length - 1,
          },
          '↓'
        ),
        el(
          'button',
          { type: 'button', class: 'btn btn-ghost btn-small', on: { click: remover } },
          '🗑 Remover'
        )
      )
    ),
    el(
      'div',
      { class: 'form-grid' },
      field(
        'Tipo de etapa *',
        select(etapa.tipoEtapaCodigo, tipoOpts, (v) => update('tipoEtapaCodigo', v), {
          placeholder: '— escolher —',
        })
      ),
      field(
        'Nome customizado (opcional)',
        input(etapa.nomeCustomizado, (v) => update('nomeCustomizado', v), {
          placeholder: tipo?.nome || '',
        })
      ),
      field(
        'Início da janela *',
        dateInput(etapa.janelaInicio, (v) => update('janelaInicio', v))
      ),
      field(
        'Fim da janela *',
        dateInput(etapa.janelaFim, (v) => update('janelaFim', v)),
        'Pode ser igual ao início se a etapa ocorrer em 1 dia.'
      )
    ),
    // Campos só de etapa avaliativa
    isAvaliativa
      ? el(
          'div',
          {
            class: 'form-grid mt-2',
            style:
              'padding: 0.75rem; background: var(--info-bg); border-radius: 4px',
          },
          field(
            'Peso *',
            input(etapa.peso, (v) => update('peso', Number(v) || 0), {
              type: 'number',
              step: '0.1',
            })
          ),
          field(
            'Nota mínima (opcional)',
            input(
              etapa.notaMinima,
              (v) => update('notaMinima', v === '' ? null : Number(v)),
              { type: 'number', step: '0.01' }
            )
          )
        )
      : null,
    isAvaliativa
      ? el(
          'div',
          { class: 'flex gap-4 mt-2', style: 'flex-wrap: wrap' },
          checkbox('Pertence ao cálculo final?', etapa.pertenceCalculo, (v) =>
            update('pertenceCalculo', v)
          ),
          checkbox('Eliminatória?', etapa.eliminatoria, (v) => update('eliminatoria', v))
        )
      : null,
    isImportacao
      ? el(
          'div',
          {
            class: 'mt-2',
            style:
              'padding: 0.75rem; background: var(--bg-base); border-radius: 4px; font-size: 0.875rem',
          },
          el(
            'div',
            { class: 'text-muted' },
            'Importação automática — pertence ao cálculo, sem peso configurável.'
          )
        )
      : null,
    // Recurso opcional (qualquer categoria, controlado por permite_recurso do tipo)
    tipo
      ? el(
          'div',
          { class: 'mt-2' },
          checkbox(
            'Esta etapa permite recurso?',
            !!etapa.recurso,
            (v) => toggleRecurso(v),
            { hint: !podeRecurso ? 'Tipo desta etapa normalmente não admite recurso.' : null }
          ),
          etapa.recurso
            ? el(
                'div',
                {
                  class: 'form-grid mt-2',
                  style:
                    'padding: 0.75rem; background: var(--bg-base); border-radius: 4px',
                },
                field(
                  'Recurso — início',
                  dateInput(etapa.recurso.inicio, (v) => updateRecurso('inicio', v))
                ),
                field(
                  'Recurso — fim',
                  dateInput(etapa.recurso.fim, (v) => updateRecurso('fim', v))
                )
              )
            : null
        )
      : null
  );
}

function badgeCategoria(cat) {
  if (cat === 'ADMINISTRATIVA') return badge('Administrativa', 'info');
  if (cat === 'AVALIATIVA') return badge('Avaliativa', 'success');
  if (cat === 'IMPORTACAO_AUTOMATICA') return badge('Importação', 'warning');
  return null;
}
