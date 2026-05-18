// Passo 10: Documentos — define quais documentos compõem a lista deste edital,
// em quais etapas cada um é obrigatório e a quais modalidades se aplica.
//
// Modelo de dados (state.edital.documentos):
//   [
//     {
//       tipoDocumentoCodigo: 'RG',
//       incluido: true,                                     // false = não faz parte do edital
//       modalidades: ['AC', 'V', 'LB_PPI'],                  // modalidades que devem entregar
//       etapasObrigatorias: ['INSCRICAO_CANDIDATOS']         // [] = todas as etapas do edital
//     }
//   ]

import { Collection, Keys } from '../storage.js';
import { el, checkbox, badge } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const tiposDisponiveis = new Collection(Keys.TIPOS_DOCUMENTO).list({ includeInactive: false });
  const modalidadesEdital = state.edital.distribuicaoModalidades?.modalidades || [];
  const etapasEdital = (state.edital.etapas || []).filter((e) => e.tipoEtapaCodigo);

  function findEntry(tipoCod) {
    return (state.edital.documentos || []).find((d) => d.tipoDocumentoCodigo === tipoCod);
  }

  function upsertEntry(tipoCod, patch) {
    const docs = state.edital.documentos || [];
    const idx = docs.findIndex((d) => d.tipoDocumentoCodigo === tipoCod);
    const base = idx >= 0
      ? docs[idx]
      : { tipoDocumentoCodigo: tipoCod, incluido: false, modalidades: [], etapasObrigatorias: [] };
    const novo = { ...base, ...patch };
    const novos = idx >= 0
      ? docs.map((d, i) => (i === idx ? novo : d))
      : [...docs, novo];
    updateState({ documentos: novos });
    avaliarStatus();
  }

  function avaliarStatus() {
    const docs = state.edital.documentos || [];
    const incluidos = docs.filter((d) => d.incluido);
    if (incluidos.length === 0) {
      setStepStatus('pendente');
      return;
    }
    // Atenção se algum incluído está sem modalidade configurada.
    const incompleto = incluidos.some((d) => !d.modalidades || d.modalidades.length === 0);
    setStepStatus(incompleto ? 'emProgresso' : 'concluido');
  }

  container.innerHTML = '';
  container.appendChild(
    el(
      'p',
      { class: 'text-muted mb-4' },
      'Monte a lista de documentos exigidos por este edital. Para cada documento, indique ',
      el('strong', {}, 'em quais etapas '),
      'ele é obrigatório e ',
      el('strong', {}, 'quais modalidades '),
      'precisam entregá-lo. Documentos não incluídos aparecem com aviso e não fazem parte da documentação.'
    )
  );

  if (modalidadesEdital.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Configure as modalidades no passo 4 primeiro.'));
    return;
  }

  if (etapasEdital.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Configure as etapas no passo 5 primeiro.'));
    return;
  }

  if (tiposDisponiveis.length === 0) {
    container.appendChild(el('p', { class: 'text-muted' }, 'Cadastre tipos de documento primeiro.'));
    return;
  }

  // Resumo no topo
  const docs = state.edital.documentos || [];
  const totalIncluidos = docs.filter((d) => d.incluido).length;
  const totalExcluidos = tiposDisponiveis.length - totalIncluidos;
  container.appendChild(
    el(
      'div',
      {
        style:
          'display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 6px',
      },
      el('span', {}, el('strong', {}, totalIncluidos), ' incluídos no edital'),
      el('span', { class: 'text-muted' }, '·'),
      el('span', { class: 'text-muted' }, el('strong', {}, totalExcluidos), ' fora da documentação')
    )
  );

  // Ações em massa
  const acoes = el('div', { class: 'flex gap-2 mb-4', style: 'flex-wrap: wrap' });
  acoes.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary btn-small',
        on: {
          click: () => {
            const todas = modalidadesEdital;
            const todos = tiposDisponiveis.map((t) => {
              const existente = findEntry(t.codigo);
              return {
                tipoDocumentoCodigo: t.codigo,
                incluido: true,
                modalidades: existente?.modalidades?.length ? existente.modalidades : [...todas],
                etapasObrigatorias: existente?.etapasObrigatorias || [],
              };
            });
            updateState({ documentos: todos });
            render(container, ctx);
          },
        },
      },
      '✓ Incluir todos'
    )
  );
  acoes.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-small',
        on: {
          click: () => {
            if (!confirm('Marcar todos os documentos como não incluídos?')) return;
            const todos = tiposDisponiveis.map((t) => {
              const existente = findEntry(t.codigo);
              return {
                tipoDocumentoCodigo: t.codigo,
                incluido: false,
                modalidades: existente?.modalidades || [],
                etapasObrigatorias: existente?.etapasObrigatorias || [],
              };
            });
            updateState({ documentos: todos });
            render(container, ctx);
          },
        },
      },
      '✗ Limpar lista'
    )
  );
  container.appendChild(acoes);

  // Agrupa por categoria
  const porCategoria = new Map();
  for (const t of tiposDisponiveis) {
    const cat = t.categoria || 'OUTROS';
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat).push(t);
  }

  for (const [categoria, tipos] of porCategoria) {
    const wrap = el('div', { class: 'mb-4' });
    wrap.appendChild(
      el(
        'h3',
        {
          style:
            'font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); margin: 1rem 0 0.5rem',
        },
        categoria
      )
    );

    for (const tipo of tipos) {
      wrap.appendChild(
        renderDocumentoCard(tipo, findEntry(tipo.codigo), modalidadesEdital, etapasEdital, upsertEntry, () =>
          render(container, ctx)
        )
      );
    }

    container.appendChild(wrap);
  }

  avaliarStatus();
}

function renderDocumentoCard(tipo, entry, modalidadesEdital, etapasEdital, upsertEntry, rerender) {
  const incluido = !!entry?.incluido;
  const modalidades = entry?.modalidades || [];
  const etapasObrig = entry?.etapasObrigatorias || []; // [] = todas
  const todasEtapas = etapasObrig.length === 0;

  const card = el('div', {
    style: `background: var(--bg-surface); border: 1px solid ${
      incluido ? 'var(--border-default)' : 'var(--border-subtle)'
    }; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; ${
      incluido ? '' : 'opacity: 0.6;'
    } transition: opacity 0.15s, border-color 0.15s`,
  });

  // Header: toggle + nome + badge de status
  const header = el(
    'div',
    { class: 'flex-between mb-2', style: 'align-items: flex-start; gap: 0.75rem; flex-wrap: wrap' }
  );

  const headerLeft = el(
    'div',
    { style: 'flex: 1; min-width: 240px' },
    checkbox(
      el('strong', {}, tipo.nome),
      incluido,
      (val) => {
        upsertEntry(tipo.codigo, {
          incluido: val,
          // Ao incluir pela primeira vez, sugere todas as modalidades do edital
          modalidades:
            val && (!entry || entry.modalidades.length === 0)
              ? [...modalidadesEdital]
              : entry?.modalidades || [],
          etapasObrigatorias: entry?.etapasObrigatorias || [],
        });
        rerender();
      }
    ),
    tipo.descricao
      ? el(
          'div',
          { class: 'text-small text-muted', style: 'margin-top: 0.25rem; margin-left: 1.5rem' },
          tipo.descricao
        )
      : null
  );

  const statusBadge = incluido
    ? badge('Incluído', 'success')
    : el(
        'span',
        {
          class: 'tag',
          style:
            'background: var(--border-subtle); color: var(--text-secondary); border: 1px dashed var(--border-default)',
        },
        'Não faz parte do edital'
      );
  header.appendChild(headerLeft);
  header.appendChild(statusBadge);
  card.appendChild(header);

  // Se incluído, mostra as configurações
  if (incluido) {
    // Etapas obrigatórias (multi-select via checkboxes + opção "todas")
    const etapasWrap = el('div', { class: 'mt-3' });
    etapasWrap.appendChild(
      el(
        'label',
        { class: 'form-label', style: 'display: block; margin-bottom: 0.25rem' },
        'Em quais etapas é obrigatório?'
      )
    );
    etapasWrap.appendChild(
      el(
        'div',
        {
          class: 'form-help',
          style: 'margin-bottom: 0.5rem',
        },
        'Marque “Todas as etapas” para exigir o documento desde a inscrição até o resultado final, ou escolha apenas as etapas específicas (ex.: só na homologação).'
      )
    );

    const todasCb = el('label', {
      style:
        'display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.375rem 0.625rem; background: var(--info-bg); border-radius: 4px; margin-bottom: 0.5rem',
    });
    const todasInput = el('input', { type: 'checkbox' });
    if (todasEtapas) todasInput.setAttribute('checked', '');
    todasInput.addEventListener('change', () => {
      upsertEntry(tipo.codigo, {
        etapasObrigatorias: todasInput.checked ? [] : etapasEdital.map((e) => e.tipoEtapaCodigo),
      });
      rerender();
    });
    todasCb.appendChild(todasInput);
    todasCb.appendChild(document.createTextNode(' Todas as etapas do edital'));
    etapasWrap.appendChild(todasCb);

    // Lista individual (oculta visualmente quando "todas" está marcado, mas ainda renderiza para feedback)
    const listaEtapas = el(
      'div',
      {
        style: `display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.375rem; padding: 0.5rem 0.625rem; background: var(--bg-base); border-radius: 4px; ${
          todasEtapas ? 'opacity: 0.55' : ''
        }`,
      }
    );
    for (const etapa of etapasEdital) {
      const cod = etapa.tipoEtapaCodigo;
      const nomeEtapa = etapa.nomeCustomizado || cod;
      const marcadoIndividual = etapasObrig.includes(cod);
      const efetivamenteMarcado = todasEtapas || marcadoIndividual;
      const item = el('label', {
        style: 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem',
      });
      const cb = el('input', { type: 'checkbox' });
      if (efetivamenteMarcado) cb.setAttribute('checked', '');
      if (todasEtapas) cb.setAttribute('disabled', '');
      cb.addEventListener('change', () => {
        const atual = etapasObrig.slice();
        const novas = cb.checked
          ? [...new Set([...atual, cod])]
          : atual.filter((c) => c !== cod);
        upsertEntry(tipo.codigo, { etapasObrigatorias: novas });
        rerender();
      });
      item.appendChild(cb);
      item.appendChild(
        el(
          'span',
          {},
          el('strong', {}, `Etapa ${etapa.ordem}`),
          ' — ',
          nomeEtapa
        )
      );
      listaEtapas.appendChild(item);
    }
    etapasWrap.appendChild(listaEtapas);
    card.appendChild(etapasWrap);

    // Modalidades que devem entregar
    const modWrap = el('div', { class: 'mt-3' });
    modWrap.appendChild(
      el(
        'label',
        { class: 'form-label', style: 'display: block; margin-bottom: 0.25rem' },
        'Modalidades que devem entregar'
      )
    );
    const modGrid = el('div', {
      style:
        'display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.375rem',
    });
    for (const mod of modalidadesEdital) {
      const marcado = modalidades.includes(mod);
      const item = el('label', {
        style: 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem',
      });
      const cb = el('input', { type: 'checkbox' });
      if (marcado) cb.setAttribute('checked', '');
      cb.addEventListener('change', () => {
        const novas = cb.checked
          ? [...new Set([...modalidades, mod])]
          : modalidades.filter((m) => m !== mod);
        upsertEntry(tipo.codigo, { modalidades: novas });
        rerender();
      });
      item.appendChild(cb);
      item.appendChild(document.createTextNode(mod));
      modGrid.appendChild(item);
    }
    modWrap.appendChild(modGrid);
    if (modalidades.length === 0) {
      modWrap.appendChild(
        el(
          'div',
          { class: 'form-help', style: 'color: var(--warning-text); margin-top: 0.375rem' },
          '⚠ Nenhuma modalidade marcada — o documento não será exigido.'
        )
      );
    }
    card.appendChild(modWrap);
  }

  return card;
}
