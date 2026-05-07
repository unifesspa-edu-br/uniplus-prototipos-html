// visualizar-edital.js — render readable do edital publicado (consome snapshot RN08).

import { Collection, Keys } from './storage.js';
import { Toast } from './toast.js';
import { el, badge } from './dom.js';
import { exportAsJson } from './snapshot.js';
import { cloneFromEditalPublicado } from './clone.js';

const PUBLICADOS = new Collection(Keys.EDITAIS_PUBLICADO);
const RASCUNHOS = new Collection(Keys.EDITAIS_RASCUNHO);

const NOMES_AGREGACAO = {
  MEDIA_PONDERADA: 'Média Ponderada — Σ(nota×peso) / Σ pesos',
  SOMA_PONDERADA_COM_FATOR: 'Soma Ponderada com Fator — Σ(nota×peso) / fator',
  MEDIA_SIMPLES: 'Média Simples — Σ nota / N etapas',
  MEDIA_PONDERADA_ENEM: 'Média Ponderada ENEM — pesos por área + grupo de curso',
};

const NOMES_PRECISAO = {
  TRUNCAR_2_CASAS: 'Truncar 2 casas decimais',
  ARREDONDAR_PARA_CIMA_2_CASAS_SE_3A_GTE_5: 'Arredondar para cima 2 casas se 3ª ≥ 5',
};

const NOMES_PERIODO = { '1S': '1º semestre', '2S': '2º semestre' };

function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch {
    return s;
  }
}

function fmtRange(r) {
  if (!r || (!r.inicio && !r.fim)) return '—';
  return `${fmtDate(r.inicio)} a ${fmtDate(r.fim)}`;
}

function section(titulo, ...children) {
  return el(
    'section',
    {
      style:
        'background: white; border: 1px solid var(--color-secondary-04, #ccc); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem',
    },
    el(
      'h2',
      {
        style:
          'font-size: 1.125rem; font-weight: 600; color: var(--color-primary-default); margin: 0 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-secondary-02)',
      },
      titulo
    ),
    ...children
  );
}

function infoGrid(pairs) {
  const grid = el(
    'div',
    { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem 1.5rem' }
  );
  for (const [label, value] of pairs) {
    grid.appendChild(
      el(
        'div',
        {},
        el('div', { class: 'text-small text-muted' }, label),
        el('div', { style: 'font-weight: 500' }, value == null || value === '' ? '—' : String(value))
      )
    );
  }
  return grid;
}

function tabela(cols, rows, opts = {}) {
  if (!rows || rows.length === 0) {
    return el('p', { class: 'text-muted text-small' }, opts.empty || 'Nenhum registro.');
  }
  const wrap = el('div', { class: 'table-wrapper' });
  const table = el('table', { class: 'data-table' });
  const thead = el(
    'thead',
    {},
    el('tr', {}, ...cols.map((c) => el('th', { style: c.width ? `width: ${c.width}` : '' }, c.label)))
  );
  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const c of cols) {
      const v = c.render ? c.render(row) : row[c.key];
      const cell = v == null || v === '' ? el('span', { class: 'text-muted' }, '—') : v;
      tr.appendChild(el('td', {}, typeof cell === 'string' ? document.createTextNode(cell) : cell));
    }
    tbody.appendChild(tr);
  }
  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderHeaderEdital(snapshot, hash, publicadoEm) {
  const ident = snapshot.identificacao || {};
  const tipo = snapshot.tipo || {};

  return el(
    'div',
    {
      style:
        'background: linear-gradient(135deg, #1351b4 0%, #0c4194 100%); color: white; border-radius: 8px; padding: 2rem; margin-bottom: 1.5rem',
    },
    el(
      'div',
      { style: 'display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap' },
      el(
        'div',
        {},
        el(
          'div',
          { style: 'display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem' },
          el('span', { class: 'tag tag-success' }, '✓ Publicado'),
          el(
            'span',
            { class: 'tag', style: 'background: rgba(255,255,255,0.2); color: white' },
            tipo.codigo || '?'
          )
        ),
        el(
          'h1',
          { style: 'font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem; color: white' },
          ident.nomeProcesso || `Edital ${ident.numero}/${ident.ano}`
        ),
        el(
          'div',
          { style: 'font-size: 0.875rem; opacity: 0.85' },
          `Edital ${ident.numero || '?'}/${ident.ano || '?'} · ${ident.sigla || '?'} · publicado em ${new Date(publicadoEm).toLocaleString('pt-BR')}`
        )
      ),
      el(
        'div',
        { style: 'text-align: right; font-size: 0.75rem; opacity: 0.85' },
        el('div', {}, 'Hash sha256 do snapshot'),
        el('code', { style: 'font-family: monospace; font-size: 0.7rem; word-break: break-all' }, (hash || '').substring(0, 16) + '…')
      )
    )
  );
}

function renderActions(item, snapshot) {
  return el(
    'div',
    { style: 'display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem' },
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary',
        on: { click: () => exportAsJson(snapshot, item.hash) },
      },
      '💾 Exportar JSON'
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary',
        on: {
          click: () => {
            try {
              const novo = cloneFromEditalPublicado(item.id);
              RASCUNHOS.upsert(novo);
              Toast.success('Rascunho criado a partir deste edital. Revise datas e número.');
              setTimeout(() => (window.location.href = `editais-novo.html?id=${novo.id}`), 500);
            } catch (e) {
              Toast.error(e.message);
            }
          },
        },
      },
      '📑 Clonar para novo edital'
    ),
    el(
      'a',
      { href: 'editais.html', class: 'btn btn-ghost' },
      '← Voltar para lista'
    )
  );
}

function renderIdentificacao(snapshot) {
  const ident = snapshot.identificacao || {};
  return section(
    '📋 Identificação',
    infoGrid([
      ['Número do edital', ident.numero ? `${ident.numero}/${ident.ano}` : null],
      ['Data do edital', fmtDate(ident.dataEdital)],
      ['Sigla', ident.sigla],
      ['Ano de ingresso', ident.anoIngresso],
      ['Período de ingresso', NOMES_PERIODO[ident.periodoIngresso] || ident.periodoIngresso],
      [
        'PDF do edital',
        ident.pdf
          ? `${ident.pdf.nome} (${(ident.pdf.tamanho / 1024).toFixed(1)} KB)`
          : '—',
      ],
    ])
  );
}

function renderCronograma(snapshot) {
  const c = snapshot.cronograma || {};
  const labels = {
    inscricao: 'Inscrição',
    cartao: 'Cartão de inscrição',
    prova: 'Prova',
    homologacao: 'Homologação',
    recursoHomologacao: 'Recurso de homologação',
    classificacao: 'Classificação',
    recursoClassificacao: 'Recurso de classificação',
    habilitacao: 'Habilitação',
    recursoHabilitacao: 'Recurso de habilitação',
    confirmacaoInteresse: 'Confirmação de interesse',
  };
  const rows = Object.entries(labels)
    .filter(([key]) => c[key] && (c[key].inicio || c[key].fim))
    .map(([key, label]) => ({ janela: label, periodo: fmtRange(c[key]) }));

  return section(
    '📅 Cronograma',
    tabela(
      [
        { label: 'Janela', key: 'janela' },
        { label: 'Período', key: 'periodo' },
      ],
      rows,
      { empty: 'Nenhuma data informada.' }
    )
  );
}

function renderVagasModalidades(snapshot) {
  const vagas = snapshot.vagas || [];
  const modalidades = snapshot.modalidades || [];
  const totalVagas = vagas.reduce((s, v) => s + (v.vagas || 0), 0);

  return section(
    '🎯 Vagas e modalidades',
    el(
      'div',
      { class: 'mb-4', style: 'display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center' },
      el('strong', {}, `Total de vagas: ${totalVagas}`),
      el('span', { class: 'text-muted' }, '·'),
      el('span', {}, `${modalidades.length} modalidade(s)`),
      snapshot.concorrencia_dupla ? badge('Concorrência dupla', 'success') : null
    ),
    el('h3', { style: 'font-size: 0.875rem; font-weight: 600; margin: 1rem 0 0.5rem' }, 'Quadro de vagas (Anexo I)'),
    tabela(
      [
        { label: 'Curso', key: 'curso' },
        { label: 'Campus', key: 'campus' },
        { label: 'Turno', key: 'turno' },
        { label: 'Vagas', key: 'vagas', width: '80px' },
      ],
      vagas
    ),
    el('h3', { style: 'font-size: 0.875rem; font-weight: 600; margin: 1.5rem 0 0.5rem' }, 'Modalidades de concorrência'),
    tabela(
      [
        { label: 'Código', key: 'codigo', width: '110px' },
        { label: 'Nome', key: 'nome_completo' },
        {
          label: 'Requisitos',
          render: (m) => {
            const tags = [];
            if (m.exige_heteroidentificacao) tags.push(badge('Heteroid.', 'warning'));
            if (m.exige_comprovacao_renda) tags.push(badge('Renda', 'info'));
            if (m.exige_laudo_pcd) tags.push(badge('Laudo PcD', 'info'));
            if (m.exige_declaracao_quilombola) tags.push(badge(`${m.liderancas_minimas} lid.`, 'info'));
            return tags.length > 0
              ? el('div', { style: 'display: flex; gap: 0.25rem; flex-wrap: wrap' }, ...tags)
              : '—';
          },
        },
        { label: 'Base legal', render: (m) => el('span', { class: 'text-small' }, m.base_legal) },
      ],
      modalidades
    )
  );
}

function renderEtapas(snapshot) {
  const etapas = snapshot.etapas || [];
  const formula = snapshot.formula || {};

  return section(
    '📝 Etapas e fórmula de cálculo',
    el(
      'div',
      { style: 'background: var(--color-secondary-01); padding: 0.875rem 1rem; border-radius: 4px; margin-bottom: 1rem' },
      el(
        'div',
        { class: 'text-small text-muted', style: 'margin-bottom: 0.25rem' },
        'Agregação'
      ),
      el('div', { style: 'font-weight: 500' }, NOMES_AGREGACAO[formula.agregacao] || formula.agregacao || '—'),
      formula.fator
        ? el('div', { class: 'text-small text-muted', style: 'margin-top: 0.5rem' }, `Fator de divisão: ${formula.fator}`)
        : null,
      el(
        'div',
        { class: 'text-small text-muted', style: 'margin-top: 0.5rem' },
        `Precisão: ${NOMES_PRECISAO[formula.precisao] || formula.precisao || '—'}`
      )
    ),
    tabela(
      [
        { label: '#', key: 'ordem', width: '50px' },
        {
          label: 'Categoria',
          render: (e) => {
            const cat = e.tipo?.categoria;
            if (cat === 'ADMINISTRATIVA') return badge('Adm', 'info');
            if (cat === 'AVALIATIVA') return badge('Aval', 'success');
            if (cat === 'IMPORTACAO_AUTOMATICA') return badge('Imp', 'warning');
            return '—';
          },
          width: '90px',
        },
        {
          label: 'Etapa',
          render: (e) => e.nome_customizado || e.tipo?.nome || e.tipo?.codigo || '?',
        },
        {
          label: 'Janela',
          render: (e) => {
            const jIni = fmtDate(e.janela?.inicio);
            const jFim = fmtDate(e.janela?.fim);
            return jIni === jFim ? jIni : `${jIni} a ${jFim}`;
          },
          width: '180px',
        },
        {
          label: 'Recurso',
          render: (e) =>
            e.recurso && e.recurso.inicio
              ? `${fmtDate(e.recurso.inicio)} a ${fmtDate(e.recurso.fim)}`
              : '—',
          width: '180px',
        },
        {
          label: 'Peso',
          render: (e) => (e.peso != null ? e.peso : '—'),
          width: '60px',
        },
        {
          label: 'Nota mín.',
          render: (e) => (e.nota_minima != null ? e.nota_minima : '—'),
          width: '90px',
        },
        {
          label: 'Eliminatória?',
          render: (e) => (e.eliminatoria ? badge('Sim', 'warning') : '—'),
          width: '110px',
        },
      ],
      etapas
    )
  );
}

function renderBonus(snapshot) {
  const bonus = snapshot.bonus;
  if (!bonus || !bonus.habilitado) {
    return section('⭐ Bônus', el('p', { class: 'text-muted' }, 'Sem bônus aplicável a este edital.'));
  }
  return section(
    '⭐ Bônus',
    infoGrid([
      ['Tipo', bonus.tipo === 'ADITIVO' ? 'Aditivo (nota + valor×nota)' : 'Multiplicativo (nota × (1+valor))'],
      ['Valor', bonus.valor != null ? `${(bonus.valor * 100).toFixed(0)}%` : '—'],
      ['Modalidades aplicáveis', (bonus.modalidades_aplicaveis || []).join(', ') || '—'],
      ['Critério de elegibilidade', bonus.criterio_elegibilidade || '—'],
    ])
  );
}

function renderDesempate(snapshot) {
  const desempate = snapshot.desempate || [];
  return section(
    '⚖️ Critérios de desempate',
    desempate.length === 0
      ? el('p', { class: 'text-muted' }, 'Nenhum critério configurado.')
      : el(
          'ol',
          { style: 'list-style: none; padding: 0; margin: 0' },
          ...desempate.map((d) =>
            el(
              'li',
              {
                style:
                  'background: var(--color-secondary-01); border-left: 4px solid var(--color-primary-default); padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-radius: 0 4px 4px 0',
              },
              el(
                'div',
                { style: 'display: flex; gap: 0.5rem; align-items: center' },
                el('span', { class: 'tag tag-info' }, `${d.ordem}º`),
                el('strong', {}, d.criterio?.nome || d.criterio?.codigo || '?')
              ),
              d.criterio?.base_legal
                ? el('div', { class: 'text-small text-muted', style: 'margin-top: 0.25rem; margin-left: 2.5rem' }, d.criterio.base_legal)
                : null,
              d.etapa_referencia
                ? el(
                    'div',
                    { class: 'text-small', style: 'margin-top: 0.25rem; margin-left: 2.5rem' },
                    `Referência: etapa ${d.etapa_referencia}`
                  )
                : null
            )
          )
        )
  );
}

function renderEliminacao(snapshot) {
  const e = snapshot.eliminacao || {};
  const clausulas = e.clausulas || [];
  return section(
    '🚫 Eliminação',
    clausulas.length === 0
      ? el('p', { class: 'text-muted' }, 'Nenhuma cláusula configurada.')
      : el(
          'div',
          { style: 'display: flex; gap: 0.5rem; flex-wrap: wrap' },
          ...clausulas.map((c) => el('span', { class: 'tag tag-danger' }, c))
        )
  );
}

function renderDocumentos(snapshot) {
  const docs = snapshot.documentos_por_modalidade || [];
  if (docs.length === 0) {
    return section('📄 Documentos por modalidade', el('p', { class: 'text-muted' }, 'Nenhum documento configurado.'));
  }

  // Agrupa por modalidade
  const porModalidade = new Map();
  for (const d of docs) {
    if (!porModalidade.has(d.modalidade)) porModalidade.set(d.modalidade, []);
    porModalidade.get(d.modalidade).push(d);
  }

  const conteudo = el('div');
  for (const [mod, items] of porModalidade) {
    conteudo.appendChild(
      el(
        'div',
        { style: 'margin-bottom: 1rem' },
        el('h3', { style: 'font-size: 0.875rem; font-weight: 600; margin: 0 0 0.5rem' }, `Modalidade ${mod}`),
        el(
          'ul',
          { style: 'list-style: none; padding: 0; margin: 0; display: flex; gap: 0.375rem; flex-wrap: wrap' },
          ...items.map((d) =>
            el(
              'li',
              {
                style: `background: ${d.obrigatorio ? '#fff8e1' : 'var(--color-secondary-01)'}; padding: 0.375rem 0.75rem; border-radius: 4px; font-size: 0.8125rem; border: 1px solid ${d.obrigatorio ? '#fdb913' : 'var(--color-secondary-04)'}`,
              },
              d.documento?.nome || d.documento?.codigo || '?',
              d.obrigatorio ? el('span', { style: 'margin-left: 0.25rem; color: #b8860b' }, '*') : null
            )
          )
        )
      )
    );
  }
  conteudo.appendChild(
    el(
      'p',
      { class: 'text-small text-muted', style: 'margin-top: 0.5rem' },
      el('span', { style: 'color: #b8860b' }, '*'),
      ' Documento obrigatório para a modalidade.'
    )
  );

  return section('📄 Documentos por modalidade', conteudo);
}

function renderLocais(snapshot) {
  const locais = snapshot.locais || [];
  return section(
    '📍 Locais de prova',
    tabela(
      [
        { label: 'Local', render: (l) => l.local?.nome || l.local?.codigo || '?' },
        { label: 'Município', render: (l) => `${l.local?.municipio || ''}/${l.local?.uf || ''}`.replace(/^\/+|\/+$/g, '') },
        { label: 'Capacidade', key: 'capacidade_neste_edital', width: '110px' },
        {
          label: 'Sessões',
          render: (l) => `${(l.sessoes || []).length} sessão(ões)`,
          width: '120px',
        },
      ],
      locais,
      { empty: 'Nenhum local configurado.' }
    )
  );
}

function renderAtendimento(snapshot) {
  const atendimento = snapshot.atendimento_especial || [];
  return section(
    '♿ Atendimento especial',
    atendimento.length === 0
      ? el('p', { class: 'text-muted' }, 'Nenhuma necessidade configurada.')
      : el(
          'div',
          { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.75rem' },
          ...atendimento.map((a) =>
            el(
              'div',
              {
                style:
                  'background: var(--color-secondary-01); padding: 0.75rem 1rem; border-radius: 4px; border-left: 3px solid var(--color-primary-default)',
              },
              el('strong', {}, a.necessidade?.nome || a.necessidade?.codigo),
              a.recursos_disponibilizados?.length
                ? el(
                    'div',
                    { style: 'margin-top: 0.375rem; display: flex; gap: 0.25rem; flex-wrap: wrap' },
                    ...a.recursos_disponibilizados.map((r) => el('span', { class: 'tag', style: 'font-size: 0.7rem' }, r))
                  )
                : null
            )
          )
        )
  );
}

function renderObrigatoriedades(snapshot) {
  const regras = snapshot.obrigatoriedades_avaliadas || [];
  if (regras.length === 0) return null;

  const atendidas = regras.filter((r) => r.atendida).length;
  return section(
    `⚖️ Validações legais avaliadas (${atendidas}/${regras.length} atendidas)`,
    el(
      'ul',
      { style: 'list-style: none; padding: 0; margin: 0' },
      ...regras.map((r) =>
        el(
          'li',
          {
            style: 'display: flex; gap: 0.75rem; padding: 0.625rem 0; border-bottom: 1px solid var(--color-secondary-02); align-items: flex-start',
          },
          el('span', { style: 'font-size: 1.125rem; flex-shrink: 0' }, r.atendida ? '✅' : '⚠️'),
          el(
            'div',
            { style: 'flex: 1' },
            el('div', { style: 'font-weight: 500; font-size: 0.875rem' }, r.regra.descricao_humana),
            el('div', { class: 'text-small text-muted', style: 'font-style: italic' }, r.regra.base_legal)
          )
        )
      )
    )
  );
}

function renderEdital(item) {
  const snapshot = item.snapshot;
  const root = document.getElementById('edital-content');
  root.innerHTML = '';

  document.title = `Uni+ · ${snapshot.identificacao?.nomeProcesso || 'Edital'}`;
  const crumb = document.getElementById('crumb-current');
  if (crumb) {
    crumb.textContent = `${snapshot.identificacao?.numero || '?'}/${snapshot.identificacao?.ano || '?'}`;
  }

  root.appendChild(renderHeaderEdital(snapshot, item.hash, item.publicadoEm));
  root.appendChild(renderActions(item, snapshot));
  root.appendChild(renderIdentificacao(snapshot));
  root.appendChild(renderCronograma(snapshot));
  root.appendChild(renderVagasModalidades(snapshot));
  root.appendChild(renderEtapas(snapshot));
  root.appendChild(renderBonus(snapshot));
  root.appendChild(renderDesempate(snapshot));
  root.appendChild(renderEliminacao(snapshot));
  root.appendChild(renderDocumentos(snapshot));
  root.appendChild(renderLocais(snapshot));
  root.appendChild(renderAtendimento(snapshot));
  const obrig = renderObrigatoriedades(snapshot);
  if (obrig) root.appendChild(obrig);
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const root = document.getElementById('edital-content');

  if (!id) {
    root.innerHTML = '';
    root.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '❓'),
        el('p', {}, 'Nenhum edital especificado.'),
        el('a', { class: 'btn btn-primary mt-4', href: 'editais.html' }, 'Voltar para a lista')
      )
    );
    return;
  }

  const item = PUBLICADOS.byId(id);
  if (!item) {
    root.innerHTML = '';
    root.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '🚫'),
        el('p', {}, 'Edital publicado não encontrado.'),
        el('a', { class: 'btn btn-primary mt-4', href: 'editais.html' }, 'Voltar para a lista')
      )
    );
    return;
  }

  renderEdital(item);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
