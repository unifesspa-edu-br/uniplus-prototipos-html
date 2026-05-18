# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

Protótipo HTML5 standalone (sem framework, sem build) para validar com o P.O. (Jairo, CEPS) o conceito de cadastro de edital **antes** de implementar em produção (`uniplus-api` + `uniplus-web`). Pertence ao guarda-chuva `uniplus-prototipos-html`; o CLAUDE.md da raiz do workspace (`uniplus/CLAUDE.md`) e a `docs/visao-do-projeto.md` continuam valendo (idioma pt-BR, convenções de commit, workflow GitHub).

Decisões aprovadas viram ADR em `repositories/uniplus-docs/docs/adrs/` ou `repositories/uniplus-api/docs/adrs/` — **não** implementar aqui o que vai para produção; o protótipo permanece como histórico.

## Como rodar

ES Modules + `fetch('data/*.json')` exigem servidor HTTP. **Não funciona via `file://`.**

```bash
python3 -m http.server 8080
# ou
npx --yes serve -p 8080
```

Não há build, lint, nem testes automatizados nesta pasta. Smoke test manual em Chrome/Firefox/Edge antes da demo. (Os testes Playwright + relatórios a11y vivem no `prototipo-portal-candidato-home/` irmão, não aqui.)

### Reset de dados

Os seeds carregam automaticamente apenas na **primeira visita** (sentinela `uniplus.app.seeds-loaded`). Se você editar um `data/seed-*.json`, a configuração já populado **não** é atualizado — use o botão **"Resetar dados"** em `index.html` (`app.js:resetData`), que chama `Storage.clearAll()` e repopula. Alternativa via DevTools: `localStorage.clear()`.

## Arquitetura

### Premissa central: obrigatoriedades como dado, não código

A regra "PSIQ precisa de banca de heteroidentificação", "SiSU exige importação ENEM", etc., **não** é hardcoded em ifs. Vive na configuração `OBRIGATORIEDADES` (seed em `data/seed-obrigatoriedades.json`), com `regra_codigo` que mapeia para um avaliador em `js/validator.js:AVALIADORES`. Quando a lei muda, edita-se a configuração (CRUD em `configuracao.html?slug=obrigatoriedades`) — sem deploy.

Ao adicionar uma nova regra:
1. Inserir entrada no seed (ou via UI da configuração) com `regra_codigo`, `categoria`, `parametros`, `base_legal`, `descricao`.
2. Se for um `regra_codigo` novo, adicionar avaliador em `AVALIADORES` (`validator.js`). Avaliador recebe `(state, parametros)` e retorna `boolean`.
3. `PASSO_POR_CATEGORIA` em `validator.js` mapeia categoria → passo do wizard para o botão "Corrigir".

### Modelo de etapa unificado

Toda janela do edital (inscrição, homologação, prova, divulgação) é uma `etapa` na lista única de `state.edital.etapas`, ordenada cronologicamente. A configuração `TipoEtapa.categoria` (`ADMINISTRATIVA` | `AVALIATIVA` | `IMPORTACAO_AUTOMATICA`) decide se a etapa tem peso/nota e se entra no cálculo da nota final. **Não existe cronograma separado.** Decisões de UI sobre etapa avaliativa vs administrativa (campos visíveis, regras de validação) consultam `tipoSnap.categoria`, não o nome.

### Wizard: 13 passos com lazy loading

`js/wizard.js` é o controlador único; cada passo é um módulo ES isolado em `js/steps/passo-NN-*.js`, importado dinamicamente em `loadStepModule()` na navegação. Contrato do módulo:

```js
export async function render(container, ctx) {
  // ctx = { state, updateState, setStepStatus, navigateTo, salvar }
}
```

`updateState(patch)` faz `Object.assign(state.edital, patch)` + autosave; `setStepStatus('concluido' | 'emProgresso' | 'atencao')` move o ícone na sidebar. O passo 1 sempre é acessível; os demais ficam bloqueados até `state.edital.tipo` ser definido (`podeAcessar` em `wizard.js`). Para criar um novo passo: adicionar entrada em `js/wizard-steps.js:STEPS` e criar `js/steps/passo-NN-codigo.js` exportando `render`. Sem entrada no módulo, o wizard mostra placeholder de "não implementado".

### Snapshot + hash sha256 (RN08)

Publicar **congela** o snapshot do edital: cópia profunda do estado + denormalização das configurações referenciados no momento. Mudanças posteriores nas configurações **não retroagem** para editais publicados. Implementado em `js/snapshot.js:buildSnapshot` (denormaliza via `denormSingle`/`denormMany`, removendo `id`/`criadoEm`/`ativo` com `omitMeta`).

O hash é determinístico: `canonicalStringify` ordena chaves recursivamente antes do `crypto.subtle.digest('SHA-256')`. **Não trocar para `JSON.stringify` direto** — quebra a propriedade de o mesmo edital sempre gerar o mesmo hash. Dois editais com payload equivalente devem ter o mesmo hash.

`saveAsModel` reusa `buildSnapshot` mas zera identificação, datas das etapas e vagas (modelo é template reutilizável). `cloneFromModelo` / `cloneFromEditalPublicado` (`js/clone.js`) fazem o caminho inverso: snapshot denormalizado → `state.edital` normalizado, re-resolvendo configurações pelos seus `codigo` (se uma configuração foi renomeado, o código é a chave estável).

### Persistência

`js/storage.js` é a fachada única sobre `localStorage`. Todas as chaves prefixadas com `uniplus.`; coleções acessadas via `new Collection(Keys.X)` com CRUD (`upsert`, `byId`, `byCodigo`, `inactivate`, `replaceAll`). Soft delete por default (`ativo: false`), consistente com a regra do projeto. `Keys` exporta o conjunto canônico — não literalizar strings de chave em outros módulos.

Limite prático do `localStorage`: ~5–10 MB. Edital com 200 cursos no Anexo I pode estourar. Em produção é PostgreSQL.

### Configuração CRUD genérico

`configuracao.html?slug=<x>` consome `js/configuracao-schemas.js:CONFIGURACOES[slug]` (schema declarativo: `colunas`, `campos`, `tipo`, `required`, `hint`) e renderiza tabela + formulário via `js/configuracao.js`. Adicionar configuração novo = adicionar entrada em `CONFIGURACOES` + um `data/seed-*.json` + entrada em `js/seeds.js:SEEDS` + chave em `Keys`.

## Convenções

- pt-BR em strings user-facing; mensagens de erro humanizadas (não vazar stack).
- IDs gerados com `crypto.randomUUID()`. Hashes com `crypto.subtle.digest('SHA-256')`.
- Tema gov.br DS via CDN (`@govbr-ds/core@3.7.1`) + `css/prototipo.css` com tokens custom; toggle claro/escuro em `js/theme.js` (`data-theme` no `<html>`, persistido em `uniplus.app.theme`).
- Anti-flash de tema: snippet inline no `<head>` deve aplicar `data-theme` antes do paint — não mover `theme.js` para antes do snippet.
- Não adicionar dependências npm/CDN sem necessidade — o protótipo é deliberadamente minimalista.
- Não duplicar regras em `validator.js` — sempre passar pela configuração `OBRIGATORIEDADES`.
- Documentação fonte de verdade do domínio (que **não** deve ser modificada por este protótipo) está listada no `README.md` desta pasta, seção "Fontes consultadas".
