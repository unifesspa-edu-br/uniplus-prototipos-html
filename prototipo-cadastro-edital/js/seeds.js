// seeds.js — popula os 8 catálogos com dados realistas a partir de data/*.json

import { Storage, Collection, Keys } from './storage.js';

const SEEDS = [
  { url: 'data/seed-tipos-edital.json', key: Keys.TIPOS_EDITAL },
  { url: 'data/seed-modalidades.json', key: Keys.MODALIDADES },
  { url: 'data/seed-tipos-etapa.json', key: Keys.TIPOS_ETAPA },
  { url: 'data/seed-locais-prova.json', key: Keys.LOCAIS_PROVA },
  { url: 'data/seed-necessidades.json', key: Keys.NECESSIDADES },
  { url: 'data/seed-tipos-documento.json', key: Keys.TIPOS_DOCUMENTO },
  { url: 'data/seed-criterios-desempate.json', key: Keys.CRITERIOS_DESEMPATE },
  { url: 'data/seed-obrigatoriedades.json', key: Keys.OBRIGATORIEDADES },
];

/**
 * Carrega seeds de cada catálogo. Atribui id/criadoEm/atualizadoEm/ativo.
 * Substitui o conteúdo existente — usar com `Storage.clearAll` antes para reset total.
 */
export async function loadSeeds() {
  for (const { url, key } of SEEDS) {
    const data = await fetchJson(url);
    const items = data.map((raw) => ({
      id: crypto.randomUUID(),
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
