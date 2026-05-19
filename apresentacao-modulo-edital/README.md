# Apresentação — Uni+ Módulo de Configuração de Edital

Apresentação HTML5 com **2 trilhas** (Negócio + Técnica) para apresentar a proposta de modelagem do módulo de configuração de edital ao time técnico CTIC e ao P.O. (CEPS + CRCA).

## Conteúdo

- **Capa + Agenda** (2 slides)
- **Parte 1 — Trilha de Negócio** (12 slides): problema, conceito Uni+, escopo, atores, fluxo wizard 13 passos, vocabulário institucional, vocabulário INEP, programas Unifesspa, modalidades/cotas, snapshot RN08, conformidade legal, fechamento
- **Parte 2 — Trilha Técnica** (14 slides): arquitetura, decisões binding, DER cadastros, DER configurações, LocalOferta + OfertaCurso, DER atendimento especializado, snapshot RN08 (código), obrigatoriedades data-driven, permissionamento OIDC, **matriz de permissões granular**, regras de autorização, LGPD by-design, roadmap, fechamento
- **Apêndices** (6 slides): dicionário de dados (cadastros + configurações), glossário, referências legislação, referências institucionais, artefatos internos
- **Encerramento** (1 slide)

Total: **~35 slides** com diagramas DER em Mermaid, matrizes, tabelas e código.

## Como rodar

```bash
# A partir desta pasta
python3 -m http.server 8080
# ou
npx --yes serve -p 8080
```

Abrir no navegador: <http://localhost:8080/>

**Atenção**: usa CDN para reveal.js + mermaid. Requer conexão na primeira execução.

## Atalhos de teclado

- `← → ↑ ↓` — navegar
- `F` — tela cheia
- `S` — modo notas do palestrante (segunda janela)
- `Esc` — visão geral de todos os slides
- `O` — toggle visão geral
- `B` ou `.` — tela preta (pausar)
- `Alt+click` — zoom

## Exportar PDF

1. Abrir `http://localhost:8080/?print-pdf` no Chrome/Edge
2. Aguardar renderização completa (mermaid demora ~5s)
3. `Ctrl+P` → "Salvar como PDF" → orientação paisagem, margens nenhuma

## Stack técnico

- **HTML5** + JavaScript vanilla (sem build)
- **reveal.js 5.1** via CDN jsdelivr
- **Mermaid 10.9** via CDN jsdelivr (para DERs e fluxos)
- **CSS custom** com paleta Gov.br DS (azul `#1351b4` + amarelo `#ffcd07`)
- **highlight.js** (via reveal plugin) para syntax highlighting de código

## Estrutura

```
apresentacao-modulo-edital/
├── index.html              ← apresentação (~35 slides)
├── css/
│   └── presentation.css    ← tema Gov.br + cards/tabelas/grids
├── js/
│   └── presentation.js     ← bootstrap reveal + mermaid
├── img/                    ← (vazio — reservado para assets)
└── README.md
```

## Fontes do conteúdo

O conteúdo desta apresentação destila o trabalho da sessão `configuracao-edital-mvp` em `.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/`:

- 3 propostas binding F2/F3 (`propostas-f2-f3/`)
- 7 rodadas de revisão crítica independente (Codex CLI + Claude Opus 4.7)
- Anexo F0 com 11 seções
- Visão Serviço de Endereço georef
- Fonte primária API Unifesspa (snapshot 2026-05-19)

Veja `RELATORIO-FINAL-SESSAO-AUTONOMA-2026-05-19.md` para contexto completo.

## Decisões binding referenciadas (R5–R8 + RN08)

- **R5**: "Área" → `Unidade` hierárquica (~690 entradas reais)
- **R6**: "Configuração" substitui "Parametrização" no domínio
- **R7**: Vocabulário OIDC canônico v3.3.2
- **R8**: Sem herança automática por hierarquia institucional
- **RN08**: Snapshot do edital congelado por SHA-256 determinístico

## Vocabulário canônico INEP/MEC

A apresentação usa exclusivamente:

- **"Atendimento Especializado"** (não "diferenciado", "especial", "necessidade especial") — Edital INEP nº 52/2025
- **"Tratamento pelo Nome Social"** (categoria separada — Decreto 8.727/2016)
- **"Recursos de Acessibilidade"** (catálogo de adaptações)

## Limites desta apresentação

- **Não substitui leitura dos artefatos detalhados** — é resumo executivo para apresentação ao vivo
- **Não é especificação formal** — propostas F2/F3 têm dezenas de páginas com pesquisa comparativa, plano de migração, riscos
- **Decisões em aberto** estão marcadas — 9 perguntas para o TL deliberar na próxima sessão F2/F3
- **Não cobre módulos futuros** (Ingresso, Auxílio, Pesquisa) — só Configuração de Edital
