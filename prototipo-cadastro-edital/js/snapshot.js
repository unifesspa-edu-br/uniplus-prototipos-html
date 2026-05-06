// snapshot.js — geração do snapshot consolidado (RN08), hash sha256 e publicação.
//
// O snapshot é a cópia profunda do edital + todos os catálogos referenciados
// no momento da publicação. Garante idempotência: alterações posteriores nos
// catálogos não retroagem para editais já publicados.

import { Collection, Keys } from './storage.js';
import { Toast } from './toast.js';
import { el } from './dom.js';
import { validate } from './validator.js';

const RASCUNHOS = new Collection(Keys.EDITAIS_RASCUNHO);
const PUBLICADOS = new Collection(Keys.EDITAIS_PUBLICADO);
const MODELOS = new Collection(Keys.MODELOS);

// =====================================================
// Build snapshot
// =====================================================

function denormSingle(catalogKey, predicate) {
  const items = new Collection(catalogKey).list({ includeInactive: true });
  const item = items.find(predicate);
  return item ? omitMeta(item) : null;
}

function denormMany(catalogKey, predicate) {
  const items = new Collection(catalogKey).list({ includeInactive: true });
  return items.filter(predicate).map(omitMeta);
}

function omitMeta(item) {
  // remove campos de metadata local (id interno, criadoEm, etc.) — preserva apenas campos de domínio
  const { id, criadoEm, atualizadoEm, ativo, ...rest } = item;
  return rest;
}

export function buildSnapshot(state) {
  const ed = state.edital;

  return {
    versao_snapshot: 1,
    edital_uuid: state.id,

    tipo: ed.tipo
      ? denormSingle(Keys.TIPOS_EDITAL, (t) => t.id === ed.tipo.tipoEditalId)
      : null,

    identificacao: { ...ed.identificacao },

    cronograma: { ...ed.cronograma },

    vagas: ed.vagasModalidades?.cursos || [],

    modalidades: denormMany(Keys.MODALIDADES, (m) =>
      (ed.vagasModalidades?.modalidades || []).includes(m.codigo)
    ),

    concorrencia_dupla: ed.vagasModalidades?.concorrenciaDupla || false,

    cascata_remanejamento: ed.vagasModalidades?.cascata || [],

    etapas: (ed.etapas || []).map((e) => {
      const tipoSnap = denormSingle(Keys.TIPOS_ETAPA, (t) => t.codigo === e.tipoEtapaCodigo);
      return {
        ordem: e.ordem,
        tipo: tipoSnap,
        nome_customizado: e.nomeCustomizado || null,
        peso: e.peso,
        nota_minima: e.notaMinima,
        eliminatoria: e.eliminatoria,
        pertence_calculo: e.pertenceCalculo,
        data_aplicacao: e.dataAplicacao,
        janela_recurso: {
          inicio: e.janelaRecursoInicio,
          fim: e.janelaRecursoFim,
        },
      };
    }),

    formula: { ...ed.formula },

    bonus: ed.bonus?.habilitado ? { ...ed.bonus } : null,

    desempate: (ed.desempate || []).map((d, idx) => {
      const def = denormSingle(Keys.CRITERIOS_DESEMPATE, (c) => c.codigo === d.codigo);
      return {
        ordem: idx + 1,
        criterio: def,
        etapa_referencia: d.etapaRef || null,
      };
    }),

    eliminacao: { ...ed.eliminacao },

    documentos_por_modalidade: (ed.documentos || []).map((d) => {
      const def = denormSingle(Keys.TIPOS_DOCUMENTO, (t) => t.codigo === d.tipoDocumentoCodigo);
      return {
        documento: def,
        modalidade: d.modalidade,
        obrigatorio: d.obrigatorio,
      };
    }),

    locais: (ed.locais || []).map((l) => {
      const def = denormSingle(Keys.LOCAIS_PROVA, (lp) => lp.codigo === l.localProvaCodigo);
      return {
        local: def,
        capacidade_neste_edital: l.capacidade,
        sessoes: l.sessoes || [],
      };
    }),

    atendimento_especial: (ed.atendimento || []).map((a) => {
      const def = denormSingle(Keys.NECESSIDADES, (n) => n.codigo === a.necessidadeEspecialCodigo);
      return {
        necessidade: def,
        recursos_disponibilizados: a.recursos_disponibilizados || [],
      };
    }),

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
    id: crypto.randomUUID(),
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
  // Sanitiza: limpa identificação, datas, vagas
  const sanitized = {
    ...snapshot,
    identificacao: {
      sigla: snapshot.identificacao?.sigla || 'CEPS/UNIFESSPA',
    },
    cronograma: {},
    vagas: [],
  };
  delete sanitized.edital_uuid;

  const modelo = {
    id: crypto.randomUUID(),
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
        'background: white; border: 1px solid var(--color-secondary-04, #ccc); border-radius: 8px; margin-top: 1rem',
    }
  );

  panel.appendChild(
    el(
      'div',
      {
        style:
          'padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-secondary-04, #ccc); display: flex; justify-content: space-between; align-items: center',
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
      { style: 'padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-secondary-02, #e8e8e8)' },
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
        'padding: 1rem 1.25rem; border-top: 1px solid var(--color-secondary-02, #e8e8e8); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem',
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
            setStepStatus('completed');
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
