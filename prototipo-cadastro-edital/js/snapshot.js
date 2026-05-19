// snapshot.js — geração do snapshot consolidado (RN08), hash sha256 e publicação.
//
// O snapshot é a cópia profunda do edital + todos as configurações referenciados
// no momento da publicação. Garante idempotência: alterações posteriores nos
// configurações não retroagem para editais já publicados.

import { Collection, Keys, randomUUID } from './storage.js';
import { Toast } from './toast.js';
import { el } from './dom.js';
import { validate } from './validator.js';

const RASCUNHOS = new Collection(Keys.EDITAIS_RASCUNHOS);
const PUBLICADOS = new Collection(Keys.EDITAIS_PUBLICADOS);
const MODELOS = new Collection(Keys.MODELOS);

// =====================================================
// Build snapshot
// =====================================================

function denormSingle(colecaoKey, predicate) {
  const items = new Collection(colecaoKey).list({ includeInactive: true });
  const item = items.find(predicate);
  return item ? omitMeta(item) : null;
}

// Sort determinístico por `codigo` (estável) faz parte do contrato de canonicalização
// do hash RN08: evita drift quando a ordem dos itens em localStorage muda devido a
// edições/criações posteriores (Collection.list devolve na ordem física). Sem este
// sort, dois snapshots equivalentes em conteúdo poderiam ter hashes diferentes.
//
// Comparação byte-puro (ASCII/UTF-16 code units) em vez de localeCompare — o resultado
// é idêntico entre Node, Chrome, Firefox, Safari sem depender da implementação ICU do
// navegador. Códigos hoje são `[A-Z0-9_-]+` ASCII; o byte sort permanece estável se
// caracteres especiais aparecerem em F3.
function denormMany(colecaoKey, predicate) {
  const items = new Collection(colecaoKey).list({ includeInactive: true });
  return items
    .filter(predicate)
    .map(omitMeta)
    .sort((a, b) => {
      const ca = a.codigo || '';
      const cb = b.codigo || '';
      if (ca < cb) return -1;
      if (ca > cb) return 1;
      return 0;
    });
}

// `omitMeta` é shallow: remove apenas as chaves top-level `id`, `criadoEm`,
// `atualizadoEm` e `ativo`. Objetos aninhados (ex.: parametros de obrigatoriedades)
// preservam suas próprias chaves intactas. Não é destructuring recursivo.
function omitMeta(item) {
  const { id, criadoEm, atualizadoEm, ativo, ...rest } = item;
  return rest;
}

// Denormaliza Cidade com os 13 campos canônicos (12 enriquecidos + código).
// Usado tanto na denormalização de vagas (campus → cidade) quanto na lista de
// cidades de prova do edital, garantindo simetria entre os dois caminhos.
// `ibge_id` tem fallback para o legado `municipio_ibge_id` (snapshots antigos).
function denormalizeCidadeFull(cidadeDef) {
  if (!cidadeDef) return null;
  return {
    codigo: cidadeDef.codigo,
    nome: cidadeDef.nome,
    uf: cidadeDef.uf,
    ibge_id: cidadeDef.ibge_id ?? cidadeDef.municipio_ibge_id ?? null,
    ddd: cidadeDef.ddd ?? null,
    latitude: cidadeDef.latitude ?? null,
    longitude: cidadeDef.longitude ?? null,
    regiao: cidadeDef.regiao ?? null,
    mesorregiao: cidadeDef.mesorregiao ?? null,
    microrregiao: cidadeDef.microrregiao ?? null,
    populacao_residente: cidadeDef.populacao_residente ?? null,
    densidade_demografica: cidadeDef.densidade_demografica ?? null,
    area_territorial_km2: cidadeDef.area_territorial_km2 ?? null,
  };
}

export function buildSnapshot(state) {
  const ed = state.edital;

  return {
    versao_snapshot: 1,
    edital_uuid: state.id,

    tipo: ed.tipo
      ? denormSingle(Keys.TIPOS_EDITAL, (t) => t.codigo === ed.tipo.codigo)
      : null,

    identificacao: { ...ed.identificacao },

    unidade_dona: ed.identificacao?.unidadeDonaCodigo
      ? denormSingle(Keys.UNIDADES, (u) => u.codigo === ed.identificacao.unidadeDonaCodigo)
      : null,

    // Denormaliza cada vaga: resolve Curso → Campus → Cidade e Curso → Unidade ofertante.
    // O snapshot congela objetos completos (Campus com endereço/CEP/lat-long/cidade enriquecida;
    // Unidade ofertante com nome/sigla) para preservar dados na publicação (RN08) e evitar
    // que mudanças posteriores nos cadastros retroajam.
    vagas: (ed.vagas?.cursos || []).map((v) => {
      const cursoDef = denormSingle(Keys.CURSOS, (c) => c.codigo === v.cursoCodigo);
      const campusDefRaw = cursoDef
        ? denormSingle(Keys.CAMPUS, (c) => c.codigo === cursoDef.campus_codigo)
        : null;
      const cidadeDefRaw = campusDefRaw
        ? denormSingle(Keys.CIDADES, (c) => c.codigo === campusDefRaw.cidade_codigo)
        : null;
      const unidadeOfertanteDef = cursoDef?.unidade_ofertante_codigo
        ? denormSingle(Keys.UNIDADES, (u) => u.codigo === cursoDef.unidade_ofertante_codigo)
        : null;
      if (!cursoDef) {
        return { codigo: v.cursoCodigo || null, curso: '(não encontrado)', vagas: v.vagas || 0 };
      }
      // Sigla literal da unidade ofertante congelada no momento da publicação (RN08).
      // Fallback defensivo: se a Unidade for deletada posteriormente, o renderer ainda
      // pode mostrar a sigla via este campo top-level (ver `visualizar-edital.js`).
      const unidadeOfertanteSigla =
        unidadeOfertanteDef?.sigla || cursoDef?.unidade_ofertante_codigo || null;
      // Campus enriquecido (com cidade aninhada e enriquecida) — preserva todos os campos
      // relevantes para auditoria do edital publicado.
      const campusSnap = campusDefRaw
        ? {
            codigo: campusDefRaw.codigo,
            nome: campusDefRaw.nome,
            endereco: campusDefRaw.endereco ?? null,
            cep: campusDefRaw.cep ?? null,
            latitude: campusDefRaw.latitude ?? null,
            longitude: campusDefRaw.longitude ?? null,
            tipo_campus: campusDefRaw.tipo_campus ?? null,
            cidade: denormalizeCidadeFull(cidadeDefRaw),
          }
        : null;
      return {
        codigo: cursoDef.codigo,
        curso: cursoDef.nome,
        grau: cursoDef.grau,
        // Mantém campos de texto curtos para retrocompatibilidade com renders existentes.
        campus: campusDefRaw?.nome || cursoDef.campus_codigo,
        cidade_campus: cidadeDefRaw?.nome || null,
        // Objetos completos preservam todos os dados na publicação (RN08).
        campus_snap: campusSnap,
        unidade_ofertante: unidadeOfertanteDef
          ? {
              codigo: unidadeOfertanteDef.codigo,
              sigla: unidadeOfertanteDef.sigla,
              nome: unidadeOfertanteDef.nome,
              tipo: unidadeOfertanteDef.tipo ?? null,
            }
          : null,
        // Fallback literal top-level: preserva sigla mesmo se a Unidade for excluída
        // após a publicação. `visualizar-edital.js` lê este campo quando `unidade_ofertante`
        // é null.
        unidade_ofertante_sigla: unidadeOfertanteSigla,
        turno: cursoDef.turno,
        vagas: v.vagas || 0,
      };
    }),

    modalidades: denormMany(Keys.MODALIDADES, (m) =>
      (ed.distribuicaoModalidades?.modalidades || []).includes(m.codigo)
    ),

    concorrencia_dupla: ed.distribuicaoModalidades?.concorrenciaDupla || false,

    // RN08: percentuais IBGE congelados no momento da publicação. Mudanças posteriores
    // na configuração `percentuais-ibge` NÃO retroagem para este snapshot.
    percentuais_ibge: ed.distribuicaoModalidades?.percentuaisIbgeCodigo
      ? denormSingle(Keys.PERCENTUAIS_IBGE, (p) => p.codigo === ed.distribuicaoModalidades.percentuaisIbgeCodigo)
      : null,

    // RN08: estratégia de balanceamento congelada no momento da publicação.
    estrategia_balanceamento: ed.distribuicaoModalidades?.estrategiaBalanceamentoCodigo
      ? denormSingle(Keys.ESTRATEGIAS_BALANCEAMENTO, (r) => r.codigo === ed.distribuicaoModalidades.estrategiaBalanceamentoCodigo)
      : null,

    // RN08: cascata de remanejamento congelada no momento da publicação.
    cascata_remanejamento: ed.distribuicaoModalidades?.cascataRemanejamentoCodigo
      ? denormSingle(Keys.CASCATAS_REMANEJAMENTO, (c) => c.codigo === ed.distribuicaoModalidades.cascataRemanejamentoCodigo)
      : null,

    etapas: (ed.etapas || []).map((e) => {
      const tipoSnap = denormSingle(Keys.TIPOS_ETAPA, (t) => t.codigo === e.tipoEtapaCodigo);
      const isAvaliativa = tipoSnap?.categoria === 'AVALIATIVA';
      return {
        ordem: e.ordem,
        tipo: tipoSnap,
        nome_customizado: e.nomeCustomizado || null,
        janela: {
          inicio: e.janelaInicio,
          fim: e.janelaFim,
        },
        recurso: e.recurso ? { inicio: e.recurso.inicio, fim: e.recurso.fim } : null,
        // Campos avaliativos só fazem sentido para etapas avaliativas
        peso: isAvaliativa ? e.peso : null,
        nota_minima: isAvaliativa ? e.notaMinima : null,
        eliminatoria: isAvaliativa ? !!e.eliminatoria : false,
        pertence_calculo:
          tipoSnap?.categoria === 'AVALIATIVA' ||
          tipoSnap?.categoria === 'IMPORTACAO_AUTOMATICA'
            ? e.pertenceCalculo !== false
            : false,
      };
    }),

    formula: { ...ed.formula },

    bonus: ed.bonus?.habilitado ? { ...ed.bonus } : null,

    desempate: (ed.desempate || []).map((d, idx) => {
      const def = denormSingle(Keys.CRITERIOS_DESEMPATE, (c) => c.codigo === d.codigo);
      return {
        ordem: idx + 1,
        criterio: def,
        etapa_referencia: d.etapaReferencia || null,
      };
    }),

    eliminacao: { ...ed.eliminacao },

    // Lista plana de documentos do edital (apenas os incluídos). Cada entrada traz
    // as modalidades que devem entregar e as etapas (denormalizadas) em que o
    // documento é obrigatório — [] = obrigatório em todas as etapas do edital.
    documentos: (ed.documentos || [])
      .filter((d) => d.incluido)
      .map((d) => {
        const def = denormSingle(Keys.TIPOS_DOCUMENTO, (t) => t.codigo === d.tipoDocumentoCodigo);
        const etapasObrig = (d.etapasObrigatorias || [])
          .map((codigo) => {
            const etapa = (ed.etapas || []).find((e) => e.tipoEtapaCodigo === codigo);
            if (!etapa) return null;
            return {
              tipo_etapa_codigo: codigo,
              ordem: etapa.ordem,
              nome: etapa.nomeCustomizado || null,
            };
          })
          .filter(Boolean);
        return {
          documento: def,
          modalidades: [...(d.modalidades || [])],
          etapas_obrigatorias: etapasObrig,
          todas_etapas: (d.etapasObrigatorias || []).length === 0,
        };
      }),

    // Cidades onde o candidato pode optar por fazer a prova na inscrição, com a lista
    // de cursos do edital que aceitam prova em cada cidade. Denormaliza Cidade completa
    // (13 campos: ibge_id, ddd, latitude, longitude, regiao, mesorregiao, microrregiao,
    // populacao_residente, densidade_demografica, area_territorial_km2 + nome/UF/código) e
    // Campus completo (endereco/cep/lat/long/tipo_campus/cidade aninhada). O local exato
    // (sala/prédio) é definido pelo módulo de ensalamento — fora do escopo.
    cidades: (ed.cidades || [])
      .map((entry) => {
        const cidade = denormSingle(Keys.CIDADES, (c) => c.codigo === entry.cidadeCodigo);
        if (!cidade) return null;
        const cursos = (entry.cursoCodigos || [])
          .map((codigo) => {
            const cursoDef = denormSingle(Keys.CURSOS, (c) => c.codigo === codigo);
            if (!cursoDef) return null;
            const campusCursoRaw = denormSingle(Keys.CAMPUS, (c) => c.codigo === cursoDef.campus_codigo);
            const cidadeCursoRaw = campusCursoRaw
              ? denormSingle(Keys.CIDADES, (c) => c.codigo === campusCursoRaw.cidade_codigo)
              : null;
            return {
              codigo: cursoDef.codigo,
              curso: cursoDef.nome,
              grau: cursoDef.grau,
              campus: campusCursoRaw?.nome || cursoDef.campus_codigo,
              cidade_campus: cidadeCursoRaw?.nome || null,
              campus_snap: campusCursoRaw
                ? {
                    codigo: campusCursoRaw.codigo,
                    nome: campusCursoRaw.nome,
                    endereco: campusCursoRaw.endereco ?? null,
                    cep: campusCursoRaw.cep ?? null,
                    latitude: campusCursoRaw.latitude ?? null,
                    longitude: campusCursoRaw.longitude ?? null,
                    tipo_campus: campusCursoRaw.tipo_campus ?? null,
                    // Mesmo formato (13 campos) que o utilizado em `vagas[].campus_snap.cidade`,
                    // via helper compartilhado — garante simetria entre os dois caminhos.
                    cidade: denormalizeCidadeFull(cidadeCursoRaw),
                  }
                : null,
              turno: cursoDef.turno,
            };
          })
          .filter(Boolean);
        return {
          cidade,
          cursos,
          capacidade_maxima: entry.capacidadeMaxima ?? null,
        };
      })
      .filter(Boolean),

    // RN08: a oferta de atendimento especializado é congelada na publicação.
    // - condicoes_aceitas: códigos de CondicaoAtendimentoEspecializado (item 4.2.1).
    // - deficiencias_aceitas: códigos de TipoDeficiencia (PcD — LBI).
    // - recursos_oferecidos: códigos de RecursoAcessibilidade (item 4.2.2 + extensões locais).
    // SolicitacaoAtendimentoEspecializado (workflow do candidato) é decisão de F3 — fora do escopo aqui.
    atendimento_especializado: {
      oferta: {
        condicoes_aceitas: (ed.atendimentoEspecializado?.oferta?.condicoes_aceitas || []).map((c) =>
          denormSingle(Keys.CONDICOES_ATENDIMENTO_ESPECIALIZADO, (d) => d.codigo === c)
        ).filter(Boolean),
        deficiencias_aceitas: (ed.atendimentoEspecializado?.oferta?.deficiencias_aceitas || []).map((c) =>
          denormSingle(Keys.TIPOS_DEFICIENCIA, (d) => d.codigo === c)
        ).filter(Boolean),
        recursos_oferecidos: (ed.atendimentoEspecializado?.oferta?.recursos_oferecidos || []).map((c) =>
          denormSingle(Keys.RECURSOS_ACESSIBILIDADE, (r) => r.codigo === c)
        ).filter(Boolean),
      },
    },

    obrigatoriedades_avaliadas: validate(state).aplicaveis.map((r) => ({
      regra: omitMeta(r.regra),
      atendida: r.atendida,
    })),
  };
}

// =====================================================
// Canonicalização e hash
// =====================================================

/** Serialização determinística — chaves ordenadas recursivamente. */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k]))
      .join(',') +
    '}'
  );
}

export async function computeHash(snapshot) {
  const canonical = canonicalStringify(snapshot);
  const buffer = new TextEncoder().encode(canonical);
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// =====================================================
// Publicação
// =====================================================

export async function publish(state) {
  const snapshot = buildSnapshot(state);
  const hash = await computeHash(snapshot);

  const publicado = {
    id: randomUUID(),
    rascunhoId: state.id,
    snapshot,
    hash,
    publicadoEm: new Date().toISOString(),
    status: 'publicado',
  };
  PUBLICADOS.upsert(publicado);

  // Marca rascunho como publicado (mantém histórico)
  state.status = 'publicado';
  state.publicadoEm = publicado.publicadoEm;
  state.snapshotHash = hash;
  RASCUNHOS.upsert(state);

  return publicado;
}

export async function saveAsModel(state, nome) {
  const snapshot = buildSnapshot(state);
  // Sanitiza: limpa identificação, datas das etapas, vagas
  const sanitized = {
    ...snapshot,
    identificacao: {
      sigla: snapshot.identificacao?.sigla || 'CEPS/UNIFESSPA',
    },
    vagas: [],
    etapas: (snapshot.etapas || []).map((e) => ({
      ...e,
      janela: { inicio: null, fim: null },
      recurso: e.recurso ? { inicio: null, fim: null } : null,
    })),
  };
  delete sanitized.edital_uuid;

  const modelo = {
    id: randomUUID(),
    nome,
    tipo_edital_codigo: snapshot.tipo?.codigo,
    snapshot: sanitized,
    criadoEm: new Date().toISOString(),
    ativo: true,
  };
  MODELOS.upsert(modelo);
  return modelo;
}

export function exportAsJson(snapshot, hash) {
  const data = { hash, snapshot };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ident = snapshot.identificacao || {};
  a.href = url;
  a.download = `edital-${ident.numero || 'sem-numero'}-${ident.ano || 'sem-ano'}-${hash.substring(0, 8)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// =====================================================
// Render do painel de publicação (passo 13)
// =====================================================

export async function renderPublishPanel(container, ctx) {
  const { state, setStepStatus } = ctx;
  const snapshot = buildSnapshot(state);
  const hash = await computeHash(snapshot);
  const valid = validate(state);

  const panel = el(
    'div',
    {
      style:
        'background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; margin-top: 1rem',
    }
  );

  panel.appendChild(
    el(
      'div',
      {
        style:
          'padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: center',
      },
      el('h3', { style: 'margin: 0; font-size: 1rem; font-weight: 600' }, '📦 Snapshot e publicação'),
      el(
        'span',
        { class: 'tag', style: 'font-family: monospace' },
        `versão ${snapshot.versao_snapshot}`
      )
    )
  );

  // Hash
  panel.appendChild(
    el(
      'div',
      { style: 'padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-subtle)' },
      el('div', { class: 'text-small text-muted mb-2' }, 'Hash sha256 do snapshot (content-addressable):'),
      el('div', { class: 'hash-display' }, hash)
    )
  );

  // Preview JSON (collapsed)
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const detailsBody = el('pre', { class: 'json-preview' }, jsonStr);
  const details = el(
    'details',
    { style: 'padding: 0 1.25rem' },
    el(
      'summary',
      { style: 'cursor: pointer; padding: 0.75rem 0; font-weight: 600; font-size: 0.875rem' },
      `📄 Pré-visualização do snapshot (${(jsonStr.length / 1024).toFixed(1)} KB)`
    ),
    detailsBody
  );
  panel.appendChild(details);

  // Botões
  const actions = el(
    'div',
    {
      style:
        'padding: 1rem 1.25rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem',
    }
  );
  actions.appendChild(
    valid.ok
      ? el('span', { class: 'tag tag-success' }, '✓ Pronto para publicar')
      : el('span', { class: 'tag tag-warning' }, `⚠️ ${valid.pendencias.length} pendência(s) — revise antes de publicar`)
  );

  const btnGroup = el('div', { class: 'flex gap-2', style: 'flex-wrap: wrap' });

  btnGroup.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary',
        on: { click: () => exportAsJson(snapshot, hash) },
      },
      '💾 Exportar JSON'
    )
  );

  btnGroup.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary',
        on: {
          click: async () => {
            const nome = prompt(
              'Nome do modelo:',
              `${snapshot.tipo?.codigo || 'GERAL'} — modelo ${new Date().getFullYear()}`
            );
            if (!nome) return;
            await saveAsModel(state, nome);
            Toast.success(`Modelo "${nome}" salvo. Acesse em Modelos.`);
          },
        },
      },
      '📋 Salvar como modelo'
    )
  );

  btnGroup.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary',
        on: {
          click: async () => {
            if (!valid.ok) {
              if (
                !confirm(
                  `Há ${valid.pendencias.length} pendência(s) de obrigatoriedade legal. Publicar mesmo assim?`
                )
              ) {
                return;
              }
            }
            const ident = snapshot.identificacao || {};
            const nomeEdital = `${ident.numero || '?'}/${ident.ano || '?'} — ${ident.nomeProcesso || '?'}`;
            if (!confirm(`Publicar edital "${nomeEdital}"? Esta ação congela o snapshot (RN08).`)) {
              return;
            }
            await publish(state);
            setStepStatus('concluido');
            Toast.success('Edital publicado. Snapshot RN08 congelado.');
            // Redireciona para lista
            setTimeout(() => (window.location.href = 'editais.html'), 800);
          },
        },
      },
      '🚀 Publicar edital'
    )
  );

  actions.appendChild(btnGroup);
  panel.appendChild(actions);

  container.appendChild(panel);
}
