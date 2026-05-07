// Passo 7: Bônus (opcional) — aditivo ou multiplicativo, valor, modalidades aplicáveis.

import { el, field, input, checkbox, select } from '../dom.js';

const TIPOS_BONUS = [
  { value: 'ADITIVO', label: 'Aditivo — nota + (valor × nota)' },
  { value: 'MULTIPLICATIVO', label: 'Multiplicativo — nota × (1 + valor)' },
];

const ELEGIBILIDADES = [
  { value: 'RESIDENCIA_MUNICIPIO_CONVENIO', label: 'Residência no município do convênio' },
  { value: 'MATRICULA_ESCOLAR_MUNICIPIO', label: 'Matrícula escolar no município do convênio' },
  { value: 'OUTRO', label: 'Outro critério (descrever)' },
];

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const bonus = state.edital.bonus || { habilitado: false };
  const modalidadesEdital = state.edital.vagasModalidades?.modalidades || [];

  function update(campo, valor) {
    const novo = { ...bonus, [campo]: valor };
    updateState({ bonus: novo });
    avaliarStatus();
  }

  function avaliarStatus() {
    const b = state.edital.bonus;
    if (!b || !b.habilitado) {
      setStepStatus('completed'); // bônus é opcional — sem bônus = passo OK
      return;
    }
    const completo = b.tipo && b.valor != null && b.modalidades_aplicaveis?.length > 0;
    setStepStatus(completo ? 'completed' : 'in-progress');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Bônus regional (opcional). Comum em PS Convênios. Quando habilitado, aplicado conforme tipo escolhido sobre as modalidades selecionadas.'));

  container.appendChild(checkbox('Aplicar bônus neste edital?', bonus.habilitado, (v) => {
    update('habilitado', v);
    render(container, ctx);
  }));

  if (!bonus.habilitado) {
    container.appendChild(
      el(
        'div',
        { class: 'mt-4', style: 'background: var(--bg-base); padding: 1rem; border-radius: 4px' },
        el('p', { style: 'margin: 0', class: 'text-muted' }, 'Bônus desabilitado — passo será marcado como concluído sem ação adicional.')
      )
    );
    avaliarStatus();
    return;
  }

  const grid = el('div', { class: 'form-grid mt-4' });
  grid.appendChild(field('Tipo de bônus', select(bonus.tipo, TIPOS_BONUS, (v) => update('tipo', v), { placeholder: '— escolher —' })));
  grid.appendChild(field('Valor (decimal)', input(bonus.valor, (v) => update('valor', v === '' ? null : Number(v)), { type: 'number', step: '0.01', placeholder: '0.20' }), 'Ex.: 0.20 = 20%'));
  grid.appendChild(field('Critério de elegibilidade', select(bonus.criterio_elegibilidade, ELEGIBILIDADES, (v) => update('criterio_elegibilidade', v), { placeholder: '— escolher —' })));
  container.appendChild(grid);

  // Modalidades aplicáveis (multi-checkbox)
  container.appendChild(el('h3', { style: 'font-size: 0.9rem; margin: 1.5rem 0 0.5rem; font-weight: 600' }, 'Modalidades aplicáveis'));
  if (modalidadesEdital.length === 0) {
    container.appendChild(el('p', { class: 'text-muted text-small' }, 'Configure as modalidades no passo 4 primeiro.'));
  } else {
    const modGrid = el('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem' });
    const aplicaveis = bonus.modalidades_aplicaveis || [];
    for (const cod of modalidadesEdital) {
      const checked = aplicaveis.includes(cod);
      modGrid.appendChild(
        checkbox(cod, checked, (val) => {
          const novas = val
            ? [...new Set([...aplicaveis, cod])]
            : aplicaveis.filter((c) => c !== cod);
          update('modalidades_aplicaveis', novas);
        })
      );
    }
    container.appendChild(modGrid);
  }

  avaliarStatus();
}
