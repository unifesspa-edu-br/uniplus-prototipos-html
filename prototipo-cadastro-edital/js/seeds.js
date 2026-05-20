// seeds.js — popula as configurações com dados realistas a partir de data/*.json

import { Storage, Collection, Keys, randomUUID } from './storage.js';

const SEEDS = [
  { url: 'data/seed-unidades.json', key: Keys.UNIDADES },
  { url: 'data/seed-tipos-edital.json', key: Keys.TIPOS_EDITAL },
  { url: 'data/seed-modalidades.json', key: Keys.MODALIDADES },
  { url: 'data/seed-tipos-etapa.json', key: Keys.TIPOS_ETAPA },
  { url: 'data/seed-cidades.json', key: Keys.CIDADES },
  // Refactor 2: seed-local-oferta.json substitui seed-campus.json (13 entradas vs 6).
  // seed-campus.json mantido no disco para compat retroativa com builds antigos.
  { url: 'data/seed-local-oferta.json', key: Keys.LOCAL_OFERTA },
  { url: 'data/seed-tipos-deficiencia.json', key: Keys.TIPOS_DEFICIENCIA },
  { url: 'data/seed-condicoes-atendimento-especializado.json', key: Keys.CONDICOES_ATENDIMENTO_ESPECIALIZADO },
  { url: 'data/seed-recursos-acessibilidade.json', key: Keys.RECURSOS_ACESSIBILIDADE },
  { url: 'data/seed-tipos-documento.json', key: Keys.TIPOS_DOCUMENTO },
  { url: 'data/seed-criterios-desempate.json', key: Keys.CRITERIOS_DESEMPATE },
  { url: 'data/seed-obrigatoriedades.json', key: Keys.OBRIGATORIEDADES },
  { url: 'data/seed-percentuais-ibge.json', key: Keys.PERCENTUAIS_IBGE },
  { url: 'data/seed-estrategias-balanceamento.json', key: Keys.ESTRATEGIAS_BALANCEAMENTO },
  { url: 'data/seed-cascatas-remanejamento.json', key: Keys.CASCATAS_REMANEJAMENTO },
  { url: 'data/seed-cursos.json', key: Keys.CURSOS },
  // Refactor 3: OfertaCurso — instâncias regulatórias (Curso × LocalOferta × Modalidade).
  { url: 'data/seed-oferta-curso.json', key: Keys.OFERTAS_CURSO },
];

/**
 * Carrega seeds de cada configuração. Atribui id/criadoEm/atualizadoEm/ativo.
 * Substitui o conteúdo existente — usar com `Storage.clearAll` antes para reset total.
 */
export async function loadSeeds() {
  for (const { url, key } of SEEDS) {
    const data = await fetchJson(url);
    const items = data.map((raw) => ({
      id: randomUUID(),
      ativo: raw.ativo !== false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      ...raw,
    }));
    // Normalização defensiva para Unidade: `parent_codigo` vazio/espaços vira `null`.
    // Espelha a normalização em `configuracao.js:validarUnidade` para CSV/seed imports
    // e mantém invariante "parent === null = raiz", evitando FK fantasma.
    if (key === Keys.UNIDADES) {
      for (const item of items) {
        if (typeof item.parent_codigo === 'string') {
          const trimmed = item.parent_codigo.trim();
          item.parent_codigo = trimmed === '' ? null : trimmed;
        } else if (item.parent_codigo === undefined) {
          item.parent_codigo = null;
        }
      }
    }
    new Collection(key).replaceAll(items);
  }
  Storage.set(Keys.SEEDS_LOADED, {
    versao: 1,
    carregadoEm: new Date().toISOString(),
  });
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Falha ao carregar ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
