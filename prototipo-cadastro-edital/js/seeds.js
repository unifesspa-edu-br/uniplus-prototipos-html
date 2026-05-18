// seeds.js — popula as 12 configurações com dados realistas a partir de data/*.json

import { Storage, Collection, Keys, randomUUID } from './storage.js';

const SEEDS = [
  { url: 'data/seed-tipos-edital.json', key: Keys.TIPOS_EDITAL },
  { url: 'data/seed-modalidades.json', key: Keys.MODALIDADES },
  { url: 'data/seed-tipos-etapa.json', key: Keys.TIPOS_ETAPA },
  { url: 'data/seed-cidades-prova.json', key: Keys.CIDADES_PROVA },
  { url: 'data/seed-necessidades.json', key: Keys.NECESSIDADES },
  { url: 'data/seed-tipos-documento.json', key: Keys.TIPOS_DOCUMENTO },
  { url: 'data/seed-criterios-desempate.json', key: Keys.CRITERIOS_DESEMPATE },
  { url: 'data/seed-obrigatoriedades.json', key: Keys.OBRIGATORIEDADES },
  { url: 'data/seed-percentuais-ibge.json', key: Keys.PERCENTUAIS_IBGE },
  { url: 'data/seed-estrategias-balanceamento.json', key: Keys.ESTRATEGIAS_BALANCEAMENTO },
  { url: 'data/seed-cascatas-remanejamento.json', key: Keys.CASCATAS_REMANEJAMENTO },
  { url: 'data/seed-cursos.json', key: Keys.CURSOS },
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
