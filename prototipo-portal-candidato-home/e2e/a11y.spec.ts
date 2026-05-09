/**
 * Auditoria axe-core nos modos de design e estados de acessibilidade
 * críticos. Salva relatório JSON consolidado em
 * test-results/a11y/<viewport>/<label>.json.
 *
 * Estratégia: rodar axe escopado ao .page-frame (a tela real do portal),
 * excluindo o .inspector — o Inspector não é parte do produto, e poluir o
 * relatório com violations dele esconde o que importa.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotoWithPrefs, type Prefs } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Mantemos os relatórios FORA do outputDir do Playwright (que é apagado antes de cada run)
const A11Y_DIR = path.resolve(__dirname, '../a11y-reports');

interface Scenario {
  name: string;
  prefs: Prefs;
}

const SCENARIOS: Scenario[] = [
  { name: 'briefing-default', prefs: { design: 'briefing' } },
  { name: 'briefing-altocontraste', prefs: { design: 'briefing', contrast: 'alto' } },
  { name: 'briefing-escuro', prefs: { design: 'briefing', tema: 'escuro' } },
  { name: 'briefing-fonte-legivel', prefs: { design: 'briefing', fonte: 'legivel' } },
  { name: 'figma-default', prefs: { design: 'figma' } },
];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

for (const scenario of SCENARIOS) {
  test(`axe — ${scenario.name}`, async ({ page }, testInfo) => {
    await gotoWithPrefs(page, scenario.prefs);

    const results = await new AxeBuilder({ page })
      .include('.page-frame')
      .exclude('.inspector')
      .withTags(TAGS)
      .analyze();

    // Persiste relatório JSON
    const dir = path.join(A11Y_DIR, testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${scenario.name}.json`),
      JSON.stringify(
        {
          scenario: scenario.name,
          viewport: testInfo.project.name,
          url: page.url(),
          summary: {
            violations: results.violations.length,
            passes: results.passes.length,
            incomplete: results.incomplete.length,
            inapplicable: results.inapplicable.length,
          },
          violations: results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags,
            nodes: v.nodes.length,
            firstNode: v.nodes[0]?.html?.slice(0, 200),
            firstFailureSummary: v.nodes[0]?.failureSummary,
          })),
          incomplete: results.incomplete.map((v) => ({
            id: v.id,
            help: v.help,
            nodes: v.nodes.length,
          })),
        },
        null,
        2
      )
    );

    // Veredicto: zero violations sérias/críticas
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    if (serious.length > 0) {
      // Deixa visível no log da run o que falhou
      const summary = serious
        .map((v) => `[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} ocorrência(s))`)
        .join('\n  ');
      console.log(`\n❌ ${scenario.name} @ ${testInfo.project.name}:\n  ${summary}\n`);
    } else {
      console.log(
        `✅ ${scenario.name} @ ${testInfo.project.name}: 0 violations sérias/críticas (${results.violations.length} totais menores).`
      );
    }

    expect(serious, `${scenario.name} @ ${testInfo.project.name} tem violations sérias/críticas`).toEqual([]);
  });
}
