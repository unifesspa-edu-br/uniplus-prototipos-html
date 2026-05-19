// vocabulario-unidades.js — fonte única de verdade para `Unidade.tipo`.
//
// Em F3 (uniplus-api / .NET), este enum vira tipo compartilhado (ex: classe `TipoUnidade`).
// Aqui no protótipo, fica como módulo dedicado para evitar drift entre `configuracao.js`
// (validação) e `configuracao-schemas.js` (opções de UI).
//
// **Atualizar este arquivo automaticamente reflete em ambos os consumidores.**
//
// Imutabilidade: arrays e objetos são `Object.freeze`d em profundidade (achado Opus R3 N-P2-2);
// `TIPOS_UNIDADE_VALIDOS` é exposto como wrapper read-only com apenas `has`/`size`/iteração
// (achado Opus R3 N-P2-1) — bloqueia mutadores acidentais `.add`/`.delete`/`.clear`.

/**
 * Lista canônica de tipos de Unidade institucional Unifesspa.
 * Ordem cronológica de aparição na hierarquia (Reitoria → Pró-Reitoria → ... → Núcleo).
 * `OUTRO` é fallback auditável para casos não previstos durante migração legada.
 */
export const TIPOS_UNIDADE = Object.freeze(
  [
    { codigo: 'REITORIA', label: 'Reitoria' },
    { codigo: 'PRO_REITORIA', label: 'Pró-Reitoria' },
    { codigo: 'CENTRO', label: 'Centro' },
    { codigo: 'INSTITUTO', label: 'Instituto' },
    { codigo: 'FACULDADE', label: 'Faculdade' },
    { codigo: 'DEPARTAMENTO', label: 'Departamento' },
    { codigo: 'COORDENACAO', label: 'Coordenação' },
    { codigo: 'DIRETORIA', label: 'Diretoria' },
    { codigo: 'DIVISAO', label: 'Divisão' },
    { codigo: 'NUCLEO', label: 'Núcleo' },
    { codigo: 'OUTRO', label: 'Outro' },
  ].map((t) => Object.freeze(t))
);

const _tiposUnidadeSet = new Set(TIPOS_UNIDADE.map((t) => t.codigo));

/**
 * Conjunto de códigos válidos para validação (`tipo` obrigatório, sem valores fora do enum).
 * Wrapper read-only — bloqueia mutadores `.add`/`.delete`/`.clear` que existem no `Set` nativo.
 */
export const TIPOS_UNIDADE_VALIDOS = Object.freeze({
  has: (codigo) => _tiposUnidadeSet.has(codigo),
  get size() {
    return _tiposUnidadeSet.size;
  },
  [Symbol.iterator]: () => _tiposUnidadeSet[Symbol.iterator](),
  // Compatibilidade com consumers que esperam `Array.from(TIPOS_UNIDADE_VALIDOS)`.
  toArray: () => Array.from(_tiposUnidadeSet),
});

/** Formato `[{value, label}]` consumido pelo schema do CRUD em `configuracao-schemas.js`. */
export const TIPOS_UNIDADE_OPTIONS = Object.freeze(
  TIPOS_UNIDADE.map((t) => Object.freeze({ value: t.codigo, label: t.label }))
);
