/* prefs.js — persistência leve em localStorage com namespace `uniplus.proto.home.*` */

const KEY_PREFIX = 'uniplus.proto.home.';

export const Prefs = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + key);
      return raw === null ? fallback : raw;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(KEY_PREFIX + key, String(value));
    } catch {
      /* localStorage indisponível — silenciar (modo privado) */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(KEY_PREFIX + key);
    } catch {
      /* idem */
    }
  },
};
