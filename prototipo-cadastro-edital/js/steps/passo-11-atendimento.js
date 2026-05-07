// Passo 12: Atendimento especial — quais necessidades o edital aceita.

import { Collection, Keys } from '../storage.js';
import { el, checkbox } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const atendimento = state.edital.atendimento || [];
  const necessidadesCatalogo = new Collection(Keys.NECESSIDADES).list({ includeInactive: false });

  function isSelected(codigo) {
    return atendimento.some((a) => a.necessidadeEspecialCodigo === codigo);
  }

  function toggle(necessidade, marcado) {
    if (marcado) {
      const novo = [
        ...atendimento.filter((a) => a.necessidadeEspecialCodigo !== necessidade.codigo),
        {
          necessidadeEspecialCodigo: necessidade.codigo,
          recursos_disponibilizados: [...(necessidade.recursos_requeridos || [])],
        },
      ];
      updateState({ atendimento: novo });
    } else {
      updateState({
        atendimento: atendimento.filter((a) => a.necessidadeEspecialCodigo !== necessidade.codigo),
      });
    }
    avaliarStatus();
    render(container, ctx);
  }

  function toggleRecurso(codigo, recurso, marcado) {
    const novo = atendimento.map((a) => {
      if (a.necessidadeEspecialCodigo !== codigo) return a;
      const recursos = a.recursos_disponibilizados || [];
      const atualizado = marcado
        ? [...new Set([...recursos, recurso])]
        : recursos.filter((r) => r !== recurso);
      return { ...a, recursos_disponibilizados: atualizado };
    });
    updateState({ atendimento: novo });
  }

  function avaliarStatus() {
    const a = state.edital.atendimento;
    setStepStatus(a.length > 0 ? 'completed' : 'pending');
  }

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Necessidades especiais aceitas neste edital. Para cada uma, marque quais recursos serão disponibilizados.'));

  if (necessidadesCatalogo.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Cadastre necessidades especiais primeiro.'));
    return;
  }

  for (const nec of necessidadesCatalogo) {
    const entry = atendimento.find((a) => a.necessidadeEspecialCodigo === nec.codigo);
    const selected = !!entry;

    const card = el(
      'div',
      {
        style: `background: var(--bg-surface); border: 1px solid ${selected ? 'var(--primary)' : 'var(--border-default)'}; border-radius: 8px; padding: 1rem; margin-bottom: 1rem`,
      }
    );

    card.appendChild(
      el(
        'div',
        { class: 'flex-between' },
        el(
          'div',
          {},
          checkbox(nec.nome, selected, (v) => toggle(nec, v)),
          nec.descricao ? el('p', { class: 'text-small text-muted', style: 'margin: 0.25rem 0 0 1.5rem' }, nec.descricao) : null
        ),
        nec.exige_laudo ? el('span', { class: 'tag tag-warning' }, 'Exige laudo') : null
      )
    );

    if (selected) {
      const recursos = nec.recursos_requeridos || [];
      const ativos = entry.recursos_disponibilizados || [];

      if (recursos.length > 0) {
        const recGrid = el(
          'div',
          {
            style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.375rem; margin: 0.5rem 0 0 1.5rem',
          }
        );
        for (const r of recursos) {
          recGrid.appendChild(checkbox(r, ativos.includes(r), (v) => toggleRecurso(nec.codigo, r, v)));
        }
        card.appendChild(el('div', { style: 'margin-top: 0.5rem' }, el('div', { class: 'text-small text-muted', style: 'margin-left: 1.5rem' }, 'Recursos disponibilizados:'), recGrid));
      }
    }

    container.appendChild(card);
  }

  avaliarStatus();
}
