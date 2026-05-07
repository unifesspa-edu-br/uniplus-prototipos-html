// Passo 1: Tipo do edital — escolha do TipoEdital, aplica defaults aos próximos passos.

import { Collection, Keys } from '../storage.js';
import { Toast } from '../toast.js';
import { el, badge } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const tipos = new Collection(Keys.TIPOS_EDITAL).list({ includeInactive: false });

  container.innerHTML = '';
  container.appendChild(
    el('p', { class: 'text-muted mb-4' }, 'Escolha o tipo de edital. Os defaults do tipo serão aplicados aos próximos passos como sugestão (todos editáveis depois).')
  );

  if (tipos.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '📭'),
        el('p', {}, 'Nenhum tipo de edital cadastrado.'),
        el('a', { class: 'btn btn-primary mt-4', href: 'catalogo.html?slug=tipos-edital' }, 'Cadastrar tipos de edital')
      )
    );
    return;
  }

  const grid = el('div', { class: 'card-grid' });

  for (const tipo of tipos) {
    const isSelected = state.edital.tipo?.tipoEditalId === tipo.id;

    const card = el(
      'button',
      {
        type: 'button',
        class: `br-card card-link ${isSelected ? 'is-selected' : ''}`,
        style: isSelected ? 'border: 2px solid var(--primary); background: var(--primary-pastel-02);' : '',
        on: {
          click: () => selectTipo(tipo, state, updateState, setStepStatus, ctx),
        },
      },
      el(
        'div',
        { class: 'card-content' },
        el(
          'h3',
          { class: 'card-title' },
          tipo.nome,
          isSelected ? el('span', { style: 'margin-left: 0.5rem' }, '✓') : null
        ),
        el('p', { class: 'card-text' }, tipo.descricao || ''),
        el(
          'div',
          { class: 'flex gap-2', style: 'flex-wrap: wrap; margin-top: 0.5rem' },
          tipo.permite_duas_opcoes_curso ? badge('2 opções', 'info') : null,
          tipo.exige_prova_presencial ? badge('Presencial', 'info') : null,
          tipo.vagas_suplementares ? badge('Suplementares', 'warning') : null
        ),
        tipo.base_legal_referencia
          ? el('p', { class: 'text-small text-muted mt-2', style: 'font-style: italic' }, tipo.base_legal_referencia)
          : null
      )
    );
    grid.appendChild(card);
  }

  container.appendChild(grid);

  if (state.edital.tipo) {
    container.appendChild(
      el(
        'div',
        { class: 'mt-4', style: 'background: var(--primary-pastel-02); padding: 1rem; border-radius: 4px;' },
        el(
          'p',
          { style: 'margin: 0' },
          el('strong', {}, 'Tipo selecionado: '),
          state.edital.tipo.nome,
          ' (',
          el('code', {}, state.edital.tipo.codigo),
          ')'
        ),
        el('p', { class: 'text-small text-muted mt-2' }, 'Os passos seguintes virão pré-preenchidos com os defaults deste tipo.')
      )
    );
  }
}

function selectTipo(tipo, state, updateState, setStepStatus, ctx) {
  // Se já há um tipo diferente selecionado, avisar
  if (state.edital.tipo && state.edital.tipo.tipoEditalId !== tipo.id) {
    if (!confirm('Trocar o tipo de edital invalida os defaults aplicados nos próximos passos. Continuar?')) {
      return;
    }
  }

  // Aplica defaults
  const defaults = tipo.defaults || {};
  const patch = {
    tipo: {
      tipoEditalId: tipo.id,
      codigo: tipo.codigo,
      nome: tipo.nome,
    },
  };

  // Pré-preencher campos derivados (apenas se ainda vazios — não sobrescreve trabalho do admin)
  if (defaults.modalidades_sugeridas && (!state.edital.vagasModalidades.modalidades || state.edital.vagasModalidades.modalidades.length === 0)) {
    patch.vagasModalidades = {
      ...state.edital.vagasModalidades,
      modalidades: defaults.modalidades_sugeridas,
      concorrenciaDupla: defaults.concorrencia_dupla || false,
    };
  }

  if (defaults.bonus && !state.edital.bonus) {
    patch.bonus = { ...defaults.bonus, habilitado: true };
  }

  if (defaults.desempate_sugerido && (!state.edital.desempate || state.edital.desempate.length === 0)) {
    patch.desempate = defaults.desempate_sugerido.map((codigo) => ({ codigo, ordem: 0 }));
  }

  // Etapas sugeridas — só pré-preenche se admin ainda não adicionou nenhuma etapa
  if (defaults.etapas_sugeridas && (!state.edital.etapas || state.edital.etapas.length === 0)) {
    patch.etapas = defaults.etapas_sugeridas.map((codigo, idx) => ({
      tipoEtapaCodigo: codigo,
      nomeCustomizado: '',
      ordem: idx + 1,
      janelaInicio: null,
      janelaFim: null,
      recurso: null,
      peso: 1,
      pertenceCalculo: true,
      eliminatoria: false,
      notaMinima: null,
    }));
  }

  if (defaults.formula_sugerida && !state.edital.formula?.agregacao) {
    patch.formula = {
      ...state.edital.formula,
      agregacao: defaults.formula_sugerida,
    };
  }

  updateState(patch);
  setStepStatus('completed');
  Toast.success(`Tipo "${tipo.nome}" selecionado. Defaults aplicados.`);

  // Re-render
  render(document.getElementById('step-body'), ctx);
}
