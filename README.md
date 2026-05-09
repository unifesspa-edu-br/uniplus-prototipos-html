# Uni+ — Protótipos HTML

Repositório guarda-chuva para protótipos navegáveis usados na validação de conceitos com stakeholders do Uni+ (Sistema Unificado Unifesspa) **antes** da implementação em produção (`uniplus-api` + `uniplus-web`).

Cada protótipo é HTML5 standalone com tema [gov.br Design System](https://www.gov.br/ds), JavaScript vanilla e persistência em `localStorage` — sem backend, sem framework, sem build step.

## Por que protótipos?

Validar com o P.O. (CEPS, CRCA, PROEG) **conceitos, fluxo e terminologia** antes de comprometer tempo de desenvolvimento em produção. Protótipos são descartáveis: a aprovação vira ADR no `uniplus-api/docs/adrs/` ou `uniplus-docs/docs/adrs/`, e a implementação acontece nos repositórios canônicos.

## Como usar

Cada protótipo é uma pasta independente com seu próprio `README.md` e instruções de execução. Em geral:

```bash
cd <pasta-do-prototipo>
python3 -m http.server 8765
# ou
npx --yes serve -p 8765
```

E abrir <http://localhost:8765/> no navegador.

## Protótipos

| Pasta | Foco | Tema | Status | Stakeholder |
|---|---|---|---|---|
| [`prototipo-cadastro-edital/`](prototipo-cadastro-edital/) | Fluxo | Wizard de cadastro de edital com 13 passos, catálogos editáveis e validações dinâmicas (obrigatoriedades legais como dado, não código) | Pronto para apresentação | Jairo (P.O. CEPS) |
| [`prototipo-portal-candidato-home/`](prototipo-portal-candidato-home/) | Conceito visual + a11y | Home autenticada do Portal do Candidato (primeiro acesso, estado vazio). Bancada de inspeção comparando Figma original × briefing UX aplicado, com toggles de a11y (alto contraste, escuro, fonte Atkinson Hyperlegible, A−/A/A+, viewport mobile/tablet/desktop) e contraste WCAG calculado em tempo real | Pronto para apresentação | CTIC + designer UX |

## Diretrizes para novos protótipos

1. **Padrão da pasta:**
   ```
   <slug-do-prototipo>/
   ├── README.md         ← contexto, como rodar, roteiro de demo
   ├── index.html        ← entry point
   ├── css/
   ├── js/
   └── data/             ← seeds JSON quando aplicável
   ```

2. **Stack mínima:** HTML5 + JS módulos ES6 + tema gov.br DS via CDN. Sem build step, sem framework.

3. **Persistência:** `localStorage` com chaves prefixadas (`uniplus.*`).

4. **Acessibilidade:** WCAG 2.1 AA + e-MAG 3.1 (autarquia federal). Use os tokens do gov.br DS.

5. **Idioma:** pt-BR em todas as strings user-facing. Termos técnicos de senso comum (upload, download, dashboard, login, deploy) ficam em inglês sem tradução.

6. **Após validação com o P.O.:**
   - Registrar a decisão em ADR no repositório canônico (`uniplus-api/docs/adrs/` ou `uniplus-docs/docs/adrs/`)
   - O protótipo permanece aqui como histórico
   - Implementação real vai para `uniplus-api` + `uniplus-web`

## Repositórios relacionados

- [unifesspa-edu-br/uniplus-api](https://github.com/unifesspa-edu-br/uniplus-api) — Backend .NET 10
- [unifesspa-edu-br/uniplus-web](https://github.com/unifesspa-edu-br/uniplus-web) — Frontend Angular 21
- [unifesspa-edu-br/uniplus-docs](https://github.com/unifesspa-edu-br/uniplus-docs) — Especificações, ADRs, normas

## Licença

Veja [`LICENSE`](LICENSE).
