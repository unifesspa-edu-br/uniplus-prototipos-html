# Protótipo · Home Portal do Candidato (primeiro acesso)

> Bancada de inspeção visual e de acessibilidade para a **home autenticada
> do Portal do Candidato** Uni+, no estado vazio (primeiro acesso, sem
> inscrições).

**Foco:** validar **conceito visual e acessibilidade**, não fluxo. A página
não navega para lugar nenhum — ela existe para que stakeholders comparem
duas hipóteses de design (Figma original × briefing UX aplicado) sob
todas as condições de acessibilidade que o produto vai atender.

## Para que serve

| Pergunta que ajuda a responder | Como |
|---|---|
| O ajuste de tipografia (Rawline + Public Sans, escala tokenizada, cinza AAA) é **visualmente aceitável**? | Toggle "Figma original" ↔ "Briefing aplicado" no Inspector. |
| Em **alto contraste**, o que aparece está adequado para baixa visão? | Botão "Alto contraste" da AccessibilityBar — paleta dedicada 7:1+. |
| O **modo escuro** preserva hierarquia? | Botão "Tema escuro" — paleta dedicada, não filtro CSS. |
| **Atkinson Hyperlegible** como fonte alternativa funciona para nosso público? | Botão "Fonte legível" — troca a fonte sem mexer no resto. |
| A escala A−/A/A+ quebra o layout? | Botões A−/A/A+ — multiplicador no `font-size` do root. |
| Layout aguenta **mobile 360px**? | Botões de viewport simulado no Inspector. |
| Quais combinações cor-texto/fundo passam em **WCAG AAA**? | Tabela "Contraste WCAG" do Inspector — calculada em tempo real para o modo ativo. |

## Como rodar

### Recomendado (com banner instrutivo)

```bash
cd prototipo-portal-candidato-home
npm install   # uma vez — instala dependências de teste
npm start     # sobe o servidor + imprime URLs e roteiro de teste
```

O banner imprime:
- URL principal (com Inspector) e modo demo `?clean=1`
- 4 cenários sugeridos para validar manualmente (alternar Figma↔Briefing,
  combinar toggles de a11y, simular mobile no DevTools, testar popovers)
- `Ctrl+C` para parar

Porta default `8765`; override com `PORT=4000 npm start`. Se a porta
estiver ocupada, busca a próxima livre automaticamente.

### Mínimo (sem npm)

```bash
cd prototipo-portal-candidato-home
python3 -m http.server 8765
# abrir http://localhost:8765/
```

> Não tem build step. ES modules diretos do navegador. Funciona offline
> a partir do segundo carregamento (tudo em cache).

## Roteiro de demonstração (≈ 8 min)

1. **Abrir em desktop com modo "Briefing aplicado".**
   Mostrar a tela: GovBrBar, AccessibilityBar, header Uni+, sub-nav,
   boas-vindas, card vazio, "Como funciona", footer.

2. **No Inspector, alternar para "Figma original".**
   Apontar o que muda visualmente: tipografia (Inter), cinza secundário
   mais claro, espaçamento mais apertado. Mostrar a aba "Diferenças que o
   briefing aplica" — 7 mudanças justificadas.

3. **Mostrar a tabela de Contraste WCAG.**
   Em "Briefing aplicado", "Secundário/fundo" passa AAA. Em "Figma
   original", o mesmo par cai para AA. Argumento direto para Sr. Pedro
   e Dona Marta (personas com baixa visão do briefing-ux).

4. **Ativar Alto contraste.**
   Mostrar a paleta 7:1+ com amarelo institucional sobre preto. Voltar.

5. **Ativar Fonte legível.**
   Atkinson Hyperlegible substitui a fonte. Notar que letras que mais
   confundem (I, l, 1, O, 0, "rn") ficam claramente distintas.

6. **Simular mobile 360.**
   Cards "Como funciona" empilham. Header Uni+ se reorganiza. Touch
   targets ≥44px continuam acessíveis.

7. **Combinar A+ com Alto contraste com Fonte legível.**
   Mostrar que os modos compõem — não excludentes. Esse é o caso real
   da Dona Marta de 62 anos com glaucoma.

8. **Reset.** Discussão.

## O que está propositalmente fora deste protótipo

- Estado com **lista de inscrições** (Story sucessora — fora do escopo do
  Figma atual e do CA-10 da Story #233).
- Fluxo de **clique** no CTA "Ver editais abertos" (anchor `#`).
- **Listagem de editais**, **wizard**, **dashboard de acompanhamento** —
  outros protótipos.
- **Backend mock**, **MSW**, **localStorage de inscrições** — não-fluxo.
- **Validação de formulário** — não tem formulário aqui.

## Persistência

O Inspector guarda as preferências em `localStorage` com prefixo
`uniplus.proto.home.*`. O botão "Resetar preferências" do Inspector limpa
todas. **Nenhum dado pessoal é gravado** — apenas estado da UI.

## Acessibilidade do próprio protótipo

A bancada de inspeção foi auditada para os mesmos padrões que ela mede:

- Skip link "Pular para o conteúdo principal".
- Foco visível Gov.br (overlay dourado tracejado #c2850c, 4px) em todo
  elemento interativo, incluindo botões do Inspector.
- Botões com `aria-pressed` refletindo estado.
- Inspector tem `aria-label` e seções com `<h3>` semântico.
- Tabela de contraste tem swatches reais com `aria-label` quando aplicável.
- Mobile (≤1199px): Inspector vira drawer flutuante acionado por botão.

## Estrutura

```
prototipo-portal-candidato-home/
├── README.md              ← este arquivo
├── index.html             ← entry point + bancada Inspector
├── css/
│   ├── tokens.css         ← foundation Gov.br + escala briefing + modos a11y
│   ├── components.css     ← estilos da página real do portal
│   └── inspector.css      ← painel Inspector
└── js/
    ├── prefs.js           ← localStorage helper
    ├── contrast.js        ← cálculo WCAG (relativeLuminance)
    └── inspector.js       ← bancada (toggles, refresh, viewport)
```

## Decisões mapeadas em ADR / Story

- ADR-0019 (uniplus-web) — foundation Gov.br tokens.
- ADR-0018 (uniplus-web) — PrimeNG unstyled + Gov.br PassThrough.
- Briefing UX canônico — `uniplus-web/docs/design-system/briefing-ux.md`.
- Story #233 (uniplus-web) — Home autenticada do Portal do Candidato.
- Tasks #234–#241 (uniplus-web) — decomposição da Story #233.

## Próximos passos após validação

1. Apresentar para Diretora CTIC + designer UX em call (Google Meet).
2. Capturar decisões: tipografia (Rawline confirmada? trocar fallback de
   Raleway por Public Sans?), inclusão do toggle Atkinson, escala AAA.
3. Cada decisão não-óbvia vira ADR em `uniplus-web/docs/adrs/`.
4. Implementação real entra como tasks de #233 no `uniplus-web` (Angular
   21 + PrimeNG unstyled + Tailwind 4 lendo as mesmas variáveis).

## Referências externas

- [WCAG 2.1 — Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG21/)
- [e-MAG 3.1 — Modelo de Acessibilidade em Governo Eletrônico](https://emag.governoeletronico.gov.br/)
- [Gov.br Design System](https://www.gov.br/ds)
- [Atkinson Hyperlegible — Braille Institute](https://brailleinstitute.org/freefont)
