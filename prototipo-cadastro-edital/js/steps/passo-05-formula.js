// Passo 6: Fórmula e precisão — agregação + precisão + preview do fator de divisão.

import { el, field, input, select } from '../dom.js';

const AGREGACOES = [
  { value: 'MEDIA_PONDERADA', label: 'Média Ponderada — Σ(nota×peso) / Σ pesos' },
  { value: 'SOMA_PONDERADA_COM_FATOR', label: 'Soma Ponderada com Fator — Σ(nota×peso) / fator' },
  { value: 'MEDIA_SIMPLES', label: 'Média Simples — Σ nota / N etapas' },
  { value: 'MEDIA_PONDERADA_ENEM', label: 'Média Ponderada ENEM — pesos por área + grupo de curso' },
];

const PRECISOES = [
  { value: 'TRUNCAR_2_CASAS', label: 'Truncar 2 casas decimais (PSIQ)' },
  { value: 'ARREDONDAR_PARA_CIMA_2_CASAS_SE_3A_GTE_5', label: 'Arredondar para cima 2 casas se 3ª casa ≥ 5 (PSE, PS Convênios)' },
];

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const formula = state.edital.formula;
  const etapas = state.edital.etapas || [];

  function update(campo, valor) {
    updateState({ formula: { ...formula, [campo]: valor } });
    avaliarStatus();
  }

  function avaliarStatus() {
    const f = state.edital.formula;
    const completo = f.agregacao && f.precisao;
    setStepStatus(completo ? 'completed' : f.agregacao || f.precisao ? 'in-progress' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Fórmula de agregação aplicada à nota final + regra de precisão decimal.'));

  container.appendChild(
    field(
      'Agregação',
      select(formula.agregacao, AGREGACOES, (v) => update('agregacao', v), { placeholder: '— escolher —' })
    )
  );

  if (formula.agregacao === 'SOMA_PONDERADA_COM_FATOR') {
    const fatorSugerido = etapas.filter((e) => e.pertenceCalculo).reduce((s, e) => s + (e.peso || 0), 0);
    container.appendChild(
      field(
        'Fator de divisão',
        input(formula.fator || fatorSugerido, (v) => update('fator', Number(v) || 0), { type: 'number', step: '0.1' }),
        `Soma dos pesos das etapas que pertencem ao cálculo: ${fatorSugerido}. Pode editar se a fórmula do edital usar outro fator.`
      )
    );
  }

  container.appendChild(
    field(
      'Precisão',
      select(formula.precisao, PRECISOES, (v) => update('precisao', v), { placeholder: '— escolher —' })
    )
  );

  // Preview da fórmula
  if (etapas.length > 0) {
    const preview = etapas
      .filter((e) => e.pertenceCalculo)
      .map((e) => `(N${e.ordem || '?'}×${e.peso || '?'})`)
      .join(' + ');
    const denom = formula.agregacao === 'SOMA_PONDERADA_COM_FATOR'
      ? formula.fator || '?'
      : formula.agregacao === 'MEDIA_SIMPLES'
        ? etapas.filter((e) => e.pertenceCalculo).length
        : etapas.filter((e) => e.pertenceCalculo).reduce((s, e) => s + (e.peso || 0), 0);

    container.appendChild(
      el(
        'div',
        { class: 'mt-4', style: 'background: var(--bg-code); color: #dcdcdc; padding: 1rem; border-radius: 8px; font-family: monospace' },
        el('div', { class: 'text-small', style: 'opacity: 0.7; margin-bottom: 0.5rem' }, 'Preview da fórmula'),
        el('div', { style: 'font-size: 0.95rem' }, `NOTA_FINAL = (${preview || '...'}) / ${denom}`)
      )
    );
  }

  avaliarStatus();
}
