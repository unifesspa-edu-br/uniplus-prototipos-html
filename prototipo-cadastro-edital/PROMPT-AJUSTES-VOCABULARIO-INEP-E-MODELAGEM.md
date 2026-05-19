# PROMPT — Ajustes no protótipo: vocabulário INEP + modelagem real de cadastros

> ⚠️ **STATUS: EXECUTADO COM AJUSTES PÓS-REVISÃO (2026-05-18)**
>
> Este prompt foi executado por um agente em 2026-05-18 e revisado em 2 rodadas independentes:
> - Codex Round 1 → 4 P0 + 5 P1 + 5 P2
> - Codex Round 2 (pós-correção C1-C11) → fechamento parcial + regressões
> - Claude Opus Round 1 → 11 achados complementares
>
> **Não use este prompt como instrução executável para nova rodada sem cruzar com**:
> - `.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/feedback-codex-round2-2026-05-18.md`
> - `.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/feedback-claude-opus-round1-2026-05-18.md`
> - `.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/fonte-cursos-unifesspa-real.md`
> - `.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/analise-prototipo-cadastro-edital.md`
>
> Trechos de T6 (formato `state.edital.atendimentoEspecializado.{deficiencias_aceitas, recursos_oferecidos}` sem `oferta`) e parte de T3 (5 unidades inventadas ICE/IESB/IESA/IETU/IGE) foram **substituídos pela estrutura final** descrita nos artefatos de governança. Mantemos este prompt como histórico de execução.

> **Para o agente executor**: este documento descreve **completamente** o que precisa ser feito no protótipo `prototipo-cadastro-edital/`. Não há contexto implícito além deste arquivo, dos documentos referenciados na § 1 e do código atual do protótipo. Implemente exatamente o que está descrito — quando houver ambiguidade, pergunte antes de inventar.

---

## § 1 — Contexto mínimo necessário

### O que é este protótipo

HTML5 standalone (sem framework, sem build) para validar com o P.O. (Jairo, CEPS) o conceito de **cadastro de edital** antes de implementar em produção (`uniplus-api` + `uniplus-web`). Roda servindo por HTTP local (`python3 -m http.server 8080`), usa `localStorage` para persistência, `crypto.subtle` para hash SHA-256, ES Modules + fetch.

Leia antes de começar:

1. `README.md` (raiz desta pasta) — escopo, stack, estrutura.
2. `CLAUDE.md` (raiz desta pasta) — arquitetura, premissas, convenções.
3. `../../../.compozy/governanca/configuracao-edital-mvp/fase-0-diagnostico/analise-prototipo-cadastro-edital.md` — **anexo de governança binding** com TODAS as decisões TL que motivam este trabalho. É a fonte canônica.

### Por que estes ajustes

Análise do protótipo cruzada com decisões binding do Tech Lead identificou 5 distorções que precisam ser corrigidas antes da demo com P.O.:

1. **`seed-cidades-prova.json`** está nomeado errado — é cadastro genérico de Cidade.
2. **`Campus` não existe como entidade** — protótipo achata em Cidade.
3. **`Unidade` (hierarquia institucional, R5)** não existe — protótipo trata configurações como globais sem dona.
4. **`seed-necessidades.json`** mistura 3 conceitos ortogonais (deficiência + recurso de acessibilidade + condição não-PcD) usando vocabulário inventado.
5. **Vocabulário "Atendimento Especial"** não é canônico — INEP/MEC usa **"Atendimento Especializado"** (Edital ENEM nº 52/2025).

Estas correções alinham o protótipo com o modelo conceitual que vai virar produção em `uniplus-api`.

### O que NÃO mudar (regras rígidas)

- **Não introduzir framework** (Angular, React, Vue, Lit). Continua HTML5 + ES Modules + JS vanilla.
- **Não introduzir build step** (Vite, Webpack, Rollup). Continua servindo por HTTP local direto.
- **Não introduzir backend, auth nem perfis**. O protótipo é deliberadamente sem segurança — Decisão TL: "o protótipo é exemplo do que é necessário para configurar um edital, não modelo de segurança/perfis".
- **Não adicionar dependências CDN além das já presentes** (`@govbr-ds/core@3.7.1`).
- **Não adicionar testes automatizados**. Smoke test manual em Chrome/Firefox/Edge é o único critério.
- **Não traduzir nada que esteja em pt-BR**. Strings user-facing continuam em pt-BR com acentuação correta.
- **Não tocar nas configurações de regra** que NÃO estão na lista de tarefas (tipos-edital, modalidades, tipos-etapa, criterios-desempate, percentuais-ibge, cascatas-remanejamento, estrategias-balanceamento, tipos-documento mantêm-se como estão).
- **Não mexer no snapshot/hash logic** além do que está explicitamente descrito (denormalização das novas entidades).
- **Não traduzir templates externos** (não há aqui, mas vale a regra geral do projeto).
- **Não criar commits** — apenas faça as mudanças. O TL decide quando commitar.

---

## § 2 — Decisões binding (não-negociáveis)

| # | Decisão | Origem |
|---|---|---|
| D1 | `Cidade` é entidade única reutilizável (cidade do candidato, cidade do campus, cidade de prova, etc.). "Cidade de prova" é uso contextual no edital, não entidade. | Decisão TL 2026-05-18 |
| D2 | `Campus` é entidade separada com `cidade` como atributo FK. `Curso` aponta para `Campus`, não para `Cidade`. | Decisão TL 2026-05-18 |
| D3 | `Unidade` é entidade hierárquica (auto-FK `parent_id`), até 6 níveis. `Edital.unidadeDona` referencia `Unidade`. ~690 entradas reais nos legados Unifesspa. | Decisão TL 2026-05-17 (R5) |
| D4 | Termo canônico do INEP/MEC para o conjunto de adaptações na prova: **"Atendimento Especializado"**. Descartar sem tolerância: "atendimento diferenciado", "atendimento especial", "necessidade especial". | Decisão TL 2026-05-18, fonte: [Edital ENEM nº 52/2025](https://download.inep.gov.br/enem/edital_52_de_23_de_maio_de_2025.pdf) + [INEP gov.br](https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/saiba-como-solicitar-atendimento-especializado-no-enem) |
| D5 | Três entidades ortogonais (não unir): **`TipoDeficiencia`** (configuração PcD) + **`RecursoAcessibilidade`** (configuração de adaptações) + **`SolicitacaoAtendimentoEspecializado`** (transação, modelada apenas como uso contextual no edital — não vira CRUD próprio no protótipo). | Decisão TL 2026-05-18 |
| D6 | "Tratamento pelo nome social" é categoria separada de Atendimento Especializado (categoria/prazo próprio no INEP). **Fora do escopo deste prompt** — apenas não confundir. | INEP |
| D7 | Cadastros institucionais (Unidade/Curso/Campus/Cidade) têm CRUD admin no MVP. Kafka/SIGAA é integração futura complementar, não substituto. | Decisão TL 2026-05-18 |

---

## § 3 — Tarefas (executar em ordem)

Cada tarefa é independente em commit (mas você não comita — só implementa). A ordem minimiza risco: cadastros base primeiro, depois junções, depois UI, depois snapshot/validator.

### T1 — Renomear `cidades-prova` para `cidades` (cadastro genérico)

**Objetivo**: corrigir o nome da entidade. O arquivo `seed-cidades-prova.json` é, na verdade, o cadastro genérico de Cidade — não a seleção de cidades aceitas pelo edital.

**Mudanças**:

1. **Renomear arquivo**: `data/seed-cidades-prova.json` → `data/seed-cidades.json`. Conteúdo permanece igual (Marabá, Santana do Araguaia, São Félix do Xingu, Canaã dos Carajás, Rondon do Pará, Xinguara).
2. **`js/storage.js`**:
   - Renomear `Keys.CIDADES_PROVA: 'configuracao.cidades-prova'` → `Keys.CIDADES: 'configuracao.cidades'`.
3. **`js/seeds.js`**:
   - Atualizar entrada `{ url: 'data/seed-cidades-prova.json', key: Keys.CIDADES_PROVA }` → `{ url: 'data/seed-cidades.json', key: Keys.CIDADES }`.
4. **`js/configuracao-schemas.js`**:
   - Renomear slug `'cidades-prova'` → `'cidades'`.
   - Atualizar `titulo` para "Cidades" (sem "de prova").
   - Atualizar `descricao` para: `'Cadastro de cidades reutilizável por qualquer parte do sistema (cidade do candidato, cidade onde fica o campus, cidade aceita para aplicação de prova no edital). <strong>Não confunda com "cidades de prova" — esse é um uso contextual no edital onde o admin escolhe quais Cidades cadastradas aceitam aplicação de prova.</strong>'`.
   - Atualizar `key: Keys.CIDADES_PROVA` → `key: Keys.CIDADES`.
   - Atualizar `ORDEM_CONFIGURACOES`: substituir `'cidades-prova'` por `'cidades'` (mantém mesma posição).
   - Em **`cursos`** (configuração): atualizar todas as refs `refKey: 'cidades-prova'` para nova entidade `Campus` (ver T2/T4 — campo `campus_codigo` muda de ref).
5. **Buscar e substituir** todas as ocorrências restantes de `cidades-prova` em todo o repositório:
   ```bash
   grep -rln "cidades-prova" . --exclude="PROMPT-*.md" --exclude="analise-prototipo-cadastro-edital.md"
   ```
   Atualizar cada uma. Atenção em: `js/snapshot.js`, `js/clone.js`, `js/visualizar-edital.js`, `js/steps/passo-11-cidades.js`, `js/steps/passo-04-vagas.js`, qualquer HTML que mencione.
6. **Não renomear** o passo 11 do wizard ("Cidades de prova" pode continuar — é o uso contextual no edital, não o nome da configuração).

**Critério de aceitação**:
- `grep -rln "cidades-prova" . --exclude="PROMPT-*.md" --exclude="analise-prototipo-cadastro-edital.md"` retorna 0 resultados (exceto neste prompt e docs históricos).
- `Keys.CIDADES` é referenciado em vez de `Keys.CIDADES_PROVA`.
- Configuração no hub aparece como "Cidades" (link `configuracao.html?slug=cidades`).
- Resetar dados (botão "Resetar dados" na home) e confirmar que a configuração popula com as 6 entradas.

---

### T2 — Adicionar entidade `Campus`

**Objetivo**: criar entidade própria entre Cidade e Curso. Campus tem identidade independente de Cidade.

**Mudanças**:

1. **Criar `data/seed-campus.json`** com os 5 campi reais Unifesspa. Use os endereços que já aparecem no `seed-cidades-prova.json` original (eles são, na verdade, endereços de campus/locais de prova — separe Cidade pura de Campus aqui):

   ```json
   [
     {
       "codigo": "MARABA",
       "nome": "Campus de Marabá",
       "cidade_codigo": "MARABA",
       "endereco": "Folha 31, Quadra 07, Lote Especial, s/n.º - Nova Marabá",
       "cep": "68507-590",
       "observacoes": "Sede principal da Unifesspa."
     },
     {
       "codigo": "SANTANA_DO_ARAGUAIA",
       "nome": "Campus de Santana do Araguaia",
       "cidade_codigo": "SANTANA_DO_ARAGUAIA",
       "endereco": null,
       "cep": null,
       "observacoes": ""
     },
     {
       "codigo": "SAO_FELIX_DO_XINGU",
       "nome": "Campus de São Félix do Xingu",
       "cidade_codigo": "SAO_FELIX_DO_XINGU",
       "endereco": null,
       "cep": null,
       "observacoes": ""
     },
     {
       "codigo": "RONDON_DO_PARA",
       "nome": "Campus de Rondon do Pará",
       "cidade_codigo": "RONDON_DO_PARA",
       "endereco": null,
       "cep": null,
       "observacoes": ""
     },
     {
       "codigo": "XINGUARA",
       "nome": "Campus de Xinguara",
       "cidade_codigo": "XINGUARA",
       "endereco": null,
       "cep": null,
       "observacoes": ""
     }
   ]
   ```

   **Atenção**: Canaã dos Carajás está em `seed-cidades.json` (cidade genérica) mas NÃO é campus Unifesspa — é cidade de convênio/prova externa. Não incluir no seed-campus.

2. **`js/storage.js`**: adicionar em `Keys`: `CAMPUS: 'configuracao.campus'`.

3. **`js/seeds.js`**: adicionar entrada `{ url: 'data/seed-campus.json', key: Keys.CAMPUS }` na lista `SEEDS`.

4. **`js/configuracao-schemas.js`**: adicionar configuração `campus`:

   ```js
   campus: {
     titulo: 'Campus',
     descricao: 'Unidades físicas Unifesspa. Cada campus está localizado em uma <strong>Cidade</strong> cadastrada. Cursos são oferecidos em um campus específico.',
     icone: '🏛️',
     key: Keys.CAMPUS,
     colunas: [
       { campo: 'codigo', label: 'Código' },
       { campo: 'nome', label: 'Nome' },
       { campo: 'cidade_codigo', label: 'Cidade' },
       { campo: 'endereco', label: 'Endereço' },
     ],
     campos: [
       { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único, ex.: MARABA, SANTANA_DO_ARAGUAIA.' },
       { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
       {
         campo: 'cidade_codigo',
         label: 'Cidade',
         tipo: 'ref',
         refKey: 'cidades',
         refValue: 'codigo',
         refLabel: 'nome',
         required: true,
         hint: 'Cidade onde o campus está localizado. Vem de Configurações › Cidades.',
       },
       { campo: 'endereco', label: 'Endereço', tipo: 'text' },
       { campo: 'cep', label: 'CEP', tipo: 'text', maxlength: 9 },
       { campo: 'observacoes', label: 'Observações', tipo: 'textarea' },
     ],
   },
   ```

5. **Adicionar `'campus'` em `ORDEM_CONFIGURACOES`** logo após `'cidades'`.

**Critério de aceitação**:
- Após reset, `configuracao.html?slug=campus` lista 5 campi.
- Cada campus mostra a Cidade correspondente (FK resolvido).
- CRUD funcional: adicionar/editar/inativar campus pelo UI.

---

### T3 — Adicionar entidade `Unidade` (hierárquica)

**Objetivo**: criar cadastro de Unidade institucional Unifesspa (Reitoria → Pró-Reitoria → Centro → Faculdade → Departamento → Coordenação). Auto-FK para parent. Este protótipo seeda só ~12 entradas representativas — em produção viriam ~690 do CSV legado.

**Mudanças**:

1. **Criar `data/seed-unidades.json`** com entradas representativas (escolhi uma amostra cobrindo 4 níveis e o que aparece na proposta CEPS_CRCA):

   ```json
   [
     {
       "codigo": "UNIFESSPA",
       "nome": "Universidade Federal do Sul e Sudeste do Pará",
       "sigla": "UNIFESSPA",
       "parent_codigo": null,
       "tipo": "REITORIA",
       "unidade_academica": false
     },
     {
       "codigo": "PROEG",
       "nome": "Pró-Reitoria de Ensino de Graduação",
       "sigla": "PROEG",
       "parent_codigo": "UNIFESSPA",
       "tipo": "PRO_REITORIA",
       "unidade_academica": false
     },
     {
       "codigo": "PROEX",
       "nome": "Pró-Reitoria de Extensão e Assuntos Estudantis",
       "sigla": "PROEX",
       "parent_codigo": "UNIFESSPA",
       "tipo": "PRO_REITORIA",
       "unidade_academica": false
     },
     {
       "codigo": "CEPS",
       "nome": "Centro de Processos Seletivos",
       "sigla": "CEPS",
       "parent_codigo": "UNIFESSPA",
       "tipo": "CENTRO",
       "unidade_academica": false
     },
     {
       "codigo": "CRCA",
       "nome": "Centro de Registro e Controle Acadêmico",
       "sigla": "CRCA",
       "parent_codigo": "UNIFESSPA",
       "tipo": "CENTRO",
       "unidade_academica": false
     },
     {
       "codigo": "CTIC",
       "nome": "Centro de Tecnologia da Informação e Comunicação",
       "sigla": "CTIC",
       "parent_codigo": "UNIFESSPA",
       "tipo": "CENTRO",
       "unidade_academica": false
     },
     {
       "codigo": "ICH",
       "nome": "Instituto de Ciências Humanas",
       "sigla": "ICH",
       "parent_codigo": "UNIFESSPA",
       "tipo": "INSTITUTO",
       "unidade_academica": true
     },
     {
       "codigo": "FAHIST",
       "nome": "Faculdade de História — Marabá",
       "sigla": "FAHIST",
       "parent_codigo": "ICH",
       "tipo": "FACULDADE",
       "unidade_academica": true
     },
     {
       "codigo": "FACGEO",
       "nome": "Faculdade de Geografia — Marabá",
       "sigla": "FACGEO",
       "parent_codigo": "ICH",
       "tipo": "FACULDADE",
       "unidade_academica": true
     },
     {
       "codigo": "IEA",
       "nome": "Instituto de Engenharia do Araguaia",
       "sigla": "IEA",
       "parent_codigo": "UNIFESSPA",
       "tipo": "INSTITUTO",
       "unidade_academica": true
     },
     {
       "codigo": "FECAMP",
       "nome": "Faculdade de Educação do Campo",
       "sigla": "FECAMP",
       "parent_codigo": "ICH",
       "tipo": "FACULDADE",
       "unidade_academica": true
     }
   ]
   ```

2. **`js/storage.js`**: adicionar em `Keys`: `UNIDADES: 'configuracao.unidades'`.

3. **`js/seeds.js`**: adicionar `{ url: 'data/seed-unidades.json', key: Keys.UNIDADES }`.

4. **`js/configuracao-schemas.js`**: adicionar configuração `unidades`:

   ```js
   unidades: {
     titulo: 'Unidades institucionais',
     descricao: 'Cadastro hierárquico das unidades Unifesspa (Reitoria, Pró-Reitorias, Centros, Institutos, Faculdades, Departamentos, Coordenações). Cada unidade pode ter <strong>uma unidade pai</strong> e múltiplas filhas. Em produção, ~690 unidades reais migráveis dos sistemas legados. O <strong>edital tem uma unidade dona</strong> (ex.: CEPS para PSIQ/PSE EC; CRCA para Transferências).',
     icone: '🏢',
     key: Keys.UNIDADES,
     colunas: [
       { campo: 'codigo', label: 'Código' },
       { campo: 'sigla', label: 'Sigla' },
       { campo: 'nome', label: 'Nome' },
       { campo: 'parent_codigo', label: 'Unidade pai' },
       { campo: 'tipo', label: 'Tipo' },
       { campo: 'unidade_academica', label: 'Acadêmica?', tipo: 'bool' },
     ],
     campos: [
       { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único, ex.: PROEG, CEPS, ICH, FAHIST.' },
       { campo: 'nome', label: 'Nome completo', tipo: 'text', required: true },
       { campo: 'sigla', label: 'Sigla', tipo: 'text', required: true },
       {
         campo: 'parent_codigo',
         label: 'Unidade pai',
         tipo: 'ref',
         refKey: 'unidades',
         refValue: 'codigo',
         refLabel: 'sigla',
         hint: 'Deixe vazio para a unidade raiz (Reitoria). Caso contrário, escolha a unidade hierarquicamente superior.',
       },
       {
         campo: 'tipo',
         label: 'Tipo',
         tipo: 'select',
         required: true,
         options: [
           { value: 'REITORIA', label: 'Reitoria' },
           { value: 'PRO_REITORIA', label: 'Pró-Reitoria' },
           { value: 'CENTRO', label: 'Centro' },
           { value: 'INSTITUTO', label: 'Instituto' },
           { value: 'FACULDADE', label: 'Faculdade' },
           { value: 'DEPARTAMENTO', label: 'Departamento' },
           { value: 'COORDENACAO', label: 'Coordenação' },
           { value: 'DIVISAO', label: 'Divisão' },
           { value: 'OUTRO', label: 'Outro' },
         ],
       },
       { campo: 'unidade_academica', label: 'Unidade acadêmica?', tipo: 'checkbox', hint: 'Marque se a unidade oferta cursos diretamente (Institutos, Faculdades).' },
     ],
   },
   ```

5. **Adicionar `'unidades'` em `ORDEM_CONFIGURACOES`** como **primeira** entrada (Unidade é o cadastro mais fundamental).

**Critério de aceitação**:
- `configuracao.html?slug=unidades` lista as 11 unidades seedadas.
- Campo "Unidade pai" renderiza como select com siglas das outras unidades.
- CRUD funcional.

---

### T4 — Atualizar entidade `Curso` para apontar para `Campus`

**Objetivo**: corrigir o achatamento `Curso.campus_codigo → Cidade`. O campus do curso é uma `Campus` cadastrada (que por sua vez aponta para `Cidade`).

**Mudanças**:

1. **`data/seed-cursos.json`** — confira se há `campus_codigo` apontando para códigos como `MARABA`, `SANTANA_DO_ARAGUAIA`, etc. Esses códigos já existem em `seed-campus.json` (T2). Se houver curso apontando para `CANAA_DOS_CARAJAS` (que não é campus Unifesspa), trate como exceção: provavelmente é um curso ofertado em convênio — adicione campus dedicado `CANAA_DOS_CARAJAS_CONVENIO` no `seed-campus.json` com `cidade_codigo: CANAA_DOS_CARAJAS` e ajuste o curso, OU remova o curso se for inconsistente. Reporte ao TL antes de adivinhar.

2. **`js/configuracao-schemas.js`** em `cursos`:
   - O campo `campus_codigo` já existe. Atualizar:
     ```js
     {
       campo: 'campus_codigo',
       label: 'Campus',
       tipo: 'ref',
       refKey: 'campus',          // antes: 'cidades-prova'
       refValue: 'codigo',
       refLabel: 'nome',
       required: true,
       hint: 'Campus Unifesspa onde o curso é oferecido. Vem de Configurações › Campus.',
     },
     ```

3. **`js/snapshot.js`**: na função `buildSnapshot`, a denormalização de cursos faz:
   ```js
   const localDef = cursoDef
     ? denormSingle(Keys.CIDADES_PROVA, (l) => l.codigo === cursoDef.campus_codigo)
     : null;
   ```
   Atualizar para resolver via Campus → Cidade:
   ```js
   const campusDef = cursoDef
     ? denormSingle(Keys.CAMPUS, (c) => c.codigo === cursoDef.campus_codigo)
     : null;
   const cidadeDef = campusDef
     ? denormSingle(Keys.CIDADES, (c) => c.codigo === campusDef.cidade_codigo)
     : null;
   return {
     codigo: cursoDef.codigo,
     curso: cursoDef.nome,
     grau: cursoDef.grau,
     campus: campusDef?.nome || cursoDef.campus_codigo,
     cidade_campus: cidadeDef?.nome || null,
     turno: cursoDef.turno,
     vagas: v.vagas || 0,
   };
   ```
   Aplicar a mesma correção no bloco `cidades` do snapshot (que resolve `cursoCodigos` para cada cidade aceita pelo edital — também resolve campus via Campus agora).

4. **`js/visualizar-edital.js`**: atualizar qualquer render que resolva campus a partir de `cidades-prova` para resolver via `campus`. Procure por `Keys.CIDADES_PROVA` neste arquivo e ajuste.

**Critério de aceitação**:
- Configuração de Cursos renderiza select de Campus (não mais de Cidade).
- Editais existentes ainda funcionam (mesmo `campus_codigo` agora resolve via `Campus`).
- `visualizar-edital.js` mostra "Campus de Marabá" (nome do campus) e/ou "Marabá" (cidade do campus), não a cidade direto.

---

### T5 — Adicionar `Edital.unidadeDona`

**Objetivo**: refletir R5 — todo edital tem uma unidade institucional dona (CEPS, CRCA, PROEX, etc.).

**Mudanças**:

1. **`js/steps/passo-02-identificacao.js`** (passo "Identificação" do wizard): adicionar campo "Unidade dona do processo" como select (ref para `unidades`). Já existe `sigla: 'CEPS/UNIFESSPA'` hardcoded — agora vira `unidadeDonaCodigo`. Mantenha `sigla` como campo de exibição também (não-bloqueante), mas a fonte real é `unidadeDonaCodigo`.

   Pseudo-template do campo (adapte ao padrão existente em `passo-02-identificacao.js`):
   ```js
   // Carregar opções
   const unidades = new Collection(Keys.UNIDADES).list({ includeInactive: false });
   // Render <select>
   const optionsHtml = unidades
     .map(u => `<option value="${u.codigo}" ${state.edital.identificacao?.unidadeDonaCodigo === u.codigo ? 'selected' : ''}>${u.sigla} — ${u.nome}</option>`)
     .join('');
   ```

   Default sugerido: `CEPS` se nenhum estiver definido (mantém comportamento atual do protótipo).

2. **`js/snapshot.js`** em `buildSnapshot`, adicionar bloco:
   ```js
   unidade_dona: ed.identificacao?.unidadeDonaCodigo
     ? denormSingle(Keys.UNIDADES, (u) => u.codigo === ed.identificacao.unidadeDonaCodigo)
     : null,
   ```
   Colocar logo após `identificacao: { ...ed.identificacao }`.

3. **`js/visualizar-edital.js`**: render do bloco de identificação deve mostrar a unidade dona pelo nome/sigla.

**Critério de aceitação**:
- Passo 2 do wizard mostra select de unidades, default CEPS.
- Snapshot denormaliza a unidade dona com todos os campos.
- Visualização do edital mostra "Unidade dona: CEPS — Centro de Processos Seletivos".

---

### T6 — Dividir `seed-necessidades.json` em `TipoDeficiencia` + `RecursoAcessibilidade`

**Objetivo**: corrigir a confusão de 3 conceitos em uma só configuração. Adotar vocabulário INEP.

**Mudanças**:

1. **Criar `data/seed-tipos-deficiencia.json`** com a lista canônica do INEP/Edital ENEM 52/2025 (alinhada com Resolução 64/2015 CONSEPE/Unifesspa). Use exatamente este conteúdo:

   ```json
   [
     { "codigo": "BAIXA_VISAO", "nome": "Baixa visão", "descricao": "Acuidade visual reduzida.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015 (LBI); Edital ENEM 52/2025" },
     { "codigo": "CEGUEIRA", "nome": "Cegueira", "descricao": "Cegueira total ou parcial.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "VISAO_MONOCULAR", "nome": "Visão monocular", "descricao": "Perda funcional de um dos olhos.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 14.126/2021; Edital ENEM 52/2025" },
     { "codigo": "DEFICIENCIA_FISICA", "nome": "Deficiência física", "descricao": "Alteração completa ou parcial de um ou mais segmentos do corpo.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "DEFICIENCIA_AUDITIVA", "nome": "Deficiência auditiva", "descricao": "Perda bilateral, parcial ou total, de quarenta e um decibéis (dB) ou mais.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "SURDEZ", "nome": "Surdez", "descricao": "Perda auditiva acima de setenta e um decibéis (dB).", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Lei 10.436/2002; Edital ENEM 52/2025" },
     { "codigo": "DEFICIENCIA_INTELECTUAL", "nome": "Deficiência intelectual (mental)", "descricao": "Funcionamento intelectual significativamente inferior à média, com manifestação antes dos 18 anos.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "SURDOCEGUEIRA", "nome": "Surdocegueira", "descricao": "Deficiência única com perdas auditiva e visual combinadas.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "DISLEXIA", "nome": "Dislexia", "descricao": "Transtorno específico da aprendizagem na leitura.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "DEFICIT_DE_ATENCAO", "nome": "Déficit de atenção (TDAH)", "descricao": "Transtorno de déficit de atenção e hiperatividade.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "TEA", "nome": "Transtorno do espectro autista (TEA)", "descricao": "Inclui autismo, Asperger, Rett e transtorno desintegrativo da infância.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 12.764/2012 (Berenice Piana); Lei 13.146/2015; Edital ENEM 52/2025" },
     { "codigo": "DISCALCULIA", "nome": "Discalculia", "descricao": "Transtorno específico da aprendizagem em matemática.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "ALTAS_HABILIDADES", "nome": "Altas habilidades / superdotação", "descricao": "Potencial elevado em qualquer área do conhecimento, criatividade ou liderança.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015; Resolução 64/2015 CONSEPE/Unifesspa" },
     { "codigo": "MULTIPLA", "nome": "Múltipla", "descricao": "Associação de duas ou mais deficiências.", "exige_laudo": true, "validade_laudo_dias": 365, "base_legal": "Lei 13.146/2015" },
     { "codigo": "SEM_DEFICIENCIA", "nome": "Sem deficiência", "descricao": "Candidato sem deficiência catalogada — opção utilitária para formulários.", "exige_laudo": false, "validade_laudo_dias": null, "base_legal": null }
   ]
   ```

2. **Criar `data/seed-recursos-acessibilidade.json`** com a lista do Edital ENEM 52/2025:

   ```json
   [
     { "codigo": "TRADUTOR_INTERPRETE_LIBRAS", "nome": "Tradutor-intérprete de Libras", "descricao": "Profissional para tradução simultânea em Língua Brasileira de Sinais.", "base_legal": "Edital ENEM 52/2025; Lei 10.436/2002" },
     { "codigo": "PROVA_AMPLIADA", "nome": "Prova com letra ampliada", "descricao": "Prova impressa com fonte tamanho 18 e figuras ampliadas.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "PROVA_SUPERAMPLIADA", "nome": "Prova com letra superampliada", "descricao": "Prova impressa com fonte tamanho 24 e figuras ampliadas.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "PROVA_BRAILE", "nome": "Prova em braile", "descricao": "Prova impressa em sistema braile.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "VIDEOPROVA_LIBRAS", "nome": "Videoprova em Libras", "descricao": "Versão videogravada da prova em Língua Brasileira de Sinais.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "LEITOR_DE_TELA", "nome": "Uso de leitor de tela", "descricao": "Software leitor de tela em prova digital.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "GUIA_INTERPRETE", "nome": "Guia-intérprete", "descricao": "Profissional para candidatos com surdocegueira.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "AUXILIO_LEITURA", "nome": "Auxílio para leitura (ledor)", "descricao": "Profissional para leitura da prova.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "AUXILIO_TRANSCRICAO", "nome": "Auxílio para transcrição (transcritor)", "descricao": "Profissional para transcrição das respostas.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "LEITURA_LABIAL", "nome": "Leitura labial", "descricao": "Aplicador treinado para leitura labial.", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "TEMPO_ADICIONAL", "nome": "Tempo adicional", "descricao": "Tempo adicional para realização da prova (até 1h conforme regulamento do edital).", "base_legal": "Edital ENEM 52/2025; Lei 13.146/2015" },
     { "codigo": "SALA_FACIL_ACESSO", "nome": "Sala de fácil acesso", "descricao": "Sala térrea ou com acesso por elevador, sem barreiras arquitetônicas.", "base_legal": "Edital ENEM 52/2025; Lei 13.146/2015" },
     { "codigo": "MOBILIARIO_ACESSIVEL", "nome": "Mobiliário acessível", "descricao": "Mesa e cadeira sem braço, apoio para pernas e pés (lactantes, deficiência física).", "base_legal": "Edital ENEM 52/2025" },
     { "codigo": "ACOMPANHANTE_LACTANTE", "nome": "Acompanhante para o lactente", "descricao": "Adulto acompanhante para cuidar da criança durante a prova da lactante.", "base_legal": "Edital ENEM 52/2025; Lei 13.872/2019" },
     { "codigo": "SALA_INDIVIDUAL", "nome": "Sala individual ou reduzida", "descricao": "Sala com poucos candidatos para redução de estímulos (TEA, TDAH).", "base_legal": "Edital ENEM 52/2025" }
   ]
   ```

3. **Excluir `data/seed-necessidades.json`** após confirmar que os dados foram migrados (deficiências viraram TipoDeficiencia; gestante/lactante viram categoria não-PcD modelada como flag — ver T7).

4. **`js/storage.js`**:
   - Remover `NECESSIDADES: 'configuracao.necessidades'`.
   - Adicionar `TIPOS_DEFICIENCIA: 'configuracao.tipos-deficiencia'`.
   - Adicionar `RECURSOS_ACESSIBILIDADE: 'configuracao.recursos-acessibilidade'`.

5. **`js/seeds.js`**:
   - Remover entrada de `seed-necessidades.json`.
   - Adicionar entrada de `seed-tipos-deficiencia.json` e `seed-recursos-acessibilidade.json`.
   - Bump `SEEDS_LOADED` para `v14` (em `Keys.SEEDS_LOADED`) para forçar reseed em quem já abriu o protótipo antes.

6. **`js/configuracao-schemas.js`**:
   - Remover configuração `necessidades`.
   - Adicionar `tipos-deficiencia` (CRUD com campos `codigo`, `nome`, `descricao`, `exige_laudo`, `validade_laudo_dias`, `base_legal`).
   - Adicionar `recursos-acessibilidade` (CRUD com campos `codigo`, `nome`, `descricao`, `base_legal`).
   - Atualizar `ORDEM_CONFIGURACOES`: trocar `'necessidades'` por `'tipos-deficiencia'` + `'recursos-acessibilidade'`.

7. **Atualizar `data/seed-obrigatoriedades.json`**: regras com `regra_codigo: ATENDIMENTO_PCD_DISPONIVEL` e `ATENDIMENTO_GESTANTE_OBRIGATORIO` usam parâmetros como `["CADEIRANTE", "BAIXA_VISAO", ...]` — atualizar para usar os novos códigos de `RecursoAcessibilidade` ou de `TipoDeficiencia` conforme a semântica:
   - `ATENDIMENTO_PCD_DISPONIVEL` agora exige que o edital ofereça os recursos mínimos: `SALA_FACIL_ACESSO`, `PROVA_AMPLIADA`, `PROVA_BRAILE`, `TRADUTOR_INTERPRETE_LIBRAS`, `AUXILIO_LEITURA`, `TEMPO_ADICIONAL`.
   - `ATENDIMENTO_GESTANTE_OBRIGATORIO` agora exige: `MOBILIARIO_ACESSIVEL`, `ACOMPANHANTE_LACTANTE`, `SALA_FACIL_ACESSO`.
   - Mudar campo `parametros.necessidades` para `parametros.recursos`.

8. **`js/validator.js`**:
   - Renomear `ATENDIMENTO_PCD_DISPONIVEL` para verificar `state.edital.atendimentoEspecializado` (T7) em vez de `state.edital.atendimento` — ver T7.
   - O parâmetro `p.necessidades` vira `p.recursos`.

**Critério de aceitação**:
- Reset popula `tipos-deficiencia` (15 entradas) e `recursos-acessibilidade` (15 entradas).
- Configuração `necessidades` não aparece mais no hub.
- `grep -rln "necessidades" .` retorna apenas o que está em `validator.js`/`obrigatoriedades` quando intencional (ver T7).
- Reset preserva as outras configurações.

---

### T7 — Renomear passo 12 e estrutura de "atendimento" no edital

**Objetivo**: adotar vocabulário INEP no passo 12 do wizard e na estrutura do estado do edital.

**Mudanças**:

1. **`js/wizard-steps.js`**: passo 12 muda `titulo` de `'Atendimento especial'` para `'Atendimento especializado'`. Manter `codigo: 'atendimento'` (não quebra refs).

2. **`js/steps/passo-12-atendimento.js`**: substituir textos user-facing:
   - "Atendimento especial" → "Atendimento especializado" (em todos os títulos, labels, hints).
   - "Necessidade" → "Recurso de acessibilidade" (quando se refere ao recurso solicitado).
   - "Necessidade especial" → "Atendimento especializado".
   - "Tipo de necessidade" → "Tipo de deficiência" (quando se refere à condição do candidato).
   - Estrutura do estado: `state.edital.atendimento` → `state.edital.atendimentoEspecializado`. Esse objeto agora tem duas listas:
     ```js
     state.edital.atendimentoEspecializado = {
       deficiencias_aceitas: [/* códigos de TipoDeficiencia */],
       recursos_oferecidos: [/* códigos de RecursoAcessibilidade */],
     };
     ```

3. **`js/snapshot.js`**:
   - Renomear bloco `atendimento_especial` para `atendimento_especializado`:
     ```js
     atendimento_especializado: {
       deficiencias_aceitas: (ed.atendimentoEspecializado?.deficiencias_aceitas || []).map(c =>
         denormSingle(Keys.TIPOS_DEFICIENCIA, (d) => d.codigo === c)
       ),
       recursos_oferecidos: (ed.atendimentoEspecializado?.recursos_oferecidos || []).map(c =>
         denormSingle(Keys.RECURSOS_ACESSIBILIDADE, (r) => r.codigo === c)
       ),
     },
     ```
   - Remover a denormalização antiga de `Keys.NECESSIDADES`.

4. **`js/visualizar-edital.js`**: atualizar bloco de render para mostrar "Atendimento especializado" com duas seções (Deficiências aceitas + Recursos oferecidos).

5. **`js/clone.js`**: ajustar mapeamento se houver referência ao antigo `atendimento`.

6. **`js/demo-editais.js`**: rascunhos/modelos demo (PSE-EC, PS-Convênios, SiSU 2026) usam `atendimento`. Renomear para `atendimentoEspecializado` no novo formato (listas por código).

7. **`js/validator.js`**: avaliador `ATENDIMENTO_PCD_DISPONIVEL` lê de `state.edital.atendimentoEspecializado.recursos_oferecidos` agora. Atualizar lógica.

**Critério de aceitação**:
- Sidebar do wizard mostra "Atendimento especializado" no passo 12.
- Painel de validação no passo 13 não cita "necessidade especial".
- Editais demo carregam sem erros.

---

### T8 — Buscar e remover todos os termos descartados

**Objetivo**: garantir que nenhum termo do § 2 D4 fica espalhado por engano.

**Mudanças**:

Rodar uma varredura final e substituir:

```bash
# Termos a buscar (case-insensitive, em todos os arquivos do protótipo).
# Excluímos PROMPT-*.md e o anexo F0 (`analise-prototipo-cadastro-edital.md`), que são docs
# históricos onde os termos descartados aparecem propositadamente como referência.
grep -rln -i "atendimento.\{0,5\}especial\b" . --exclude="PROMPT-*.md" --exclude="analise-prototipo-cadastro-edital.md"   # exceto "atendimento especializado"
grep -rln -i "necessidade.\{0,5\}especial" . --exclude="PROMPT-*.md" --exclude="analise-prototipo-cadastro-edital.md"
grep -rln -i "atendimento.\{0,5\}diferenciado" . --exclude="PROMPT-*.md" --exclude="analise-prototipo-cadastro-edital.md"
```

Para cada ocorrência:
- Se for **título/label/hint user-facing**: substituir por "Atendimento especializado".
- Se for **chave de dado** (campo do estado, propriedade JSON): substituir por `atendimentoEspecializado`.
- Se for **comentário de código**: atualizar para refletir vocabulário INEP.
- Se for **documentação** (README.md, CLAUDE.md): atualizar e adicionar nota explicando a decisão.

**Critério de aceitação**:
- Todos os greps acima retornam 0 resultados *exceto neste prompt e docs históricos* (já excluídos pelos `--exclude`).

---

### T9 — Atualizar `README.md` e `CLAUDE.md` do protótipo

**Objetivo**: refletir o novo modelo na documentação local.

**Mudanças**:

1. **`README.md`**:
   - Seção "Configurações (8)" passa a ser "Configurações (12)" — listar: Unidades, Tipos de edital, Tipos de etapa, Modalidades, Cursos, Cidades, Campus, Tipos de documento, Tipos de deficiência, Recursos de acessibilidade, Critérios de desempate, Obrigatoriedades legais, Percentuais IBGE, Estratégias de balanceamento, Cascatas de remanejamento. Conferir contagem exata após T1-T6.
   - "Pontos a validar com o P.O.": remover a pergunta sobre "atendimento especial vs necessidade especial vs atendimento diferenciado" (já resolvida — vocabulário INEP adotado).
   - Adicionar nota: "Vocabulário canônico INEP/MEC: 'Atendimento Especializado' (Edital ENEM nº 52/2025). Aplicado em todo o protótipo."

2. **`CLAUDE.md`**:
   - Atualizar a seção "Premissa central" se houver menção ao modelo antigo.
   - Atualizar lista de entidades de cadastro: Unidade, Curso, Campus, Cidade são cadastros próprios; integração Kafka/SIGAA é overlay futuro complementar.

**Critério de aceitação**:
- README e CLAUDE refletem o estado pós-mudanças, sem mentir sobre o que existe.

---

### T10 — Smoke test manual

**Objetivo**: garantir que o protótipo continua funcional após todas as mudanças.

**Procedimento**:

1. Servir: `python3 -m http.server 8080` na raiz desta pasta.
2. Abrir `http://localhost:8080/`.
3. Clicar **"Resetar dados"** — confirmar que carrega sem erro no console.
4. Ir em **Configurações** — verificar que todas as 12+ configurações aparecem.
5. Abrir cada nova configuração (Unidades, Campus, Tipos de deficiência, Recursos de acessibilidade) e confirmar:
   - Lista renderiza os seeds.
   - Botão "Novo" abre formulário.
   - Editar/inativar funcionam.
6. Voltar para home, **Editais → + Novo edital → Em branco**:
   - Passo 1: escolher SiSU.
   - Passo 2: confirmar que select de "Unidade dona" aparece e tem CEPS como default.
   - Passo 12: confirmar título "Atendimento especializado" + duas listas (deficiências + recursos).
   - Passo 13: confirmar painel de validações funcional, gerar snapshot, **hash é determinístico**. O critério é: chamar `buildSnapshot(state)` + `computeHash(snapshot)` duas vezes no mesmo estado deve produzir o mesmo hash. **Não confundir com publicar duas vezes** — `publish()` grava `publicadoEm` (timestamp volátil) e cria um registro novo em `editais.publicados`, então dois registros publicados não são idênticos byte-a-byte. O hash determinístico se aplica ao snapshot puro, não ao registro de publicação. Para testar via DevTools: `await computeHash(buildSnapshot(state))` duas vezes consecutivas deve dar a mesma string.
7. Carregar o rascunho **SiSU 2026** (demo) — confirmar que abre sem erro com a nova estrutura.
8. Salvar como modelo, clonar — confirmar funcional.
9. Console DevTools deve estar **limpo de erros e warnings** depois do fluxo completo.
10. Repetir em **Chrome + Firefox + Edge** (pode ser superficial — só navegar pelos passos sem editar).

**Critério de aceitação**:
- Todos os passos do smoke executam sem erro.
- Console sem `Uncaught` ou `Error` em vermelho.
- Edital publicado tem snapshot com `unidade_dona`, `atendimento_especializado`, `cidades` (com campus resolvido via T4).

---

## § 4 — Convenções de código a respeitar

- **pt-BR** em strings user-facing, com acentuação correta.
- Mensagens de erro humanizadas — não vazar stack trace para o usuário.
- IDs com `randomUUID()` exportado de `storage.js` (não chamar `crypto.randomUUID()` direto — wrapper trata fallback).
- Hashes com `crypto.subtle.digest('SHA-256')` e `canonicalStringify` para ordenação determinística — não trocar por `JSON.stringify` direto.
- Soft delete por default (`ativo: false`), consistente com a regra do projeto.
- Não duplicar regras em `validator.js` — sempre passar pela configuração `OBRIGATORIEDADES`.
- Sem dependências CDN além das já presentes.
- Sem build step.
- Anti-flash de tema: snippet inline no `<head>` aplica `data-theme` antes do paint — não mover `theme.js` para antes.
- Não traduzir referências externas (não há aqui, mas mantém regra geral).

---

## § 5 — Como entregar

1. **Não faça commits.** O TL decide quando consolidar.
2. **Listar arquivos modificados** ao final, agrupados por tarefa (T1-T9).
3. **Listar arquivos novos criados** (data/seed-campus.json, data/seed-unidades.json, data/seed-tipos-deficiencia.json, data/seed-recursos-acessibilidade.json).
4. **Listar arquivos removidos** (data/seed-necessidades.json, data/seed-cidades-prova.json se renomeado, não copiado).
5. **Reportar quaisquer ambiguidades encontradas** durante a implementação — exemplo: se algum curso em `seed-cursos.json` aponta para campus inexistente, perguntar antes de chutar; se algum HTML mencionar "cidades-prova" em string fixa em conteúdo de usuário, confirmar abordagem; etc.
6. **Reportar o resultado do smoke test** (T10) — quais navegadores foram testados, se houve erro no console, qualquer comportamento inesperado.

---

## § 6 — Fontes externas (caso precise consultar)

- [Edital INEP nº 52/2025 — Edital ENEM 2025](https://download.inep.gov.br/enem/edital_52_de_23_de_maio_de_2025.pdf) — vocabulário canônico de Atendimento Especializado.
- [Saiba como solicitar atendimento especializado no Enem (gov.br/inep)](https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/saiba-como-solicitar-atendimento-especializado-no-enem) — lista de categorias e recursos.
- Sistema legado COC: `../coc/entidade/{TipoAtendimento,CandidatoPcd}.php` — referência do que existe hoje (descartado em favor do vocabulário INEP).

---

## § 7 — Resumo das mudanças esperadas (cheatsheet)

| Antes | Depois |
|---|---|
| `Keys.CIDADES_PROVA` (mistura cidade + endereço de campus) | `Keys.CIDADES` (genérico) + `Keys.CAMPUS` (separada com FK Cidade) |
| `Curso.campus_codigo → Cidade` | `Curso.campus_codigo → Campus → cidade_codigo → Cidade` |
| Sem entidade `Unidade` | `Keys.UNIDADES` hierárquica + `Edital.identificacao.unidadeDonaCodigo` |
| `Keys.NECESSIDADES` (mistura deficiência + recurso + gestante) | `Keys.TIPOS_DEFICIENCIA` + `Keys.RECURSOS_ACESSIBILIDADE` |
| "Atendimento especial" | "Atendimento especializado" |
| `state.edital.atendimento` | `state.edital.atendimentoEspecializado` (`{ deficiencias_aceitas, recursos_oferecidos }`) |
| 12 configurações | 14 configurações |
| Passo 12 título: "Atendimento especial" | Passo 12 título: "Atendimento especializado" |
| Snapshot `atendimento_especial` | Snapshot `atendimento_especializado` |
| Sem `unidade_dona` no snapshot | `unidade_dona` no snapshot (denormalizado) |

---

**Fim do prompt.** Não invente requisitos além deste documento. Em dúvida, pergunte antes de implementar.
