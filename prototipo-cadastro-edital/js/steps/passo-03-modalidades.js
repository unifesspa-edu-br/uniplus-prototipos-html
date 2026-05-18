// Passo 3: Modalidades de concorrência — quais modalidades este edital aceita
// + regra de concorrência dupla (Lei 14.723/2023) + percentuais IBGE de referência.

import { Collection, Keys } from '../storage.js';
import { el, field, checkbox, select } from '../dom.js';
import { calcularDistribuicao } from '../distribuicao-vagas.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const dm = state.edital.distribuicaoModalidades;
  const modalidadesDisponiveis = new Collection(Keys.MODALIDADES).list({ includeInactive: false });
  const ibgeDisponiveis = new Collection(Keys.PERCENTUAIS_IBGE).list({ includeInactive: false });
  const estrategiasDisponiveis = new Collection(Keys.ESTRATEGIAS_BALANCEAMENTO).list({ includeInactive: false });
  const cascatasDisponiveis = new Collection(Keys.CASCATAS_REMANEJAMENTO).list({ includeInactive: false });

  function updateDm(patch) {
    updateState({ distribuicaoModalidades: { ...dm, ...patch } });
    rerender();
    avaliarStatus();
  }

  function avaliarStatus() {
    const d = state.edital.distribuicaoModalidades;
    setStepStatus(d.modalidades.length > 0 ? 'concluido' : 'pendente');
  }

  function rerender() {
    render(container, ctx);
  }

  container.innerHTML = '';

  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem' }, 'Modalidades de concorrência'));
  container.appendChild(el('p', { class: 'text-muted text-small mb-2' }, 'Selecione as modalidades que este edital aceita. Defaults sugeridos pelo tipo já estão marcados.'));

  const modGrid = el(
    'div',
    { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem' }
  );
  for (const mod of modalidadesDisponiveis) {
    const checked = dm.modalidades.includes(mod.codigo);
    modGrid.appendChild(
      checkbox(
        `${mod.codigo} — ${mod.nome}`,
        checked,
        (val) => {
          const novas = val
            ? [...new Set([...dm.modalidades, mod.codigo])]
            : dm.modalidades.filter((c) => c !== mod.codigo);
          updateDm({ modalidades: novas });
        }
      )
    );
  }
  container.appendChild(modGrid);

  container.appendChild(
    field(
      'Concorrência dupla (Lei 14.723/2023)',
      checkbox('Aplicar concorrência dupla — cotista que atinge nota de AC ocupa vaga de AC', dm.concorrenciaDupla, (val) => updateDm({ concorrenciaDupla: val }))
    )
  );

  // ===== Percentuais IBGE =====
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem' }, 'Percentuais demográficos (IBGE)'));
  container.appendChild(
    el(
      'p',
      { class: 'text-muted text-small mb-2' },
      'Insumos da fórmula de distribuição de vagas por modalidade (Lei 12.711/2012 + 14.723/2023). ',
      el('strong', {}, 'Os valores são congelados no snapshot ao publicar (RN08).'),
      ' Editar a configuração depois ',
      el('em', {}, 'não'),
      ' altera editais já publicados — gerencie em ',
      el('a', { href: 'configuracao.html?slug=percentuais-ibge' }, 'Configurações › Percentuais demográficos'),
      '.'
    )
  );

  const opts = ibgeDisponiveis.map((p) => ({
    value: p.codigo,
    label: `${p.codigo} — ${p.nome}`,
  }));
  container.appendChild(
    field(
      'Entrada IBGE de referência',
      select(
        dm.percentuaisIbgeCodigo,
        opts,
        (val) => updateDm({ percentuaisIbgeCodigo: val }),
        { placeholder: '— selecione —' }
      )
    )
  );

  if (dm.percentuaisIbgeCodigo) {
    const ibge = ibgeDisponiveis.find((p) => p.codigo === dm.percentuaisIbgeCodigo);
    if (ibge) {
      const totalVagas = (state.edital.vagas?.cursos || []).reduce((s, c) => s + (Number(c.vagas) || 0), 0);
      const regra = dm.estrategiaBalanceamentoCodigo
        ? estrategiasDisponiveis.find((r) => r.codigo === dm.estrategiaBalanceamentoCodigo)
        : null;
      container.appendChild(renderPreviewIbge(ibge, totalVagas, regra));
    } else {
      container.appendChild(
        el(
          'div',
          { class: 'tag tag-warning', style: 'margin-top: 0.5rem' },
          `Entrada "${dm.percentuaisIbgeCodigo}" não encontrada na configuração — recadastre ou escolha outra.`
        )
      );
    }
  }

  // ===== Estratégia de balanceamento =====
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem' }, 'Estratégia de balanceamento'));
  container.appendChild(
    el(
      'p',
      { class: 'text-muted text-small mb-2' },
      'Estratégia aplicada quando o mínimo 1 vaga por modalidade faz a soma estourar o total do curso. ',
      el('strong', {}, 'Também é congelada no snapshot (RN08).'),
      ' Gerencie em ',
      el('a', { href: 'configuracao.html?slug=estrategias-balanceamento' }, 'Configurações › Estratégias de balanceamento'),
      '.'
    )
  );
  const estrategiaOpts = estrategiasDisponiveis.map((r) => ({ value: r.codigo, label: `${r.codigo} — ${r.nome}` }));
  container.appendChild(
    field(
      'Estratégia aplicada quando a soma estoura VO',
      select(
        dm.estrategiaBalanceamentoCodigo,
        estrategiaOpts,
        (val) => updateDm({ estrategiaBalanceamentoCodigo: val }),
        { placeholder: '— default: MINIMO_GARANTIDO_ESTOURA —' }
      )
    )
  );
  if (dm.estrategiaBalanceamentoCodigo) {
    const regra = estrategiasDisponiveis.find((r) => r.codigo === dm.estrategiaBalanceamentoCodigo);
    if (regra) {
      container.appendChild(
        el(
          'div',
          { class: 'text-small text-muted', style: 'margin-top: 0.25rem; padding: 0.5rem 0.75rem; background: var(--bg-surface-alt); border-radius: 4px' },
          regra.descricao
        )
      );
    }
  }

  // ===== Cascata de remanejamento =====
  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem' }, 'Cascata de remanejamento'));
  container.appendChild(
    el(
      'p',
      { class: 'text-muted text-small mb-2' },
      'Ordem em que vagas não preenchidas em cada modalidade são redirecionadas. ',
      el('strong', {}, 'Congelada no snapshot (RN08).'),
      ' Gerencie em ',
      el('a', { href: 'configuracao.html?slug=cascatas-remanejamento' }, 'Configurações › Cascatas de remanejamento'),
      '.'
    )
  );
  const cascataOpts = cascatasDisponiveis.map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.nome}` }));
  container.appendChild(
    field(
      'Política de remanejamento aplicada',
      select(
        dm.cascataRemanejamentoCodigo,
        cascataOpts,
        (val) => updateDm({ cascataRemanejamentoCodigo: val }),
        { placeholder: '— selecione —' }
      )
    )
  );
  if (dm.cascataRemanejamentoCodigo) {
    const cascata = cascatasDisponiveis.find((c) => c.codigo === dm.cascataRemanejamentoCodigo);
    if (cascata) {
      container.appendChild(renderPreviewCascata(cascata, dm.modalidades));
    } else {
      container.appendChild(
        el(
          'div',
          { class: 'tag tag-warning', style: 'margin-top: 0.5rem' },
          `Cascata "${dm.cascataRemanejamentoCodigo}" não encontrada — recadastre ou escolha outra.`
        )
      );
    }
  }

  avaliarStatus();
}

/** Lista todas as siglas usadas na cascata (chaves + destinos + fallback). */
function modalidadesDaCascata(cascata) {
  const set = new Set();
  const ordens = cascata.ordens || {};
  for (const [origem, destinos] of Object.entries(ordens)) {
    set.add(origem);
    for (const d of destinos || []) set.add(d);
  }
  if (cascata.fallback_codigo) set.add(cascata.fallback_codigo);
  return set;
}

/** Preview da tabela de remanejamento + alertas de cobertura contra as modalidades do edital. */
function renderPreviewCascata(cascata, modalidadesSelecionadas) {
  const wrap = el(
    'div',
    {
      style:
        'margin-top: 0.5rem; padding: 0.75rem 1rem; background: var(--primary-pastel-02); border-radius: 4px',
    },
    el(
      'div',
      { class: 'text-small text-muted mb-2' },
      cascata.descricao || cascata.nome,
      cascata.base_legal ? ` · ${cascata.base_legal}` : ''
    )
  );

  // Avisos de cobertura
  const origens = Object.keys(cascata.ordens || {});
  const fallback = cascata.fallback_codigo;
  const semDestino = (modalidadesSelecionadas || []).filter(
    (m) => !origens.includes(m) && m !== fallback
  );
  if (semDestino.length > 0) {
    wrap.appendChild(
      el(
        'div',
        {
          class: 'tag tag-warning text-small',
          style: 'display: block; padding: 0.5rem; margin-bottom: 0.5rem',
        },
        `⚠️ Modalidades sem destino configurado nesta cascata: ${semDestino.join(', ')}. Caem direto no fallback (${fallback || 'AC'}).`
      )
    );
  }

  // Tabela: origem → destinos
  const detalhes = el('details');
  detalhes.appendChild(
    el(
      'summary',
      { style: 'cursor: pointer; font-size: 0.875rem; font-weight: 600' },
      `Ver tabela (${origens.length} origens · fallback ${fallback || 'AC'})`
    )
  );
  const wrapTable = el('div', { class: 'table-wrapper', style: 'margin-top: 0.5rem' });
  const table = el('table', { class: 'data-table' });
  table.appendChild(
    el('thead', {}, el('tr', {}, el('th', {}, 'Origem'), el('th', {}, 'Ordem de destinos')))
  );
  const tbody = el('tbody');
  for (const [origem, destinos] of Object.entries(cascata.ordens || {})) {
    tbody.appendChild(
      el(
        'tr',
        {},
        el('td', { style: 'font-family: monospace; font-weight: 600' }, origem),
        el(
          'td',
          { style: 'font-family: monospace; font-size: 0.875rem' },
          (destinos || []).length > 0 ? destinos.join(' → ') : `→ ${fallback || 'AC'} (fallback direto)`
        )
      )
    );
  }
  table.appendChild(tbody);
  wrapTable.appendChild(table);
  detalhes.appendChild(wrapTable);
  wrap.appendChild(detalhes);

  return wrap;
}

/** Mostra os valores carregados + preview da decomposição para o total de vagas do edital. */
function renderPreviewIbge(ibge, totalVagas, regra) {
  const box = el(
    'div',
    {
      style:
        'margin-top: 0.75rem; padding: 0.75rem 1rem; background: var(--primary-pastel-02); border-radius: 4px; font-size: 0.875rem',
    },
    el(
      'div',
      { style: 'display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 0.5rem' },
      el('span', {}, el('strong', {}, 'PPI: '), `${ibge.ppi}%`),
      el('span', {}, el('strong', {}, 'Q: '), `${ibge.q}%`),
      el('span', {}, el('strong', {}, 'PcD: '), `${ibge.pcd}%`),
      el('span', { class: 'text-muted' }, `${ibge.uf} · Censo ${ibge.ano_censo}`)
    )
  );

  const dist = calcularDistribuicao(totalVagas, ibge, regra);
  if (dist) {
    box.appendChild(
      el(
        'div',
        { style: 'font-size: 0.8125rem; margin-top: 0.25rem' },
        el(
          'div',
          { class: 'text-muted mb-1' },
          `Preview da decomposição com base no total agregado de ${totalVagas} vagas. A matriz curso-por-curso aparece no passo 4 (Vagas):`
        ),
        el(
          'div',
          { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.25rem 1rem' },
          el('span', {}, `AC: ${dist.ac}`),
          el('span', {}, `LB_PPI: ${dist.lb_ppi}`),
          el('span', {}, `LB_Q: ${dist.lb_q}`),
          el('span', {}, `LB_PcD: ${dist.lb_pcd}`),
          el('span', {}, `LB_EP: ${dist.lb_ep}`),
          el('span', {}, `LI_PPI: ${dist.li_ppi}`),
          el('span', {}, `LI_Q: ${dist.li_q}`),
          el('span', {}, `LI_PcD: ${dist.li_pcd}`),
          el('span', {}, `LI_EP: ${dist.li_ep}`)
        )
      )
    );
  } else {
    box.appendChild(
      el('div', { class: 'text-muted text-small' }, 'Adicione cursos no passo 4 (Vagas) para ver o preview da decomposição.')
    );
  }

  return box;
}
