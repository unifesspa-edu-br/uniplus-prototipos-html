# Protótipo — Cadastro de Edital via Wizard

Protótipo HTML5 standalone para validação do conceito de cadastro de edital com o P.O. (Jairo, CEPS) **antes** de comprometer tempo de desenvolvimento em produção.

## Escopo do protótipo

| | |
|---|---|
| **Quem usa** | Admin do CEPS (e equivalentes), configurando o edital |
| **Fase coberta** | Configuração e publicação do edital — formulação dos parâmetros |
| **Fase NÃO coberta** | Inscrição do candidato · ensalamento (alocação de salas/prédios) · aplicação de prova · processamento de notas · recursos · divulgação de resultados · matrícula |

Decisões parametrizadas aqui (como capacidade máxima por cidade, percentuais IBGE, estratégias de balanceamento) **declaram** comportamento que módulos posteriores vão **consumir**. O protótipo não simula o consumo desses parâmetros, só permite formalizá-los como dado congelável (RN08).

## Como executar

O protótipo usa **ES Modules** e **fetch** para carregar JSONs — isso exige um servidor HTTP local (não funciona abrindo direto via `file://`).

```bash
# A partir desta pasta
python3 -m http.server 8080
# ou
npx --yes serve -p 8080
```

Abrir no navegador: <http://localhost:8080/>

## Stack

- **HTML5 + JavaScript vanilla** (módulos ES6, sem framework)
- **Tema gov.br DS** via `@govbr-ds/core@3.7.1` (CDN jsDelivr)
- **Persistência:** `localStorage` (sem backend)
- **Hash de snapshot:** `crypto.subtle.digest('SHA-256')` nativo do navegador

## Estrutura

```
prototipo-cadastro-edital/
├── index.html              ← dashboard (4 cards)
├── editais.html            ← lista de editais (rascunhos + publicados)
├── editais-novo.html       ← wizard split view (13 passos)
├── edital.html             ← visualização readable do edital publicado
├── modelos.html            ← lista de modelos clonáveis
├── configuracoes.html          ← hub das 8 configurações
├── configuracao.html           ← CRUD genérico (?slug=...)
├── css/
│   └── prototipo.css       ← layout custom sobre gov.br DS
├── js/
│   ├── app.js              ← bootstrap do dashboard
│   ├── storage.js          ← wrapper localStorage + Collection (CRUD)
│   ├── seeds.js            ← carrega data/*.json nas configurações
│   ├── demo-editais.js     ← rascunhos e modelos demo (PSE-EC, PS-Convênios)
│   ├── configuracao-schemas.js  ← definição declarativa das 8 configurações
│   ├── configuracao.js     ← render genérico de CRUD
│   ├── wizard-steps.js     ← metadata dos 13 passos
│   ├── wizard.js           ← controlador (estado, navegação, autosave)
│   ├── validator.js        ← engine de validação dinâmica (ObrigatoriedadeLegal)
│   ├── snapshot.js         ← gera snapshot consolidado + hash sha256
│   ├── clone.js            ← snapshot → estado do wizard (modelos / clone)
│   ├── visualizar-edital.js ← render do edital publicado
│   ├── dom.js              ← helpers de DOM compartilhados
│   ├── toast.js            ← feedback visual
│   └── steps/              ← passo-01-tipo.js a passo-13-revisao.js
└── data/                   ← seeds JSON das 8 configurações
```

## Modelo de etapa unificado

**Toda janela do edital é uma etapa**, em ordem cronológica. A configuração `TipoEtapa` distingue por categoria:

| Categoria | Exemplos | Pertence ao cálculo? | Tem peso/nota? | Tem recurso? |
|---|---|---|---|---|
| **ADMINISTRATIVA** | Inscrição, Homologação, Divulgação parcial, Divulgação final, Divulgação bonificação | Não | Não | Sim/Não (varia) |
| **AVALIATIVA** | Prova objetiva, Redação, Entrevista, Análise histórico, Carta intenção, Banca de heteroid., Banca biopsicossocial | Sim (default) | Sim | Sim/Não (varia) |
| **IMPORTACAO_AUTOMATICA** | Importação de notas ENEM (SiSU) | Sim | Não | Não |

Cada etapa tem janela início/fim (pode ser igual a 1 dia) e recurso opcional (`{inicio, fim}` ou `null`). Não existe "passo de cronograma" separado — tudo vive na lista única do passo Etapas.

## Configurações (8)

| Configuração | Entradas | Exemplo |
|---|---|---|
| **Tipos de edital** | 8 | SISU, PSIQ, PSE_EC, PSVR, PS_CONVENIOS, TRANSF_INT, TRANSF_EXT, PORTADOR_DIPLOMA |
| **Modalidades** | 12 | AC, V, LB_PPI, LB_Q, LB_PcD, LB_EP, LI_PPI, LI_Q, LI_PcD, LI_EP, PSIQ_I, PSIQ_Q |
| **Tipos de etapa** | 14 | 6 administrativas + 7 avaliativas + 1 importação automática |
| **Cidades de prova** | 6 | Marabá, Santana do Araguaia, São Félix do Xingu, Canaã dos Carajás, Rondon do Pará, Xinguara |
| **Necessidades especiais** | 12 | Gravidez, amamentação, cadeirante, baixa visão, cegueira, mobilidade reduzida, surdez, autismo, TDAH, etc. |
| **Tipos de documento** | 18 | RG, CPF, histórico, declarações de pertencimento, laudos, comprovantes |
| **Critérios de desempate** | 9 | IDOSO_60, MAIOR_NOTA_ETAPA, MAIOR_IDADE, PROFESSOR_RURAL, MENOR_RENDA |
| **Obrigatoriedades legais** | 14 | 3 universais (INSCRICAO, HOMOLOGACAO, DIVULGACAO_FINAL) + regras por tipo |

## Wizard (13 passos)

```
[1]  Tipo do edital
[2]  Identificação (com PDF)
[3]  Modalidades
[4]  Vagas
[5]  Etapas (todas — administrativas, avaliativas, importação)
[6]  Fórmula e precisão
[7]  Bônus (opcional)
[8]  Desempate
[9]  Eliminação
[10] Documentos por modalidade
[11] Cidades de prova
[12] Atendimento especial
[13] Revisão e publicação ← validação dinâmica + snapshot + hash
```

## Roteiro de demo (~30 min)

1. **Abertura (3 min)** — `index.html`. Premissa: configurações editáveis + obrigatoriedades como dado.
2. **Configurações (8 min)** — passar pelos 8, dar destaque ao **ObrigatoriedadeLegal** ("muda a lei → edita a configuração, sem deploy") e ao **TipoEtapa.categoria** (administrativa vs avaliativa).
3. **Cadastro do zero (10 min)** — PSE Educação do Campo: `Editais → + Novo edital → Em branco`. Passar pelos 13 passos. No passo Etapas, mostrar como inscrição/homologação/divulgação são etapas como qualquer outra. Mostrar painel de validações em [13]. Publicar. Exportar JSON.
4. **Modelos (5 min)** — `Salvar como modelo` → ir em `Modelos` → `Usar este modelo` → criar segundo edital com hash diferente.
5. **Reality check com SiSU 2026 (3 min)** — abrir o rascunho **"SiSU 2026"** (Edital nº 26/2025-CEPS, 1.345 vagas / 40 cursos / 5 campi, dados reais do Anexo I publicado em 23/12/2025). Mostra o protótipo lidando com escala real: passo Vagas com tabela cheia, modalidades completas (AC + V + 8 cotas), concorrência dupla, etapa de importação automática ENEM, sem locais de prova (homologação documental no CRCA).
6. **Discussão (4 min)** — checklist de feedback (passos, campos, terminologia, obrigatoriedades, edição pós-publicação).

## Pontos a validar com o P.O.

- Os 13 passos cobrem o que o CEPS faz hoje? Falta algum?
- O modelo de "tudo é etapa" faz sentido? Ou cronograma como tabela separada é mais natural pro CEPS?
- Os campos de cada passo batem com a realidade?
- A configuração `ObrigatoriedadeLegal` cobre as regras que o jurídico costuma sinalizar?
- Modelos por tipo de edital fariam sentido pra equipe do CEPS?
- Termo "atendimento especial" vs "necessidade especial" vs "atendimento diferenciado" — qual o canônico?
- Como o CEPS lida hoje com correção material de edital pós-publicação?

## Limites do protótipo

- **Sem backend nem auth.** Qualquer um que abrir vê os dados.
- **localStorage tem ~5–10 MB.** Edital com 200 cursos no Anexo I pode estourar. Em produção: PostgreSQL.
- **PDF não persistido** — apenas nome, tamanho e hash sha256 são gravados.
- **Sem testes automatizados.** Smoke tests manuais nos 3 navegadores antes da demo (Chrome/Firefox/Edge).
- **Acessibilidade básica.** Em produção: auditar com leitor de tela, validar WCAG 2.1 AA / e-MAG 3.1.

## Fontes consultadas (não modificar)

Documentação fonte de verdade no `repositories/uniplus-docs/`:

- `docs/adrs/ADR-028-motor-de-classificacao-como-servicos-de-dominio-puros.md`
- `docs/exemplos/configuracao-calculo/edital-pse-canaa-2026.json`
- `docs/schemas/configuracao-processamento-resultado.schema.v1.json`
- `docs/base-conhecimento/sistema-cotas-e-vagas.md`
- `docs/base-conhecimento/notas-classificacao-resultado.md`
- `docs/catalogo-primitivas-processamento-resultado.md`
- `docs/guia-motor-classificacao.md`
- `PROPOSTA PARA O NOVO SISTEMA DO CEPS_CRCA.md`

Padrões de produção do `repositories/uniplus-api/`:

- `docs/adrs/0013-motor-de-classificacao-como-servicos-de-dominio-puros.md` (canônica)

## Plano original

Ver `~/.claude/plans/minha-ideia-para-isso-cosmic-axolotl.md`.
