// Passo 4: Vagas e modalidades — cursos × vagas, modalidades selecionadas, concorrência dupla, cascata.

import { Collection, Keys } from '../storage.js';
import { el, field, input, checkbox } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const vm = state.edital.vagasModalidades;
  const modalidadesCatalogo = new Collection(Keys.MODALIDADES).list({ includeInactive: false });

  function updateVm(patch) {
    updateState({ vagasModalidades: { ...vm, ...patch } });
    avaliarStatus();
  }

  function avaliarStatus() {
    const v = state.edital.vagasModalidades;
    const completo = v.cursos.length > 0 && v.modalidades.length > 0;
    setStepStatus(completo ? 'completed' : v.cursos.length > 0 || v.modalidades.length > 0 ? 'in-progress' : 'pending');
  }

  container.innerHTML = '';

  // ===== Modalidades selecionadas =====
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem' }, 'Modalidades de concorrência'));
  container.appendChild(el('p', { class: 'text-muted text-small mb-2' }, 'Selecione as modalidades que este edital aceita. Defaults sugeridos pelo tipo já estão marcados.'));

  const modGrid = el(
    'div',
    { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem' }
  );
  for (const mod of modalidadesCatalogo) {
    const checked = vm.modalidades.includes(mod.codigo);
    modGrid.appendChild(
      checkbox(
        `${mod.codigo} — ${mod.nome_completo}`,
        checked,
        (val) => {
          const novas = val
            ? [...new Set([...vm.modalidades, mod.codigo])]
            : vm.modalidades.filter((c) => c !== mod.codigo);
          updateVm({ modalidades: novas });
        }
      )
    );
  }
  container.appendChild(modGrid);

  // ===== Concorrência dupla =====
  container.appendChild(
    field(
      'Concorrência dupla (Lei 14.723/2023)',
      checkbox('Aplicar concorrência dupla — cotista que atinge nota de AC ocupa vaga de AC', vm.concorrenciaDupla, (val) => updateVm({ concorrenciaDupla: val }))
    )
  );

  // ===== Cursos × vagas =====
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem; margin-top: 1.5rem' }, 'Quadro de vagas (Anexo I)'));
  container.appendChild(el('p', { class: 'text-muted text-small mb-2' }, 'Curso, campus, turno e vagas totais. Distribuição por modalidade pode ser configurada por edital ou seguir percentuais legais (Lei 12.711/2012).'));

  const wrap = el('div', { class: 'table-wrapper' });
  const table = el('table', { class: 'data-table' });
  table.appendChild(
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', {}, 'Curso'),
        el('th', {}, 'Campus'),
        el('th', {}, 'Turno'),
        el('th', { style: 'width: 100px' }, 'Vagas'),
        el('th', { class: 'actions' }, 'Ações')
      )
    )
  );
  const tbody = el('tbody');
  for (let idx = 0; idx < vm.cursos.length; idx++) {
    const c = vm.cursos[idx];
    tbody.appendChild(
      el(
        'tr',
        {},
        el('td', {}, input(c.curso, (v) => atualizarCurso(idx, 'curso', v), { placeholder: 'Ex.: Pedagogia' })),
        el('td', {}, input(c.campus, (v) => atualizarCurso(idx, 'campus', v))),
        el('td', {}, input(c.turno, (v) => atualizarCurso(idx, 'turno', v))),
        el('td', {}, input(c.vagas, (v) => atualizarCurso(idx, 'vagas', Number(v) || 0), { type: 'number' })),
        el(
          'td',
          { class: 'actions' },
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-small',
              on: { click: () => removerCurso(idx) },
            },
            '🗑'
          )
        )
      )
    );
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);

  function atualizarCurso(idx, campo, valor) {
    const novos = [...vm.cursos];
    novos[idx] = { ...novos[idx], [campo]: valor };
    updateVm({ cursos: novos });
  }

  function removerCurso(idx) {
    const novos = vm.cursos.filter((_, i) => i !== idx);
    updateVm({ cursos: novos });
    render(container, ctx);
  }

  function adicionarCurso() {
    const novo = { curso: '', campus: '', turno: '', vagas: 0 };
    updateVm({ cursos: [...vm.cursos, novo] });
    render(container, ctx);
  }

  container.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary mt-2',
        on: { click: adicionarCurso },
      },
      '+ Adicionar curso'
    )
  );

  // ===== Total de vagas =====
  const totalVagas = vm.cursos.reduce((sum, c) => sum + (c.vagas || 0), 0);
  container.appendChild(
    el(
      'div',
      { class: 'mt-4', style: 'background: var(--primary-pastel-02); padding: 0.75rem; border-radius: 4px' },
      el('strong', {}, `Total de vagas: ${totalVagas}`)
    )
  );

  avaliarStatus();
}
