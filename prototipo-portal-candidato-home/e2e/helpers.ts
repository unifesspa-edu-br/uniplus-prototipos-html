/**
 * Helpers compartilhados para testes do protótipo.
 *
 * Estratégia de aplicação de preferências: pré-popular localStorage via
 * `addInitScript` ANTES do `goto`. Isso é viewport-agnóstico (não depende
 * dos toggles do Inspector estarem visíveis ou em popover fechado), e
 * funciona tanto em desktop como em mobile sem precisar abrir drawers.
 */

import type { Page } from '@playwright/test';

export type Design = 'figma' | 'briefing';
export type FontScale = 'diminuir' | 'padrao' | 'aumentar';
export type Contrast = 'normal' | 'alto';
export type Tema = 'claro' | 'escuro';
export type Fonte = 'institucional' | 'legivel';

export interface Prefs {
  design?: Design;
  fontscale?: FontScale;
  contrast?: Contrast;
  tema?: Tema;
  fonte?: Fonte;
}

const PREF_PREFIX = 'uniplus.proto.home.';

/**
 * Carrega o protótipo com as preferências já aplicadas no localStorage —
 * evita interagir com toggles que podem estar escondidos em viewports
 * estreitos. Limpa o storage antes para garantir start zerado.
 */
export async function gotoWithPrefs(
  page: Page,
  prefs: Prefs = {},
  search: string = ''
): Promise<void> {
  await page.addInitScript(
    (args) => {
      try {
        localStorage.clear();
        const { prefix, prefs } = args;
        Object.entries(prefs).forEach(([k, v]) => {
          if (v) localStorage.setItem(prefix + k, String(v));
        });
      } catch {
        /* localStorage indisponível (modo privado) */
      }
    },
    { prefix: PREF_PREFIX, prefs: prefs as Record<string, string> }
  );

  const url = '/index.html' + (search ? `?${search.replace(/^\?/, '')}` : '');
  await page.goto(url);
  await page.waitForSelector('.page-frame');
  // Pequena espera para o JS aplicar atributos data-* derivados das prefs
  await page.waitForTimeout(150);
}

/**
 * Etiqueta curta para nomear screenshots de forma determinística.
 */
export function prefsLabel(prefs: Prefs): string {
  const parts = [
    prefs.design ?? 'briefing',
    prefs.fontscale && prefs.fontscale !== 'padrao' ? `fs-${prefs.fontscale}` : null,
    prefs.contrast === 'alto' ? 'altocontraste' : null,
    prefs.tema === 'escuro' ? 'escuro' : null,
    prefs.fonte === 'legivel' ? 'fonte-legivel' : null,
  ].filter(Boolean);
  return parts.join('_');
}

/**
 * Em viewports <1200px o Inspector é um drawer escondido por default
 * (`transform: translateX(100%)`). Com `gotoWithPrefs` ele NÃO abre
 * automaticamente, então geralmente este helper só é necessário em
 * testes de interação explícita com o Inspector.
 */
export async function ensureInspectorOpen(page: Page): Promise<void> {
  const toggle = page.locator('.inspector-toggle');
  if (await toggle.isVisible().catch(() => false)) {
    const inspector = page.locator('.inspector');
    const open = await inspector.getAttribute('data-open');
    if (open !== 'true') {
      await toggle.click();
      await page.waitForTimeout(350);
    }
  }
}
