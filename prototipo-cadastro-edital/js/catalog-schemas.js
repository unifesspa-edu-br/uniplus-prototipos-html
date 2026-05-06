// catalog-schemas.js — define schema declarativo para cada um dos 8 catálogos.
// O CRUD genérico em catalog.js consome esses schemas para renderizar tabelas e formulários.

import { Keys } from './storage.js';

/**
 * Tipos de campo suportados:
 *   - text        : input simples
 *   - textarea    : textarea
 *   - number      : input numérico
 *   - date        : input date
 *   - checkbox    : booleano
 *   - select      : combo (options: [{value, label}])
 *   - multi-tag   : tags livres separadas por vírgula no input, persistidos como array
 *   - select-tags : multi-select com options definidas
 *   - json        : textarea com parse JSON
 *   - ref         : referência a outro catálogo (options vêm do catálogo)
 */

const CATEGORIA_OPTS = [
  { value: 'IDENTIFICACAO', label: 'Identificação' },
  { value: 'ESCOLARIDADE', label: 'Escolaridade' },
  { value: 'RENDA', label: 'Renda' },
  { value: 'RACA_ETNIA', label: 'Raça/Etnia' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'RESIDENCIA', label: 'Residência' },
  { value: 'OUTROS', label: 'Outros' },
];

const CATEGORIA_OBRIG_OPTS = [
  { value: 'ETAPA', label: 'Etapa' },
  { value: 'MODALIDADE', label: 'Modalidade' },
  { value: 'DESEMPATE', label: 'Desempate' },
  { value: 'DOCUMENTO', label: 'Documento' },
  { value: 'BONUS', label: 'Bônus' },
  { value: 'ATENDIMENTO', label: 'Atendimento especial' },
  { value: 'OUTROS', label: 'Outros' },
];

export const CATALOGOS = {
  'tipos-edital': {
    titulo: 'Tipos de edital',
    descricao: 'Templates por tipo de processo seletivo. Define defaults aplicados ao iniciar o wizard.',
    icone: '📋',
    key: Keys.TIPOS_EDITAL,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'permite_duas_opcoes_curso', label: '2 opções', tipo: 'bool' },
      { campo: 'vagas_suplementares', label: 'Suplementares', tipo: 'bool' },
      { campo: 'base_legal_referencia', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único (ex.: SISU, PSIQ).' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'permite_duas_opcoes_curso', label: 'Permite 2 opções de curso?', tipo: 'checkbox' },
      { campo: 'exige_prova_presencial', label: 'Exige prova presencial?', tipo: 'checkbox' },
      { campo: 'vagas_suplementares', label: 'Tem vagas suplementares?', tipo: 'checkbox' },
      { campo: 'defaults', label: 'Defaults (JSON)', tipo: 'json', hint: 'Sub-objeto com etapas/fórmula/modalidades/desempate sugeridos.' },
      { campo: 'base_legal_referencia', label: 'Base legal', tipo: 'text' },
    ],
  },

  modalidades: {
    titulo: 'Modalidades de concorrência',
    descricao: 'Categorias de vaga (AC, V, LB_*, LI_*, PSIQ_*) com seus critérios cumulativos.',
    icone: '🎯',
    key: Keys.MODALIDADES,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome_completo', label: 'Nome completo' },
      { campo: 'exige_heteroidentificacao', label: 'Hetero?', tipo: 'bool' },
      { campo: 'exige_comprovacao_renda', label: 'Renda?', tipo: 'bool' },
      { campo: 'exige_laudo_pcd', label: 'Laudo?', tipo: 'bool' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome_completo', label: 'Nome completo', tipo: 'text', required: true },
      { campo: 'criterios_cumulativos', label: 'Critérios cumulativos', tipo: 'multi-tag', hint: 'Ex.: ESCOLA_PUBLICA, RENDA_ATE_1SM_PER_CAPITA' },
      { campo: 'exige_heteroidentificacao', label: 'Exige heteroidentificação?', tipo: 'checkbox' },
      { campo: 'exige_comprovacao_renda', label: 'Exige comprovação de renda?', tipo: 'checkbox' },
      { campo: 'exige_laudo_pcd', label: 'Exige laudo PcD?', tipo: 'checkbox' },
      { campo: 'exige_declaracao_quilombola', label: 'Exige declaração quilombola?', tipo: 'checkbox' },
      { campo: 'liderancas_minimas', label: 'Lideranças mínimas (declaração)', tipo: 'number' },
      {
        campo: 'acao_quando_indeferido',
        label: 'Ação quando indeferido',
        tipo: 'select',
        options: [
          { value: 'RECLASSIFICAR_AC', label: 'Reclassificar para AC' },
          { value: 'RECLASSIFICAR_REGRA_EDITAL', label: 'Reclassificar conforme regra do edital' },
        ],
      },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
    ],
  },

  'tipos-etapa': {
    titulo: 'Tipos de etapa',
    descricao: 'Atributos invariantes (escala, tipo de correção, anonimização). Peso e ordem ficam no edital, não aqui.',
    icone: '📝',
    key: Keys.TIPOS_ETAPA,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'escala', label: 'Escala' },
      { campo: 'tipo_correcao', label: 'Correção' },
      { campo: 'modalidade_aplicacao', label: 'Aplicação' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      {
        campo: 'escala',
        label: 'Escala de nota',
        tipo: 'select',
        options: [
          { value: 'ESC_0_10', label: '0 a 10' },
          { value: 'ESC_0_1000', label: '0 a 1000 (ENEM)' },
        ],
      },
      {
        campo: 'tipo_correcao',
        label: 'Tipo de correção',
        tipo: 'select',
        options: [
          { value: 'LEITURA_OPTICA', label: 'Leitura óptica' },
          { value: 'BANCA_CORRETOR', label: 'Banca de corretores' },
          { value: 'AUTOMATICO', label: 'Automático' },
          { value: 'AVALIACAO_SUBJETIVA', label: 'Avaliação subjetiva' },
        ],
      },
      {
        campo: 'modalidade_aplicacao',
        label: 'Modalidade de aplicação',
        tipo: 'select',
        options: [
          { value: 'PRESENCIAL', label: 'Presencial' },
          { value: 'VIRTUAL', label: 'Virtual' },
          { value: 'ANALISE_DOCUMENTAL', label: 'Análise documental' },
        ],
      },
      { campo: 'exige_anonimizacao', label: 'Exige anonimização?', tipo: 'checkbox' },
      { campo: 'num_corretores_default', label: 'Nº corretores (default)', tipo: 'number' },
      { campo: 'permite_recurso_default', label: 'Permite recurso (default)?', tipo: 'checkbox' },
    ],
  },

  'locais-prova': {
    titulo: 'Locais de prova',
    descricao: 'Polos físicos onde provas são aplicadas. Capacidade pode ser ajustada por edital.',
    icone: '📍',
    key: Keys.LOCAIS_PROVA,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'municipio', label: 'Município' },
      { campo: 'uf', label: 'UF' },
      { campo: 'capacidade', label: 'Capacidade' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'municipio', label: 'Município', tipo: 'text', required: true },
      { campo: 'municipio_ibge_id', label: 'ID IBGE do município', tipo: 'text' },
      { campo: 'uf', label: 'UF', tipo: 'text', maxlength: 2 },
      { campo: 'endereco', label: 'Endereço', tipo: 'textarea' },
      { campo: 'capacidade', label: 'Capacidade', tipo: 'number' },
      { campo: 'responsavel', label: 'Responsável', tipo: 'text' },
    ],
  },

  necessidades: {
    titulo: 'Necessidades especiais',
    descricao: 'Atendimento diferenciado durante a prova: gravidez, PcD, baixa visão, mobilidade reduzida, etc.',
    icone: '♿',
    key: Keys.NECESSIDADES,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'exige_laudo', label: 'Laudo?', tipo: 'bool' },
      { campo: 'recursos_requeridos', label: 'Recursos', tipo: 'tags' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'exige_laudo', label: 'Exige laudo?', tipo: 'checkbox' },
      { campo: 'validade_laudo_dias', label: 'Validade do laudo (dias)', tipo: 'number' },
      {
        campo: 'recursos_requeridos',
        label: 'Recursos requeridos',
        tipo: 'multi-tag',
        hint: 'Ex.: SALA_TERREA, LEDOR, PROVA_AMPLIADA, INTERPRETE_LIBRAS, TEMPO_ADICIONAL',
      },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
    ],
  },

  'tipos-documento': {
    titulo: 'Tipos de documento',
    descricao: 'Catálogo de documentos exigidos nas inscrições (RG, histórico, declarações, laudos).',
    icone: '📄',
    key: Keys.TIPOS_DOCUMENTO,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'categoria', label: 'Categoria' },
      { campo: 'formatos_aceitos', label: 'Formatos', tipo: 'tags' },
      { campo: 'validade_dias', label: 'Validade (dias)' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'formatos_aceitos', label: 'Formatos aceitos', tipo: 'multi-tag', hint: 'Ex.: PDF, JPG, PNG' },
      { campo: 'tamanho_maximo_mb', label: 'Tamanho máximo (MB)', tipo: 'number' },
      { campo: 'validade_dias', label: 'Validade (dias)', tipo: 'number', hint: 'Vazio = sem validade' },
      { campo: 'exige_assinatura_digital', label: 'Exige assinatura digital?', tipo: 'checkbox' },
      { campo: 'exige_liderancas', label: 'Lideranças exigidas (declaração)', tipo: 'number' },
      { campo: 'categoria', label: 'Categoria', tipo: 'select', options: CATEGORIA_OPTS },
    ],
  },

  'criterios-desempate': {
    titulo: 'Critérios de desempate',
    descricao: 'Primitivas reutilizáveis pelos editais ao definir ordem de desempate.',
    icone: '⚖️',
    key: Keys.CRITERIOS_DESEMPATE,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'requer_etapa_referencia', label: 'Etapa?', tipo: 'bool' },
      { campo: 'versao', label: 'Versão' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'requer_etapa_referencia', label: 'Requer etapa de referência?', tipo: 'checkbox' },
      { campo: 'versao', label: 'Versão', tipo: 'text', hint: 'Versionamento de primitivas (v1, v2…)' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
    ],
  },

  obrigatoriedades: {
    titulo: 'Obrigatoriedades legais',
    descricao: 'Regras que validam editais conforme legislação. <strong>Substituem validações hardcoded</strong> — quando lei muda, atualiza aqui sem deploy.',
    icone: '⚖️',
    key: Keys.OBRIGATORIEDADES,
    colunas: [
      { campo: 'tipo_edital_codigo', label: 'Tipo edital' },
      { campo: 'categoria', label: 'Categoria' },
      { campo: 'regra_codigo', label: 'Regra' },
      { campo: 'descricao_humana', label: 'Descrição', truncate: 60 },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      {
        campo: 'tipo_edital_codigo',
        label: 'Tipo de edital',
        tipo: 'ref',
        refKey: 'tipos-edital',
        refValue: 'codigo',
        refLabel: 'nome',
        permiteCoringa: true,
        hint: 'Use "*" para regras aplicáveis a qualquer tipo de edital.',
      },
      { campo: 'categoria', label: 'Categoria', tipo: 'select', options: CATEGORIA_OBRIG_OPTS, required: true },
      {
        campo: 'regra_codigo',
        label: 'Código da regra',
        tipo: 'text',
        required: true,
        hint: 'Ex.: ETAPA_OBRIGATORIA, MODALIDADES_MINIMAS, BONUS_OBRIGATORIO, DESEMPATE_DEVE_INCLUIR, DOCUMENTO_OBRIGATORIO_PARA_MODALIDADE',
      },
      {
        campo: 'parametros',
        label: 'Parâmetros (JSON)',
        tipo: 'json',
        hint: 'Payload da regra. Ex.: {"tipo_etapa": "BANCA_HETEROIDENTIFICACAO"} ou {"modalidades": ["AC","LB_PPI"]}',
      },
      {
        campo: 'descricao_humana',
        label: 'Descrição humana',
        tipo: 'textarea',
        required: true,
        hint: 'Texto que o admin vê quando a regra falha no passo [13].',
      },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text', required: true },
      { campo: 'data_vigencia_inicio', label: 'Vigência — início', tipo: 'date' },
      { campo: 'data_vigencia_fim', label: 'Vigência — fim', tipo: 'date', hint: 'Vazio = sem fim definido.' },
    ],
  },
};

export function getCatalogo(slug) {
  return CATALOGOS[slug] || null;
}

export function listCatalogos() {
  return Object.entries(CATALOGOS).map(([slug, def]) => ({
    slug,
    titulo: def.titulo,
    descricao: def.descricao,
    icone: def.icone,
    key: def.key,
  }));
}
