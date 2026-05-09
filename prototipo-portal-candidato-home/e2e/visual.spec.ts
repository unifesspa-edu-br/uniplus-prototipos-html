/**
 * Matriz visual — captura full-page do page-frame em cada combinação
 * relevante de design × estado de acessibilidade. Os screenshots ficam em
 * screenshots/<viewport>/<label>.png.
 *
 * Foco: validar conceito visual e integridade do layout sob estados de
 * a11y. As prefs são aplicadas via localStorage init script (viewport-
 * agnóstico, sobrevive a triggers escondidos em mobile).
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotoWithPrefs, prefsLabel, type Prefs } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS = path.resolve(__dirname, '../screenshots');

const SCENARIOS: Array<{ name: string; prefs: Prefs }> = [
  { name: 'A1 — Briefing default', prefs: { design: 'briefing' } },
  { name: 'A2 — Briefing + alto contraste', prefs: { design: 'briefing', contrast: 'alto' } },
  { name: 'A3 — Briefing + tema escuro', prefs: { design: 'briefing', tema: 'escuro' } },
  { name: 'A4 — Briefing + fonte legível', prefs: { design: 'briefing', fonte: 'legivel' } },
  { name: 'A5 — Briefing + A+', prefs: { design: 'briefing', fontscale: 'aumentar' } },
  { name: 'A6 — Briefing + A−', prefs: { design: 'briefing', fontscale: 'diminuir' } },
  { name: 'A7 — Briefing + combo (A+ + alto + legível)', prefs: { design: 'briefing', fontscale: 'aumentar', contrast: 'alto', fonte: 'legivel' } },
  { name: 'B1 — Figma original default', prefs: { design: 'figma' } },
  { name: 'B2 — Figma + tema escuro', prefs: { design: 'figma', tema: 'escuro' } },
  { name: 'B3 — Figma + alto contraste', prefs: { design: 'figma', contrast: 'alto' } },
];

for (const scenario of SCENARIOS) {
  test(scenario.name, async ({ page }, testInfo) => {
    await gotoWithPrefs(page, scenario.prefs);

    // Garante que o estado foi aplicado antes do screenshot
    const frame = page.locator('.page-frame');
    if (scenario.prefs.design) {
      await expect(frame).toHaveAttribute('data-design', scenario.prefs.design);
    }
    if (scenario.prefs.contrast === 'alto') {
      await expect(frame).toHaveAttribute('data-a11y-contrast', 'alto');
    }
    if (scenario.prefs.tema === 'escuro') {
      await expect(frame).toHaveAttribute('data-a11y-tema', 'escuro');
    }
    if (scenario.prefs.fonte === 'legivel') {
      await expect(frame).toHaveAttribute('data-a11y-fonte', 'legivel');
    }

    const label = prefsLabel(scenario.prefs);
    const file = path.join(SCREENSHOTS, testInfo.project.name, `${label}.png`);

    await page.screenshot({ path: file, fullPage: true });

    const fileFrameOnly = path.join(SCREENSHOTS, testInfo.project.name, `${label}_frame-only.png`);
    await frame.screenshot({ path: fileFrameOnly });

    // Asserts estruturais leves
    await expect(page.locator('.page-frame h1')).toHaveCount(1);
    await expect(page.locator('.skip-link')).toBeAttached();
    await expect(page.locator('main#conteudo')).toBeVisible();
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible();
  });
}

/* =========================================================================
   Popovers mobile — só rodam em mobile-360 (em ≥768px o conteúdo está inline)
   ========================================================================= */

test.describe('Popovers mobile', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-360', 'Aplicável apenas a mobile-360');
  });

  test('MOBILE-A — popover de acessibilidade aberto', async ({ page }, testInfo) => {
    await gotoWithPrefs(page, { design: 'briefing' });
    const trigger = page.locator('[data-popover-trigger="a11y-popover"]');
    await trigger.click();
    await expect(page.locator('#a11y-popover')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(250);

    await page.screenshot({
      path: path.join(SCREENSHOTS, testInfo.project.name, 'mobile_popover_a11y.png'),
      fullPage: true,
    });
    await page.locator('.page-frame').screenshot({
      path: path.join(SCREENSHOTS, testInfo.project.name, 'mobile_popover_a11y_frame-only.png'),
    });
  });

  test('MOBILE-B — popover do usuário (hamburger) aberto', async ({ page }, testInfo) => {
    await gotoWithPrefs(page, { design: 'briefing' });
    const trigger = page.locator('[data-popover-trigger="user-menu-popover"]');
    await trigger.click();
    await expect(page.locator('#user-menu-popover')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(250);

    await page.screenshot({
      path: path.join(SCREENSHOTS, testInfo.project.name, 'mobile_popover_user.png'),
      fullPage: true,
    });
    await page.locator('.page-frame').screenshot({
      path: path.join(SCREENSHOTS, testInfo.project.name, 'mobile_popover_user_frame-only.png'),
    });
  });

  test('MOBILE-C — Escape fecha popover e devolve foco ao trigger', async ({ page }) => {
    await gotoWithPrefs(page, { design: 'briefing' });
    const trigger = page.locator('[data-popover-trigger="user-menu-popover"]');
    await trigger.click();
    await expect(page.locator('#user-menu-popover')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#user-menu-popover')).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('MOBILE-D — backdrop click fecha o popover', async ({ page }) => {
    await gotoWithPrefs(page, { design: 'briefing' });
    await page.locator('[data-popover-trigger="a11y-popover"]').click();
    await expect(page.locator('#a11y-popover')).toBeVisible();
    // O backdrop cobre toda a viewport, mas o popover está acima na pilha.
    // Clicamos numa coordenada (8, 8) que cai sobre o backdrop e fora do popover.
    await page.locator('.popover-backdrop').click({ position: { x: 8, y: 8 } });
    await expect(page.locator('#a11y-popover')).toBeHidden();
  });
});

/* =========================================================================
   Capturas em modo "?clean=1" (sem o Inspector) — para apresentação.
   ========================================================================= */

const CLEAN_SCENARIOS: Array<{ name: string; prefs: Prefs }> = [
  { name: 'CLEAN A1 — Briefing default (demo)', prefs: { design: 'briefing' } },
  { name: 'CLEAN A2 — Briefing alto contraste (demo)', prefs: { design: 'briefing', contrast: 'alto' } },
  { name: 'CLEAN A3 — Briefing tema escuro (demo)', prefs: { design: 'briefing', tema: 'escuro' } },
  { name: 'CLEAN B1 — Figma original (demo)', prefs: { design: 'figma' } },
];

for (const scenario of CLEAN_SCENARIOS) {
  test(scenario.name, async ({ page }, testInfo) => {
    await gotoWithPrefs(page, scenario.prefs, 'clean=1');

    const frame = page.locator('.page-frame');
    const label = 'clean_' + prefsLabel(scenario.prefs);

    await page.screenshot({
      path: path.join(SCREENSHOTS, testInfo.project.name, `${label}.png`),
      fullPage: true,
    });
    await frame.screenshot({
      path: path.join(SCREENSHOTS, testInfo.project.name, `${label}_frame-only.png`),
    });

    await expect(page.locator('.inspector')).toBeHidden();
    await expect(page.locator('.inspector-toggle')).toBeHidden();
    await expect(page.locator('.page-frame h1')).toHaveCount(1);
  });
}
