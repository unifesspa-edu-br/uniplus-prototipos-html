// storage.js — wrapper sobre localStorage para o protótipo Uni+
//
// Convenção de chaves: tudo prefixado com `uniplus.`
// Coleções (configurações, editais, modelos) são arrays de objetos com `id` (uuid v4).

const PREFIX = 'uniplus.';

/**
 * Gera UUID v4 — usa `crypto.randomUUID()` quando disponível e cai num
 * fallback baseado em `crypto.getRandomValues` (disponível em qualquer
 * contexto, inclusive HTTP via IP da LAN). Use sempre este helper em vez
 * de chamar `crypto.randomUUID()` direto.
 */
export function randomUUID() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return (
    h.slice(0, 4).join('') +
    '-' +
    h.slice(4, 6).join('') +
    '-' +
    h.slice(6, 8).join('') +
    '-' +
    h.slice(8, 10).join('') +
    '-' +
    h.slice(10, 16).join('')
  );
}

export const Storage = {
  /** Lê uma chave (parsing JSON). Retorna null se ausente ou inválido. */
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? null : JSON.parse(raw);
    } catch (e) {
      console.warn('Storage.get falhou para', key, e);
      return null;
    }
  },

  /** Escreve uma chave (serializa JSON). */
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage.set falhou para', key, e);
      // QuotaExceededError é o caso mais comum
      throw e;
    }
  },

  /** Remove uma chave individual. */
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  /** Lista todas as chaves do prefixo (sem o prefixo). */
  keys(subPrefix = '') {
    const fullPrefix = PREFIX + subPrefix;
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        out.push(key.substring(PREFIX.length));
      }
    }
    return out;
  },

  /** Limpa todas as chaves do prefixo `uniplus.`. */
  clearAll() {
    const keys = this.keys();
    keys.forEach((k) => this.remove(k));
  },

  /** Tamanho aproximado em bytes (para diagnóstico). */
  estimatedSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        total += key.length + (localStorage.getItem(key) || '').length;
      }
    }
    return total;
  },
};

/**
 * CRUD genérico de coleção em uma chave do localStorage.
 * Cada item da coleção tem `id`, `criadoEm`, `atualizadoEm` (gerados automaticamente),
 * e `ativo` (boolean, default true) para inativação lógica.
 */
export class Collection {
  constructor(key) {
    this.key = key;
  }

  list({ includeInactive = true } = {}) {
    const items = Storage.get(this.key) || [];
    return includeInactive ? items : items.filter((x) => x.ativo !== false);
  }

  byId(id) {
    return this.list().find((x) => x.id === id) || null;
  }

  byCodigo(codigo) {
    return this.list().find((x) => x.codigo === codigo) || null;
  }

  /** Insere ou atualiza item por `id`. Gera id se ausente. */
  upsert(item) {
    const items = this.list();
    const now = new Date().toISOString();

    if (!item.id) {
      const novo = {
        id: randomUUID(),
        ativo: true,
        ...item,
        criadoEm: now,
        atualizadoEm: now,
      };
      items.push(novo);
      Storage.set(this.key, items);
      return novo;
    }

    const idx = items.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...item, atualizadoEm: now };
      Storage.set(this.key, items);
      return items[idx];
    }
    // id veio mas item não existe — trata como insert preservando id
    const novo = { ativo: true, ...item, criadoEm: now, atualizadoEm: now };
    items.push(novo);
    Storage.set(this.key, items);
    return novo;
  }

  /** Substitui toda a coleção (usado pelos seeds). */
  replaceAll(items) {
    Storage.set(this.key, items);
  }

  /** Inativa logicamente (mantém histórico). */
  inactivate(id) {
    const item = this.byId(id);
    if (!item) return null;
    item.ativo = false;
    return this.upsert(item);
  }

  /** Reativa um item inativo. */
  activate(id) {
    const item = this.byId(id);
    if (!item) return null;
    item.ativo = true;
    return this.upsert(item);
  }

  /** Remove permanentemente (sem audit trail). Usar com cuidado. */
  hardDelete(id) {
    const items = this.list().filter((x) => x.id !== id);
    Storage.set(this.key, items);
  }

  count({ includeInactive = false } = {}) {
    return this.list({ includeInactive }).length;
  }
}

/**
 * Chaves canônicas do protótipo. Exportadas para evitar typos.
 */
export const Keys = {
  // Configurações
  TIPOS_EDITAL: 'configuracao.tipos-edital',
  MODALIDADES: 'configuracao.modalidades',
  TIPOS_ETAPA: 'configuracao.tipos-etapa',
  CIDADES_PROVA: 'configuracao.cidades-prova',
  NECESSIDADES: 'configuracao.necessidades',
  TIPOS_DOCUMENTO: 'configuracao.tipos-documento',
  CRITERIOS_DESEMPATE: 'configuracao.criterios-desempate',
  OBRIGATORIEDADES: 'configuracao.obrigatoriedades',
  PERCENTUAIS_IBGE: 'configuracao.percentuais-ibge',
  ESTRATEGIAS_BALANCEAMENTO: 'configuracao.estrategias-balanceamento',
  CASCATAS_REMANEJAMENTO: 'configuracao.cascatas-remanejamento',
  CURSOS: 'configuracao.cursos',

  // Domínio
  EDITAIS_RASCUNHOS: 'editais.rascunhos',
  EDITAIS_PUBLICADOS: 'editais.publicados',
  MODELOS: 'modelos',

  // App
  PREFERENCES: 'app.preferences',
  SEEDS_LOADED: 'app.seeds-loaded-v13',
};
