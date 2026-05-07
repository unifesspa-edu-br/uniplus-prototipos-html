// validator.js — engine de validação dinâmica.
// Lê catálogo ObrigatoriedadeLegal e produz lista de pendências para o tipo de edital escolhido.
// Substitui validações hardcoded — quando lei muda, atualiza-se o catálogo e o resultado muda
// sem alterar uma linha de código.

import { Collection, Keys } from './storage.js';
import { el } from './dom.js';

// Mapeia regra_codigo → função avaliadora.
// Cada avaliador recebe (state, parametros) e retorna boolean.
const AVALIADORES = {
  ETAPA_OBRIGATORIA: (state, p) => {
    const etapas = state.edital.etapas || [];
    return etapas.some((e) => e.tipoEtapaCodigo === p.tipo_etapa);
  },

  MODALIDADES_MINIMAS: (state, p) => {
    const selecionadas = state.edital.vagasModalidades?.modalidades || [];
    const requeridas = p.modalidades || [];
    return requeridas.every((req) => {
      // Suporta wildcards LB_* ou LI_*
      if (req.endsWith('*')) {
        const prefix = req.slice(0, -1);
        return selecionadas.some((s) => s.startsWith(prefix));
      }
      return selecionadas.includes(req);
    });
  },

  CONCORRENCIA_DUPLA_OBRIGATORIA: (state) =>
    state.edital.vagasModalidades?.concorrenciaDupla === true,

  BONUS_OBRIGATORIO: (state, p) => {
    const bonus = state.edital.bonus;
    if (!bonus || !bonus.habilitado) return false;
    const aplicaveis = bonus.modalidades_aplicaveis || [];
    const requeridas = p.modalidades_aplicaveis || [];
    return requeridas.every((m) => aplicaveis.includes(m));
  },

  DESEMPATE_DEVE_INCLUIR: (state, p) => {
    const desempate = state.edital.desempate || [];
    return desempate.some((d) => d.codigo === p.criterio_desempate);
  },

  DOCUMENTO_OBRIGATORIO_PARA_MODALIDADE: (state, p) => {
    const docs = state.edital.documentos || [];
    const modalidades =
      p.modalidade === '*'
        ? state.edital.vagasModalidades?.modalidades || []
        : [p.modalidade];
    return modalidades.every((mod) =>
      docs.some(
        (d) =>
          d.tipoDocumentoCodigo === p.tipo_documento &&
          d.modalidade === mod &&
          d.obrigatorio === true
      )
    );
  },

  ATENDIMENTO_PCD_DISPONIVEL: (state, p) => {
    const atendimento = state.edital.atendimento || [];
    const requeridas = p.necessidades || [];
    return requeridas.every((n) =>
      atendimento.some((a) => a.necessidadeEspecialCodigo === n)
    );
  },

  ATENDIMENTO_GESTANTE_OBRIGATORIO: (state, p) => {
    // mesma lógica do anterior
    return AVALIADORES.ATENDIMENTO_PCD_DISPONIVEL(state, p);
  },
};

// Mapeia código da regra para o número do passo onde corrigir (12 passos)
const PASSO_POR_CATEGORIA = {
  ETAPA: 4,
  MODALIDADE: 3,
  DESEMPATE: 7,
  DOCUMENTO: 9,
  BONUS: 6,
  ATENDIMENTO: 11,
  OUTROS: 3,
};

/**
 * Avalia o estado contra todas as obrigatoriedades aplicáveis ao tipo do edital.
 * Retorna { ok, pendencias[], aplicaveis[], naoAplicaveis[] }.
 */
export function validate(state) {
  const tipoCodigo = state.edital.tipo?.codigo;
  const obrigCol = new Collection(Keys.OBRIGATORIEDADES);
  const todas = obrigCol.list({ includeInactive: false });

  const aplicaveis = todas.filter((r) => {
    if (!r.tipo_edital_codigo) return false;
    if (r.tipo_edital_codigo === '*') return !!tipoCodigo;
    return r.tipo_edital_codigo === tipoCodigo;
  });

  const resultados = aplicaveis.map((regra) => {
    const avaliador = AVALIADORES[regra.regra_codigo];
    let atendida = false;
    let erro = null;

    if (!avaliador) {
      erro = `Regra "${regra.regra_codigo}" sem avaliador implementado.`;
    } else {
      try {
        atendida = avaliador(state, regra.parametros || {});
      } catch (e) {
        erro = e.message;
      }
    }

    return {
      regra,
      atendida,
      erro,
      passoSugerido: PASSO_POR_CATEGORIA[regra.categoria] || 13,
    };
  });

  const pendencias = resultados.filter((r) => !r.atendida);
  return {
    ok: pendencias.length === 0,
    aplicaveis: resultados,
    pendencias,
  };
}

/**
 * Renderiza painel de validações no passo 13.
 */
export async function renderValidationPanel(container, ctx) {
  const { state, navigateTo } = ctx;
  const result = validate(state);

  const panel = el('div', { class: 'validation-panel' });
  panel.appendChild(
    el(
      'div',
      { class: 'validation-panel-header' },
      el('h3', { class: 'validation-panel-title' }, '⚖️ Validações dinâmicas (obrigatoriedades legais)'),
      result.ok
        ? el('span', { class: 'tag tag-success' }, '✓ Tudo conforme')
        : el('span', { class: 'tag tag-warning' }, `${result.pendencias.length} pendência(s)`)
    )
  );

  if (result.aplicaveis.length === 0) {
    panel.appendChild(
      el(
        'div',
        { style: 'padding: 1.5rem; text-align: center; color: var(--color-text-secondary)' },
        el('p', {}, 'Nenhuma obrigatoriedade legal cadastrada para este tipo de edital.'),
        el(
          'a',
          { class: 'btn btn-secondary mt-2', href: 'catalogo.html?slug=obrigatoriedades' },
          'Ir para o catálogo'
        )
      )
    );
  } else {
    const list = el('ul', { class: 'validation-list' });
    for (const r of result.aplicaveis) {
      const statusClass = r.atendida ? 'validation-status-ok' : 'validation-status-warning';
      const icon = r.atendida ? '✅' : '⚠️';
      list.appendChild(
        el(
          'li',
          { class: 'validation-item' },
          el('span', { class: statusClass, style: 'font-size: 1.25rem; flex-shrink: 0' }, icon),
          el(
            'div',
            { style: 'flex: 1' },
            el('div', { class: 'validation-rule' }, r.regra.descricao_humana),
            el(
              'div',
              { class: 'validation-base-legal' },
              `📜 ${r.regra.base_legal} · Categoria: ${r.regra.categoria} · Regra: ${r.regra.regra_codigo}`
            ),
            r.erro
              ? el('div', { class: 'text-small', style: 'color: #c92a2a' }, `Erro: ${r.erro}`)
              : null
          ),
          !r.atendida
            ? el(
                'button',
                {
                  type: 'button',
                  class: 'btn btn-secondary btn-small',
                  on: { click: () => navigateTo(r.passoSugerido) },
                },
                `Corrigir (passo ${r.passoSugerido})`
              )
            : null
        )
      );
    }
    panel.appendChild(list);
  }

  container.appendChild(panel);

  return result;
}
