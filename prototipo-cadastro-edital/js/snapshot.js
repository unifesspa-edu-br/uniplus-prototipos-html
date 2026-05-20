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

// Denormaliza LocalOferta com todos os campos relevantes para auditoria (RN08).
// Refactor 2: lookup tenta Keys.LOCAL_OFERTA primeiro; fallback para Keys.CAMPUS
// para compat retroativa com editais publicados com campus_snap.
// `cidade` é aninhada e enriquecida pelo helper `denormalizeCidadeFull`.
function denormalizeLocalOfertaFull(cursoDef) {
  if (!cursoDef?.campus_codigo) return null;
  // Tenta LocalOferta novo primeiro; se não encontrar, usa Campus legado.
  let localRaw = denormSingle(Keys.LOCAL_OFERTA, (l) => l.codigo === cursoDef.campus_codigo);
  const colecaoUsada = localRaw ? Keys.LOCAL_OFERTA : Keys.CAMPUS;
  if (!localRaw) {
    localRaw = denormSingle(Keys.CAMPUS, (c) => c.codigo === cursoDef.campus_codigo);
  }
  if (!localRaw) return null;
  const cidadeRaw = localRaw.cidade_codigo
    ? denormSingle(Keys.CIDADES, (c) => c.codigo === localRaw.cidade_codigo)
    : null;
  // FIX 7 (P2): incluir campus_responsavel_codigo e objeto campus_responsavel
  // resolvido de forma determinística (lookup por código). Necessário para
  // Jacundá/Parauapebas/Canaã: tipo CONVENIO_INTERIORIZACAO vinculado a Marabá-UI.
  // Preserva auditoria RN08 — campo congelado na publicação.
  const campusRespCodigo = localRaw.campus_responsavel_codigo ?? null;
  const campusRespRaw = campusRespCodigo
    ? denormSingle(Keys.LOCAL_OFERTA, (l) => l.codigo === campusRespCodigo) ??
      denormSingle(Keys.CAMPUS, (c) => c.codigo === campusRespCodigo)
    : null;
  const campusRespCidadeRaw = campusRespRaw?.cidade_codigo
    ? denormSingle(Keys.CIDADES, (c) => c.codigo === campusRespRaw.cidade_codigo)
    : null;
  const campus_responsavel = campusRespRaw
    ? {
        codigo: campusRespRaw.codigo,
        nome: campusRespRaw.nome,
        tipo: campusRespRaw.tipo ?? (campusRespRaw.tipo_campus === 'CONVENIO' ? 'CONVENIO_INTERIORIZACAO' : 'CAMPUS_SEDE'),
        codigo_emec: campusRespRaw.codigo_emec ?? null,
        cidade: denormalizeCidadeFull(campusRespCidadeRaw),
      }
    : null;

  return {
    codigo: localRaw.codigo,
    nome: localRaw.nome,
    // Novo: tipo regulatório (LocalOferta). Fallback a tipo_campus legado.
    tipo: localRaw.tipo ?? (localRaw.tipo_campus === 'CONVENIO' ? 'CONVENIO_INTERIORIZACAO' : 'CAMPUS_SEDE'),
    codigo_emec: localRaw.codigo_emec ?? null,
    principal_em_municipio: localRaw.principal_em_municipio ?? null,
    endereco: localRaw.endereco ?? null,
    cep: localRaw.cep ?? null,
    latitude: localRaw.latitude ?? null,
    longitude: localRaw.longitude ?? null,
    ato_regulatorio_mec: localRaw.ato_regulatorio_mec ?? null,
    // FIX 7: campus responsável congelado (RN08) — vínculo binding para locais de interiorização.
    campus_responsavel_codigo: campusRespCodigo,
    campus_responsavel,
    // Legado: tipo_campus preservado para compat com snapshots antigos.
    tipo_campus: localRaw.tipo_campus ?? null,
    cidade: denormalizeCidadeFull(cidadeRaw),
    // Indica qual coleção foi usada para rastreabilidade em snapshots mixtos.
    _fonte_colecao: colecaoUsada === Keys.LOCAL_OFERTA ? 'local-oferta' : 'campus-legado',
  };
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

    // Denormaliza cada vaga: resolve OfertaCurso → Curso + LocalOferta + UnidadeOfertante.
    // Refactors 2+3: lookup em OFERTAS_CURSO (Refactor 3) com fallback a CURSOS (legado).
    // `denormalizeLocalOfertaFull` lida com LOCAL_OFERTA/CAMPUS transparentemente (Refactor 2).
    // O snapshot congela objetos completos para preservar dados na publicação (RN08).
    vagas: (ed.vagas?.cursos || []).map((v) => {
      // Compat: aceita ofertaCursoCodigo (Refactor 3) ou cursoCodigo (legado).
      const chave = v.ofertaCursoCodigo ?? v.cursoCodigo;
      // Tenta resolver como OfertaCurso primeiro; depois como Curso legado.
      const ofertaDef = chave
        ? denormSingle(Keys.OFERTAS_CURSO, (o) => o.codigo === chave)
        : null;
      // cursoDef: usa `curso_codigo` da oferta se disponível, senão usa `chave` diretamente.
      const cursoChave = ofertaDef?.curso_codigo ?? chave;
      const cursoDef = cursoChave
        ? denormSingle(Keys.CURSOS, (c) => c.codigo === cursoChave)
        : null;
      if (!cursoDef && !ofertaDef) {
        return { codigo: chave || null, curso: '(não encontrado)', vagas: v.vagas || 0 };
      }
      // Stub de Curso para denormalizeLocalOfertaFull quando vem de OfertaCurso:
      // o helper precisa de `campus_codigo` — usa `local_oferta_codigo` da oferta.
      const cursoStub = cursoDef ?? {};
      if (ofertaDef && !cursoStub.campus_codigo) {
        cursoStub.campus_codigo = ofertaDef.local_oferta_codigo;
      }
      const localOfertaSnap = denormalizeLocalOfertaFull(cursoStub);
      // UnidadeOfertante: usa ofertaDef se disponível, senão cursoDef (legado).
      const unidOfCodigo = ofertaDef?.unidade_ofertante_codigo ?? cursoDef?.unidade_ofertante_codigo ?? null;
      const unidadeOfertanteDef = unidOfCodigo
        ? denormSingle(Keys.UNIDADES, (u) => u.codigo === unidOfCodigo)
        : null;
      const unidadeOfertanteSigla = unidadeOfertanteDef?.sigla || unidOfCodigo || null;
      return {
        codigo: chave,
        curso: cursoDef?.nome || ofertaDef?.curso_codigo || chave,
        grau: cursoDef?.grau || null,
        modalidade: ofertaDef?.modalidade ?? 'REGULAR',
        formato_pedagogico: ofertaDef?.formato_pedagogico ?? 'PRESENCIAL',
        // RN08 (Refactor 3): e_mec_codigo e codigo_sga pertencem à OfertaCurso (variam por campus).
        // Congelados no snapshot no momento da publicação — não retroagem.
        e_mec_codigo: ofertaDef?.e_mec_codigo ?? null,
        codigo_sga: ofertaDef?.codigo_sga ?? null,
        // Campos de texto curtos para retrocompatibilidade com renders existentes.
        campus: localOfertaSnap?.nome || cursoStub.campus_codigo,
        cidade_campus: localOfertaSnap?.cidade?.nome || null,
        // Objeto completo LocalOferta (campo duplo para compat retroativa).
        local_oferta_snap: localOfertaSnap,
        campus_snap: localOfertaSnap,
        unidade_ofertante: unidadeOfertanteDef
          ? {
              codigo: unidadeOfertanteDef.codigo,
              sigla: unidadeOfertanteDef.sigla,
              nome: unidadeOfertanteDef.nome,
              tipo: unidadeOfertanteDef.tipo ?? null,
            }
          : null,
        unidade_ofertante_sigla: unidadeOfertanteSigla,
        turno: ofertaDef?.turno ?? cursoDef?.turno ?? null,
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
    // de ofertas de curso do edital que aceitam prova em cada cidade. Denormaliza Cidade
    // completa (13 campos) e LocalOferta completo (com cidade aninhada).
    // Refactors 2+3: lookup em OFERTAS_CURSO (fallback a CURSOS); LOCAL_OFERTA (fallback CAMPUS).
    cidades: (ed.cidades || [])
      .map((entry) => {
        const cidade = denormSingle(Keys.CIDADES, (c) => c.codigo === entry.cidadeCodigo);
        if (!cidade) return null;
        const cursos = (entry.cursoCodigos || [])
          .map((codigo) => {
            // Tenta OfertaCurso primeiro (Refactor 3); fallback a Curso legado.
            const ofertaDef = denormSingle(Keys.OFERTAS_CURSO, (o) => o.codigo === codigo);
            const cursoChave = ofertaDef?.curso_codigo ?? codigo;
            const cursoDef = denormSingle(Keys.CURSOS, (c) => c.codigo === cursoChave);
            if (!cursoDef && !ofertaDef) return null;
            const cursoStub = cursoDef ?? {};
            if (ofertaDef && !cursoStub.campus_codigo) {
              cursoStub.campus_codigo = ofertaDef.local_oferta_codigo;
            }
            const localOfertaSnap = denormalizeLocalOfertaFull(cursoStub);
            return {
              codigo,
              curso: cursoDef?.nome || ofertaDef?.curso_codigo || codigo,
              grau: cursoDef?.grau || null,
              modalidade: ofertaDef?.modalidade ?? 'REGULAR',
              campus: localOfertaSnap?.nome || cursoStub.campus_codigo,
              cidade_campus: localOfertaSnap?.cidade?.nome || null,
              local_oferta_snap: localOfertaSnap,
              campus_snap: localOfertaSnap,
              turno: ofertaDef?.turno ?? cursoDef?.turno ?? null,
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
    // Modelagem Opção C (binding TL 2026-05-19):
    // - condicoes_aceitas: códigos de CondicaoAtendimentoEspecializado (item 4.2.1).
    // - detalhes_pcd: { tipos_deficiencia: [...] } | null — só presente quando PCD ∈ condicoes_aceitas.
    //   Denormaliza TipoDeficiencia completo (com categoria_lbi) para preservar snapshot imutável.
    // - recursos_oferecidos: códigos de RecursoAcessibilidade (item 4.2.2 + extensões locais).
    // SolicitacaoAtendimentoEspecializado (workflow do candidato) é decisão de F3 — fora do escopo aqui.
    atendimento_especializado: (() => {
      const ofertaEd = ed.atendimentoEspecializado?.oferta || {};
      const condicoesAceitas = (ofertaEd.condicoes_aceitas || [])
        .map((c) => denormSingle(Keys.CONDICOES_ATENDIMENTO_ESPECIALIZADO, (d) => d.codigo === c))
        .filter(Boolean);

      // Denormaliza detalhes_pcd: tipos_deficiencia completos (com categoria_lbi).
      // Se PCD marcado mas tipos vazios (estado legado inválido) → null com observação.
      //
      // FIX 1 (P1): fallback para rascunhos pré-refactor com `deficiencias_aceitas` legado.
      // Quando `detalhes_pcd` está ausente/vazio mas `deficiencias_aceitas` existe, usa
      // esse campo legado como fonte dos códigos (preservando bytes, sem localeCompare).
      // Normaliza tanto strings puras quanto objetos com `.codigo` (dois formatos legados).
      const temPCDMarcado = (ofertaEd.condicoes_aceitas || []).includes('PCD');
      let tiposPcdCodigos = ofertaEd.detalhes_pcd?.tipos_deficiencia || [];
      if (tiposPcdCodigos.length === 0 && Array.isArray(ofertaEd.deficiencias_aceitas) &&
          ofertaEd.deficiencias_aceitas.length > 0) {
        // Normaliza: aceita string pura ('BAIXA_VISAO') ou objeto ({ codigo: 'BAIXA_VISAO' })
        tiposPcdCodigos = ofertaEd.deficiencias_aceitas.map((d) =>
          typeof d === 'string' ? d : (d?.codigo ?? null)
        ).filter(Boolean);
      }
      let detalhesPcdSnap = null;
      if (temPCDMarcado && tiposPcdCodigos.length > 0) {
        detalhesPcdSnap = {
          tipos_deficiencia: tiposPcdCodigos
            .map((c) => denormSingle(Keys.TIPOS_DEFICIENCIA, (d) => d.codigo === c))
            .filter(Boolean),
        };
      }

      return {
        oferta: {
          condicoes_aceitas: condicoesAceitas,
          detalhes_pcd: detalhesPcdSnap,
          recursos_oferecidos: (ofertaEd.recursos_oferecidos || [])
            .map((c) => denormSingle(Keys.RECURSOS_ACESSIBILIDADE, (r) => r.codigo === c))
            .filter(Boolean),
        },
      };
    })(),

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
