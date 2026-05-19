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
├── configuracoes.html          ← hub das configurações
├── configuracao.html           ← CRUD genérico (?slug=...)
├── css/
│   └── prototipo.css       ← layout custom sobre gov.br DS
├── js/
│   ├── app.js              ← bootstrap do dashboard
│   ├── storage.js          ← wrapper localStorage + Collection (CRUD)
│   ├── seeds.js            ← carrega data/*.json nas configurações
│   ├── demo-editais.js     ← rascunhos e modelos demo (PSE-EC, PS-Convênios)
│   ├── configuracao-schemas.js  ← definição declarativa das configurações
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
└── data/                   ← seeds JSON das configurações
```

## Modelo de etapa unificado

**Toda janela do edital é uma etapa**, em ordem cronológica. A configuração `TipoEtapa` distingue por categoria:

| Categoria | Exemplos | Pertence ao cálculo? | Tem peso/nota? | Tem recurso? |
|---|---|---|---|---|
| **ADMINISTRATIVA** | Inscrição, Homologação, Divulgação parcial, Divulgação final, Divulgação bonificação | Não | Não | Sim/Não (varia) |
| **AVALIATIVA** | Prova objetiva, Redação, Entrevista, Análise histórico, Carta intenção, Banca de heteroid., Banca biopsicossocial | Sim (default) | Sim | Sim/Não (varia) |
| **IMPORTACAO_AUTOMATICA** | Importação de notas ENEM (SiSU) | Sim | Não | Não |

Cada etapa tem janela início/fim (pode ser igual a 1 dia) e recurso opcional (`{inicio, fim}` ou `null`). Não existe "passo de cronograma" separado — tudo vive na lista única do passo Etapas.

## Configurações (16)

> **Vocabulário canônico INEP/MEC: "Atendimento Especializado"** (Edital ENEM nº 52/2025). Regra de caixa: Title Case ("Atendimento Especializado") apenas em títulos de tela, sidebar do wizard e label de campo na configuração; texto corrido usa minúsculas ("atendimento especializado"). Os antigos termos "atendimento especial / diferenciado" e "necessidade especial" foram descartados.

| Configuração | Entradas | Exemplo |
|---|---|---|
| **Unidades institucionais** | ~19 | UNIFESSPA, PROEG, CEPS, CRCA, CTIC + 11 institutos reais Unifesspa: ICH, ICE, ICSA, IEA, IEDAR, IEDS, IESB, IETU, IEX, IGE, ILLA (em produção: ~690 unidades migráveis dos legados). Campo `tipo` obrigatório classifica cada entrada (REITORIA, PRO_REITORIA, CENTRO, INSTITUTO, FACULDADE, DEPARTAMENTO, COORDENACAO, DIRETORIA, DIVISAO, NUCLEO, OUTRO) — independente da posição na árvore `parent_codigo` |
| **Tipos de edital** | 8 | SISU, PSIQ, PSE_EC, PSVR, PS_CONVENIOS, TRANSF_INT, TRANSF_EXT, PORTADOR_DIPLOMA |
| **Tipos de etapa** | 14 | 6 administrativas + 7 avaliativas + 1 importação automática |
| **Modalidades** | 12 | AC, V, LB_PPI, LB_Q, LB_PcD, LB_EP, LI_PPI, LI_Q, LI_PcD, LI_EP, PSIQ_I, PSIQ_Q |
| **Cursos** | ~50 | Combinação única (nome × grau × campus × turno) com `unidade_ofertante_codigo` (instituto/faculdade dona, distinto do campus físico) |
| **Cidades** | 6 | Cadastro enriquecido (IBGE, DDD, lat/long, mesorregião, Censo) — Marabá, Santana do Araguaia, São Félix do Xingu, Canaã dos Carajás, Rondon do Pará, Xinguara |
| **Campus** | 6 | Campi Unifesspa + polo de convênio (Canaã dos Carajás), com `tipo_campus` (UNIFESSPA vs CONVENIO) e lat/long |
| **Tipos de documento** | 18 | RG, CPF, histórico, declarações de pertencimento, laudos, comprovantes |
| **Tipos de deficiência (PcD)** | 11 | Configuração restrita Lei 13.146/2015 (LBI) + Resolução 64/2015 CONSEPE/Unifesspa — baixa visão, cegueira, deficiência física, surdez, surdocegueira, autismo (TEA+Asperger+Rett), altas habilidades, etc. |
| **Condições de atendimento especializado** | 10 | Categorias do item 4.2.1 do edital ENEM — PcD, dislexia, TDAH, discalculia, diabetes, classe hospitalar, gestante, lactante, idoso, outra condição específica |
| **Recursos de acessibilidade** | 17 | Adaptações na prova (item 4.2.2 INEP + extensões locais Unifesspa) — campo `origem` distingue INEP de UNIFESSPA_LOCAL; inclui tradutor de Libras, prova ampliada, prova em braile, leitor de tela, tempo adicional, calculadora, mesa sem braço, apoio para pernas/pés, etc. |
| **Critérios de desempate** | 9 | IDOSO_60, MAIOR_NOTA_ETAPA, MAIOR_IDADE, PROFESSOR_RURAL, MENOR_RENDA |
| **Obrigatoriedades legais** | 14 | 3 universais (INSCRICAO, HOMOLOGACAO, DIVULGACAO_FINAL) + regras por tipo |
| **Percentuais demográficos (IBGE)** | 1+ | Insumos da fórmula da Lei 12.711/2012 + 14.723/2023, congelados no snapshot |
| **Estratégias de balanceamento** | 3 | PERMITE_ESTOURO, REDUZIR_DE, REDUZIR_PROPORCIONAL_EM |
| **Cascatas de remanejamento** | 2+ | Portaria MEC 704/2025 (SiSU), Res. 532/2021 (PSIQ) |

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
[12] Atendimento especializado
[13] Revisão e publicação ← validação dinâmica + snapshot + hash
```

## Roteiro de demo (~30 min)

1. **Abertura (3 min)** — `index.html`. Premissa: configurações editáveis + obrigatoriedades como dado.
2. **Configurações (8 min)** — passar pelas 16, dar destaque ao **ObrigatoriedadeLegal** ("muda a lei → edita a configuração, sem deploy"), ao **TipoEtapa.categoria** (administrativa vs avaliativa) e à separação **TipoDeficiência / CondicaoAtendimentoEspecializado / RecursoAcessibilidade** (vocabulário INEP).
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
- A separação **Unidade × Campus × Cidade** reflete a hierarquia real Unifesspa?
- A divisão **TipoDeficiência + RecursoAcessibilidade + Atendimento Especializado no edital** (vocabulário INEP) facilita o trabalho do CEPS?
- Como o CEPS lida hoje com correção material de edital pós-publicação?

## Limites do protótipo

- **Sem backend nem auth.** Qualquer um que abrir vê os dados.
- **localStorage tem ~5–10 MB.** Edital com 200 cursos no Anexo I pode estourar. Em produção: PostgreSQL.
- **PDF não persistido** — apenas nome, tamanho e hash sha256 são gravados.
- **Sem testes automatizados.** Smoke tests manuais nos 3 navegadores antes da demo (Chrome/Firefox/Edge).
- **Acessibilidade básica.** Em produção: auditar com leitor de tela, validar WCAG 2.1 AA / e-MAG 3.1.
- **Modelo de oferta simplificado.** O protótipo modela `Curso → Instituto` direto, mas a realidade Unifesspa é `Curso → Faculdade → Instituto`, com cursos podendo ter ofertas em institutos diferentes por campus (Eng. Civil Marabá = IGE, Eng. Civil Santana = IEA; Matemática Marabá = ICE, Matemática Santana = IEA). F3 da entrevista vai modelar `Faculdade` e `OfertaCurso` completos.
- **Modalidades de oferta não cobertas.** A API institucional Unifesspa revela 7 modalidades reais: regular, intensivo, Forma Pará, Pepeti, Parfor, Parfor Equidade, Pronera. O protótipo cobre apenas a modalidade regular implícita — ver `.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/fonte-cursos-unifesspa-real.md`.
- **Cidades restritas a 6.** Protótipo cobre 6 cidades (campus + cidades de prova SiSU); produção precisa expandir para ~30+ municípios atendidos via turmas itinerantes (Forma Pará/Pepeti/Parfor cobrem cidades como Almeirim, Bannach, Eldorado, Floresta do Araguaia, Tucumã, etc.).
- **Polo de convênio modelado como `Campus` com flag `tipo_campus: CONVENIO`** — solução provisória; F3 deve nomear `Polo`/`LocalOferta` como entidade separada.

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
