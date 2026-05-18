// distribuicao-vagas.js — fórmula de distribuição de vagas por modalidade
// (Lei 12.711/2012 + Lei 14.723/2023). Referência: docs/base-conhecimento/sistema-cotas-e-vagas.md.
//
// É função pura: para um total VO + os percentuais IBGE (PPI, Q, PcD) +
// a regra de balanceamento, retorna a decomposição inteira por modalidade.
// Mesma entrada → mesma saída, independente de quando é executada — alinhado
// com o RN08 (snapshot congelado).

import { el } from './dom.js';

function tetoComMinimo(n) {
  return Math.max(1, Math.ceil(n));
}

function somar(dist) {
  return Object.values(dist).reduce((s, v) => s + v, 0);
}

// =====================================================
// ESTRATEGIAS — 3 estratégias canônicas de resolução de estouro de vagas.
// Não há eval, não há código submetido pelo usuário: cada entrada da configuração
// `estrategias-balanceamento` deve escolher uma destas via `estrategia_codigo` e passar
// `parametros_campos` (lista de modalidades afetadas). Entradas com estratégia
// desconhecida caem em PERMITE_ESTOURO (default permissivo + auditável).
// =====================================================

/** Sem ajuste. Soma pode estourar VO se o mínimo garantido for acionado. */
function PERMITE_ESTOURO(raw) {
  return raw;
}

/**
 * Subtrai o excesso dos campos listados, na ordem. Cada campo é consumido até zerar
 * antes de passar para o próximo. Não fica negativo.
 *
 * Exemplos compostos via dados:
 *   campos=["ac"]                          → REDUZIR_AC tradicional
 *   campos=["lb_ep","li_ep","ac"]          → cascata, preserva PPI/Q/PcD
 *   campos=["li_ep","lb_ep"]               → consome só LI/LB EP, deixa AC intacta
 */
function REDUZIR_DE(raw, vo, campos) {
  let excesso = somar(raw) - vo;
  if (excesso <= 0 || !campos?.length) return raw;
  const result = { ...raw };
  for (const campo of campos) {
    if (excesso <= 0) break;
    if (!(campo in result)) continue;
    const valor = result[campo] || 0;
    const reducao = Math.min(valor, excesso);
    result[campo] = valor - reducao;
    excesso -= reducao;
  }
  return result;
}

/**
 * Distribui o excesso entre os campos listados, proporcionalmente ao valor de cada um.
 * Garante soma exata = VO quando os campos cobrem o excesso; se não cobrem, zera todos
 * e o restante fica como estouro residual (sinalização para o usuário).
 */
function REDUZIR_PROPORCIONAL_EM(raw, vo, campos) {
  let excesso = somar(raw) - vo;
  if (excesso <= 0 || !campos?.length) return raw;
  const total = campos.reduce((s, c) => s + (raw[c] || 0), 0);
  if (total === 0) return raw;
  if (total <= excesso) {
    const result = { ...raw };
    for (const campo of campos) result[campo] = 0;
    return result;
  }
  const result = { ...raw };
  let reduzidoTotal = 0;
  for (let i = 0; i < campos.length; i++) {
    const campo = campos[i];
    if (!(campo in result)) continue;
    const valor = raw[campo] || 0;
    const reducao =
      i === campos.length - 1
        ? excesso - reduzidoTotal // último campo: pega o restante para fechar exato
        : Math.round((excesso * valor) / total);
    result[campo] = Math.max(0, valor - reducao);
    reduzidoTotal += reducao;
  }
  return result;
}

export const ESTRATEGIAS = { PERMITE_ESTOURO, REDUZIR_DE, REDUZIR_PROPORCIONAL_EM };

/**
 * Decompõe `vagasTotal` em modalidades aplicando os percentuais IBGE
 * e (opcionalmente) uma regra de balanceamento via estratégia canônica.
 *
 * @param {number} vagasTotal — VO do curso/turno
 * @param {object} ibge — { ppi, q, pcd } em pontos percentuais
 * @param {object|null} regra — entrada da configuração `estrategias-balanceamento` com
 *                              `estrategia_codigo` (chave em ESTRATEGIAS) e
 *                              `parametros_campos` (array de modalidades).
 *                              null → PERMITE_ESTOURO. Estratégia desconhecida → PERMITE_ESTOURO.
 */
export function calcularDistribuicao(vagasTotal, ibge, regra) {
  if (!ibge || !vagasTotal) return null;
  const vo = Number(vagasTotal) || 0;
  if (vo <= 0) return null;

  const ppi = Number(ibge.ppi) || 0;
  const q = Number(ibge.q) || 0;
  const pcd = Number(ibge.pcd) || 0;

  const ac = Math.floor(vo * 0.5);
  const vr = vo - ac;
  const vrri = Math.floor(vr * 0.5);
  const vrsi = vr - vrri;

  const lb_ppi = tetoComMinimo((vrri * ppi) / 100);
  const lb_q = tetoComMinimo((vrri * q) / 100);
  const lb_pcd = tetoComMinimo((vrri * pcd) / 100);
  const lb_ep = Math.max(0, vrri - lb_ppi - lb_q - lb_pcd);

  const li_ppi = tetoComMinimo((vrsi * ppi) / 100);
  const li_q = tetoComMinimo((vrsi * q) / 100);
  const li_pcd = tetoComMinimo((vrsi * pcd) / 100);
  const li_ep = Math.max(0, vrsi - li_ppi - li_q - li_pcd);

  const raw = { ac, lb_ppi, lb_q, lb_pcd, lb_ep, li_ppi, li_q, li_pcd, li_ep };

  const codigo = regra?.estrategia_codigo;
  const estrategia = (codigo && ESTRATEGIAS[codigo]) || ESTRATEGIAS.PERMITE_ESTOURO;
  const campos = regra?.parametros_campos || [];
  return estrategia(raw, vo, campos);
}

/** Lista das estratégias disponíveis — usada pela UI da configuração CRUD. */
export const ESTRATEGIAS_DISPONIVEIS = Object.keys(ESTRATEGIAS);

const COLUNAS = [
  { key: 'ac', label: 'AC', codigo: 'AC' },
  { key: 'lb_ppi', label: 'LB_PPI', codigo: 'LB_PPI' },
  { key: 'lb_q', label: 'LB_Q', codigo: 'LB_Q' },
  { key: 'lb_pcd', label: 'LB_PcD', codigo: 'LB_PcD' },
  { key: 'lb_ep', label: 'LB_EP', codigo: 'LB_EP' },
  { key: 'li_ppi', label: 'LI_PPI', codigo: 'LI_PPI' },
  { key: 'li_q', label: 'LI_Q', codigo: 'LI_Q' },
  { key: 'li_pcd', label: 'LI_PcD', codigo: 'LI_PcD' },
  { key: 'li_ep', label: 'LI_EP', codigo: 'LI_EP' },
];

/**
 * Matriz cursos × modalidades. Quando `modalidadesSelecionadas` é fornecida,
 * só renderiza colunas das modalidades efetivamente selecionadas no edital.
 * Linha "Totais" no rodapé soma cada coluna.
 */
export function renderMatrizDistribuicao(cursos, ibge, modalidadesSelecionadas = null, regra = null) {
  if (!ibge) {
    return placeholder('Selecione uma entrada IBGE no passo 3 para visualizar a distribuição.');
  }
  if (!cursos || cursos.length === 0) {
    return placeholder('Adicione cursos para visualizar a distribuição por modalidade.');
  }

  const cols = modalidadesSelecionadas
    ? COLUNAS.filter((c) => modalidadesSelecionadas.includes(c.codigo))
    : COLUNAS;

  if (cols.length === 0) {
    return placeholder('Nenhuma modalidade selecionada no passo 3 — volte e marque ao menos uma.');
  }

  const totais = Object.fromEntries(cols.map((c) => [c.key, 0]));
  let totalGeral = 0;
  let cursosComEstouro = 0;

  const tbody = el('tbody');
  for (const curso of cursos) {
    const dist = calcularDistribuicao(curso.vagas, ibge, regra);
    if (!dist) continue;
    const voCurso = Number(curso.vagas) || 0;
    totalGeral += voCurso;
    for (const col of cols) totais[col.key] += dist[col.key];

    // Soma das colunas visíveis (alinhada com o que está sendo mostrado)
    const somaLinha = cols.reduce((s, col) => s + dist[col.key], 0);
    const estouro = somaLinha - voCurso;
    if (estouro > 0) cursosComEstouro++;

    const totalCell = el(
      'td',
      { style: 'text-align: right; font-weight: 600' },
      String(voCurso),
      estouro > 0
        ? el(
            'span',
            {
              class: 'text-small',
              style: 'color: var(--warning-text); margin-left: 0.25rem',
              title: `Soma das modalidades = ${somaLinha} (+${estouro} pelo mínimo garantido).`,
            },
            `(+${estouro})`
          )
        : null
    );

    tbody.appendChild(
      el(
        'tr',
        {},
        el('td', {}, curso.curso || '—'),
        el('td', { class: 'text-small' }, curso.grau || '—'),
        el('td', {}, curso.campus || '—'),
        el('td', {}, curso.turno || '—'),
        totalCell,
        ...cols.map((col) =>
          el('td', { style: 'text-align: right; font-family: monospace' }, String(dist[col.key]))
        )
      )
    );
  }

  const thead = el(
    'thead',
    {},
    el(
      'tr',
      {},
      el('th', {}, 'Curso'),
      el('th', {}, 'Grau'),
      el('th', {}, 'Campus'),
      el('th', {}, 'Turno'),
      el('th', { style: 'text-align: right' }, 'Total'),
      ...cols.map((c) => el('th', { style: 'text-align: right' }, c.label))
    )
  );

  const tfoot = el(
    'tfoot',
    {},
    el(
      'tr',
      { style: 'font-weight: 700; background: var(--bg-surface-alt)' },
      el('td', { colspan: '4' }, 'Totais'),
      el('td', { style: 'text-align: right' }, String(totalGeral)),
      ...cols.map((col) =>
        el('td', { style: 'text-align: right; font-family: monospace' }, String(totais[col.key]))
      )
    )
  );

  const wrap = el('div', {});
  wrap.appendChild(
    el('div', { class: 'table-wrapper' }, el('table', { class: 'data-table' }, thead, tbody, tfoot))
  );
  if (cursosComEstouro > 0) {
    wrap.appendChild(
      el(
        'div',
        {
          class: 'text-small text-muted',
          style: 'margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: var(--warning-bg); border-left: 3px solid var(--warning-text); border-radius: 2px',
        },
        el('strong', {}, `${cursosComEstouro} curso(s) `),
        'com soma maior que o total: o "+N" ao lado do total é o estouro causado pela garantia de ',
        el('strong', {}, 'mínimo 1 vaga por modalidade '),
        '(sistema-cotas-e-vagas.md, regras de arredondamento). Em produção, a regra de balanceamento entre modalidades precisa ser definida pelo CEPS.'
      )
    );
  }
  return wrap;
}

function placeholder(texto) {
  return el(
    'div',
    {
      class: 'text-muted text-small',
      style: 'padding: 1rem; background: var(--bg-surface-alt); border-radius: 4px',
    },
    texto
  );
}
