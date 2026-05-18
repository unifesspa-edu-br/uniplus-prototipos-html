// Passo 4: Vagas — quadro de vagas do edital, com cursos referenciados pela
// configuração `cursos`. Cada linha = (cursoCodigo, vagas).
// Aparece depois de Modalidades (passo 3).

import { Collection, Keys } from '../storage.js';
import { el, input, select } from '../dom.js';
import { renderMatrizDistribuicao } from '../distribuicao-vagas.js';

const GRAU_ABREV = { BACHARELADO: 'Bach.', LICENCIATURA: 'Lic.', TECNOLOGO: 'Tecn.' };
const TURNO_LABEL = {
  MATUTINO: 'Matutino',
  VESPERTINO: 'Vespertino',
  NOTURNO: 'Noturno',
  INTEGRAL: 'Integral',
};

/** Constrói o label legível de uma entrada de Cursos. */
function rotuloCurso(curso, cidadePorCodigo) {
  const campus = cidadePorCodigo[curso.campus_codigo]?.nome || curso.campus_codigo;
  return `${curso.nome} — ${GRAU_ABREV[curso.grau] || curso.grau} — ${campus} — ${TURNO_LABEL[curso.turno] || curso.turno}`;
}

/** Resolve um cursoCodigo no shape denormalizado que a matriz consome. */
function denormalizar(curso, cidadePorCodigo) {
  if (!curso) return null;
  const campus = cidadePorCodigo[curso.campus_codigo]?.nome || curso.campus_codigo;
  return {
    codigo: curso.codigo,
    curso: curso.nome,
    grau: curso.grau,
    campus,
    turno: TURNO_LABEL[curso.turno] || curso.turno,
  };
}

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const v = state.edital.vagas;
  const dm = state.edital.distribuicaoModalidades;

  const cursosDisponiveis = new Collection(Keys.CURSOS).list({ includeInactive: false });
  const cidades = new Collection(Keys.CIDADES_PROVA).list({ includeInactive: true });
  const cidadePorCodigo = Object.fromEntries(cidades.map((l) => [l.codigo, l]));
  const cursoPorCodigo = Object.fromEntries(cursosDisponiveis.map((c) => [c.codigo, c]));

  // Opções do select, ordenadas por campus + nome
  const opcoes = [...cursosDisponiveis]
    .sort((a, b) => {
      const ca = cidadePorCodigo[a.campus_codigo]?.nome || a.campus_codigo;
      const cb = cidadePorCodigo[b.campus_codigo]?.nome || b.campus_codigo;
      return ca.localeCompare(cb, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR');
    })
    .map((c) => ({ value: c.codigo, label: rotuloCurso(c, cidadePorCodigo) }));

  function updateVagas(patch) {
    updateState({ vagas: { ...v, ...patch } });
    avaliarStatus();
  }

  function avaliarStatus() {
    const vagas = state.edital.vagas;
    setStepStatus((vagas?.cursos || []).length > 0 ? 'concluido' : 'pendente');
  }

  function atualizarLinha(idx, patch) {
    const novos = [...v.cursos];
    novos[idx] = { ...novos[idx], ...patch };
    updateVagas({ cursos: novos });
  }

  function removerLinha(idx) {
    updateVagas({ cursos: v.cursos.filter((_, i) => i !== idx) });
    render(container, ctx);
  }

  function adicionarLinha() {
    updateVagas({ cursos: [...v.cursos, { cursoCodigo: null, vagas: 0 }] });
    render(container, ctx);
  }

  container.innerHTML = '';

  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem' }, 'Quadro de vagas (Anexo I)'));
  container.appendChild(
    el(
      'p',
      { class: 'text-muted text-small mb-2' },
      'Cada linha referencia uma entrada de ',
      el('a', { href: 'configuracao.html?slug=cursos' }, 'Cursos'),
      ' — combinação única de nome × grau × campus × turno. Para cadastrar um curso novo, vá na configuração antes.'
    )
  );

  if (cursosDisponiveis.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'tag tag-warning', style: 'padding: 0.75rem; display: block; margin-bottom: 0.75rem' },
        'A configuração de Cursos está vazia. Cadastre antes em Configurações › Cursos.'
      )
    );
  }

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
        el('th', { style: 'width: 100px' }, 'Vagas'),
        el('th', { class: 'actions' }, 'Ações')
      )
    )
  );
  const tbody = el('tbody');
  for (let idx = 0; idx < v.cursos.length; idx++) {
    const linha = v.cursos[idx];
    tbody.appendChild(
      el(
        'tr',
        {},
        el(
          'td',
          {},
          select(
            linha.cursoCodigo,
            opcoes,
            (val) => atualizarLinha(idx, { cursoCodigo: val }),
            { placeholder: '— selecione um curso —' }
          )
        ),
        el(
          'td',
          {},
          input(linha.vagas, (v) => atualizarLinha(idx, { vagas: Number(v) || 0 }), { type: 'number' })
        ),
        el(
          'td',
          { class: 'actions' },
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-small',
              on: { click: () => removerLinha(idx) },
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

  container.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary mt-2',
        on: { click: adicionarLinha },
        ...(cursosDisponiveis.length === 0 ? { disabled: true } : {}),
      },
      '+ Adicionar curso'
    )
  );

  const totalVagas = v.cursos.reduce((sum, c) => sum + (c.vagas || 0), 0);
  container.appendChild(
    el(
      'div',
      { class: 'mt-4', style: 'background: var(--primary-pastel-02); padding: 0.75rem; border-radius: 4px' },
      el('strong', {}, `Total de vagas: ${totalVagas}`),
      ' · ',
      el('span', { class: 'text-muted' }, `${v.cursos.length} linha(s)`)
    )
  );

  // ===== Distribuição por modalidade =====
  const ibge = dm.percentuaisIbgeCodigo
    ? new Collection(Keys.PERCENTUAIS_IBGE).byCodigo(dm.percentuaisIbgeCodigo)
    : null;
  const regra = dm.estrategiaBalanceamentoCodigo
    ? new Collection(Keys.ESTRATEGIAS_BALANCEAMENTO).byCodigo(dm.estrategiaBalanceamentoCodigo)
    : null;

  // Denormaliza cursos para a matriz (mesmo shape do snapshot publicado)
  const cursosDenorm = v.cursos
    .map((linha) => {
      const curso = cursoPorCodigo[linha.cursoCodigo];
      const dn = denormalizar(curso, cidadePorCodigo);
      if (!dn) return null;
      return { ...dn, vagas: linha.vagas || 0 };
    })
    .filter(Boolean);

  const detalhes = el('details', { style: 'margin-top: 1.5rem' });
  detalhes.appendChild(
    el(
      'summary',
      { style: 'cursor: pointer; padding: 0.5rem 0; font-weight: 600; font-size: 0.9375rem' },
      '📊 Ver distribuição de vagas por modalidade (Lei 12.711/2012 + 14.723/2023)'
    )
  );
  detalhes.appendChild(
    el(
      'p',
      { class: 'text-muted text-small', style: 'margin: 0.25rem 0 0.75rem' },
      ibge
        ? `Calculado a partir de ${ibge.codigo} (PPI=${ibge.ppi}%, Q=${ibge.q}%, PcD=${ibge.pcd}%) · regra: ${regra?.codigo || 'MINIMO_GARANTIDO_ESTOURA (default)'}.`
        : 'Sem entrada IBGE definida. Volte ao passo 3 (Modalidades) para selecionar uma.'
    )
  );
  detalhes.appendChild(renderMatrizDistribuicao(cursosDenorm, ibge, dm.modalidades, regra));
  container.appendChild(detalhes);

  avaliarStatus();
}
