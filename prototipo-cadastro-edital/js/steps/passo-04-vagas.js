// Passo 4: Vagas — quadro de vagas do edital, com Ofertas de Curso referenciadas.
// Refactor 3: cada linha = (ofertaCursoCodigo, vagas).
// Compat retroativa: aceita `cursoCodigo` legado (pré-Refactor 3) — lido como `ofertaCursoCodigo`
// (os códigos são idênticos por decisão de slugging).
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
const MODALIDADE_LABEL = {
  REGULAR: 'Regular',
  FORMA_PARA: 'Forma Pará',
  PARFOR: 'PARFOR',
  PARFOR_EQUIDADE: 'PARFOR Equidade',
  PRONERA: 'PRONERA',
  PEPETI: 'Pepeti',
  PSIQ: 'PSIQ',
  CONVENIO_OUTRO: 'Convênio',
  OUTRO: 'Outro',
};

/** Constrói o label legível de uma OfertaCurso. */
function rotuloOferta(oferta, cursoPorCodigo, localPorCodigo) {
  const cursoNome = cursoPorCodigo[oferta.curso_codigo]?.nome || oferta.curso_codigo;
  const cursoGrau = cursoPorCodigo[oferta.curso_codigo]?.grau;
  const local = localPorCodigo[oferta.local_oferta_codigo]?.nome || oferta.local_oferta_codigo;
  const turno = oferta.turno ? (TURNO_LABEL[oferta.turno] || oferta.turno) : null;
  const modalidade = oferta.modalidade && oferta.modalidade !== 'REGULAR'
    ? ` [${MODALIDADE_LABEL[oferta.modalidade] || oferta.modalidade}]`
    : '';
  const turnoSeg = turno ? ` — ${turno}` : '';
  return `${cursoNome}${modalidade} — ${GRAU_ABREV[cursoGrau] || cursoGrau} — ${local}${turnoSeg}`;
}

/** Resolve ofertaCursoCodigo no shape denormalizado que a matriz de distribuição consome. */
function denormalizarOferta(oferta, cursoPorCodigo, localPorCodigo) {
  if (!oferta) return null;
  const cursoNome = cursoPorCodigo[oferta.curso_codigo]?.nome || oferta.curso_codigo;
  const cursoGrau = cursoPorCodigo[oferta.curso_codigo]?.grau || null;
  const local = localPorCodigo[oferta.local_oferta_codigo]?.nome || oferta.local_oferta_codigo;
  return {
    codigo: oferta.codigo,
    curso: cursoNome,
    grau: cursoGrau,
    campus: local,
    turno: TURNO_LABEL[oferta.turno] || oferta.turno,
    modalidade: oferta.modalidade || 'REGULAR',
  };
}

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const v = state.edital.vagas;
  const dm = state.edital.distribuicaoModalidades;

  // Refactor 3: lista OfertasCurso; fallback a Cursos se OfertasCurso estiver vazio (compat).
  const ofertasDisponiveis = new Collection(Keys.OFERTAS_CURSO).list({ includeInactive: false });
  const cursoPorCodigo = Object.fromEntries(
    new Collection(Keys.CURSOS).list({ includeInactive: true }).map((c) => [c.codigo, c])
  );
  // LocalOferta com fallback CAMPUS (compat retroativa Refactor 2).
  const localList = new Collection(Keys.LOCAL_OFERTA).list({ includeInactive: true });
  const localPorCodigo = Object.fromEntries(localList.map((l) => [l.codigo, l]));
  // Compat: combina com CAMPUS para slugs legados (ex.: CANAA_CONVENIO).
  const campusList = new Collection(Keys.CAMPUS).list({ includeInactive: true });
  for (const c of campusList) {
    if (!localPorCodigo[c.codigo]) localPorCodigo[c.codigo] = c;
  }

  // Compat pré-Refactor 3: se lista de ofertas estiver vazia, constrói virtualmente
  // a partir de seed-cursos antigo (que ainda pode estar em cache do localStorage).
  const listaEfetiva = ofertasDisponiveis.length > 0
    ? ofertasDisponiveis
    : new Collection(Keys.CURSOS).list({ includeInactive: false }).map((c) => ({
        codigo: c.codigo,
        curso_codigo: c.codigo,
        local_oferta_codigo: c.campus_codigo || null,
        unidade_ofertante_codigo: c.unidade_ofertante_codigo || null,
        modalidade: 'REGULAR',
        formato_pedagogico: 'PRESENCIAL',
        turno: c.turno || 'INTEGRAL',
      }));

  const ofertaPorCodigo = Object.fromEntries(listaEfetiva.map((o) => [o.codigo, o]));

  // key canônica do estado: ofertaCursoCodigo (compat: lê cursoCodigo se ofertaCursoCodigo ausente).
  function getKey(linha) {
    return linha.ofertaCursoCodigo ?? linha.cursoCodigo ?? null;
  }
  function setKey(val) {
    return { ofertaCursoCodigo: val, cursoCodigo: val };
  }

  // Opções do select, ordenadas por local + nome do curso
  const opcoes = [...listaEfetiva]
    .sort((a, b) => {
      const la = localPorCodigo[a.local_oferta_codigo]?.nome || a.local_oferta_codigo || '';
      const lb = localPorCodigo[b.local_oferta_codigo]?.nome || b.local_oferta_codigo || '';
      const na = cursoPorCodigo[a.curso_codigo]?.nome || a.curso_codigo || '';
      const nb = cursoPorCodigo[b.curso_codigo]?.nome || b.curso_codigo || '';
      return la.localeCompare(lb, 'pt-BR') || na.localeCompare(nb, 'pt-BR');
    })
    .map((o) => ({ value: o.codigo, label: rotuloOferta(o, cursoPorCodigo, localPorCodigo) }));

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
    updateVagas({ cursos: [...v.cursos, { ofertaCursoCodigo: null, cursoCodigo: null, vagas: 0 }] });
    render(container, ctx);
  }

  container.innerHTML = '';

  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem' }, 'Quadro de vagas (Anexo I)'));
  container.appendChild(
    el(
      'p',
      { class: 'text-muted text-small mb-2' },
      'Cada linha referencia uma ',
      el('a', { href: 'configuracao.html?slug=ofertas-curso' }, 'Oferta de Curso'),
      ' — combinação de curso × local de oferta × turno × modalidade. Para cadastrar uma oferta nova, vá na configuração antes.'
    )
  );

  if (listaEfetiva.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'tag tag-warning', style: 'padding: 0.75rem; display: block; margin-bottom: 0.75rem' },
        'A configuração de Ofertas de Curso está vazia. Cadastre antes em Configurações › Ofertas de Curso.'
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
        el('th', {}, 'Oferta de Curso'),
        el('th', { style: 'width: 100px' }, 'Vagas'),
        el('th', { class: 'actions' }, 'Ações')
      )
    )
  );
  const tbody = el('tbody');
  for (let idx = 0; idx < v.cursos.length; idx++) {
    const linha = v.cursos[idx];
    const linhaKey = getKey(linha);
    tbody.appendChild(
      el(
        'tr',
        {},
        el(
          'td',
          {},
          select(
            linhaKey,
            opcoes,
            (val) => atualizarLinha(idx, setKey(val)),
            { placeholder: '— selecione uma oferta de curso —' }
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
        ...(listaEfetiva.length === 0 ? { disabled: true } : {}),
      },
      '+ Adicionar oferta de curso'
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

  // Denormaliza ofertas para a matriz (mesmo shape do snapshot publicado).
  // Compat: resolve pelo código efetivo (ofertaCursoCodigo ou cursoCodigo legado).
  const cursosDenorm = v.cursos
    .map((linha) => {
      const key = getKey(linha);
      const oferta = ofertaPorCodigo[key];
      const dn = denormalizarOferta(oferta, cursoPorCodigo, localPorCodigo);
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
