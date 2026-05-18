// configuracao-schemas.js — define schema declarativo para cada uma das 8 configurações.
// O CRUD genérico em configuracao.js consome esses schemas para renderizar tabelas e formulários.

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
 *   - ref         : referência a outra configuração (options vêm da configuração)
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

const _RAW_CONFIGURACOES = {
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
    titulo: 'Modalidades de concorrência (cotas)',
    descricao: 'Categorias de vaga (AC, V, LB_*, LI_*, PSIQ_*) com seus critérios cumulativos.',
    icone: '🎯',
    key: Keys.MODALIDADES,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome completo' },
      { campo: 'exige_heteroidentificacao', label: 'Hetero?', tipo: 'bool' },
      { campo: 'exige_comprovacao_renda', label: 'Renda?', tipo: 'bool' },
      { campo: 'exige_laudo_pcd', label: 'Laudo?', tipo: 'bool' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome completo', tipo: 'text', required: true },
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
    descricao: '<strong>Toda janela do edital é uma etapa</strong> — administrativas (inscrição, homologação, divulgação), avaliativas (provas, redação, banca, entrevista) ou de importação automática (notas ENEM). Atributos invariantes ficam aqui; peso, datas e nota mínima vivem no edital.',
    icone: '📝',
    key: Keys.TIPOS_ETAPA,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'categoria', label: 'Categoria' },
      { campo: 'escala', label: 'Escala' },
      { campo: 'permite_recurso_default', label: 'Recurso?', tipo: 'bool' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      {
        campo: 'categoria',
        label: 'Categoria',
        tipo: 'select',
        required: true,
        options: [
          { value: 'ADMINISTRATIVA', label: 'Administrativa (inscrição, homologação, divulgação…)' },
          { value: 'AVALIATIVA', label: 'Avaliativa (prova, redação, banca, entrevista…)' },
          { value: 'IMPORTACAO_AUTOMATICA', label: 'Importação automática (notas ENEM via INEP)' },
        ],
        hint: 'Avaliativa expõe peso, nota mínima e eliminatória no cadastro do edital. Administrativa esconde esses campos. Importação automática é tratada como avaliativa, sem peso configurável.',
      },
      {
        campo: 'escala',
        label: 'Escala de nota',
        tipo: 'select',
        options: [
          { value: 'ESC_0_10', label: '0 a 10' },
          { value: 'ESC_0_1000', label: '0 a 1000 (ENEM)' },
        ],
        hint: 'Aplicável apenas a etapas avaliativas ou de importação.',
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
          { value: 'AVALIACAO_DOCUMENTAL', label: 'Avaliação documental' },
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

  'cidades-prova': {
    titulo: 'Cidades de prova',
    descricao: 'Cidades disponíveis para o candidato escolher na inscrição. <strong>O local exato (sala/prédio) é definido depois, pelo módulo de ensalamento</strong> — fora do escopo da fase de inscrição. Cada cidade aparece como opção para o candidato no momento da inscrição.',
    icone: '📍',
    key: Keys.CIDADES_PROVA,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Cidade' },
      { campo: 'uf', label: 'UF' },
      { campo: 'municipio_ibge_id', label: 'ID IBGE' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único, ex.: MARABA, SAO_FELIX.' },
      { campo: 'nome', label: 'Cidade', tipo: 'text', required: true, hint: 'Nome da cidade como aparecerá para o candidato.' },
      { campo: 'uf', label: 'UF', tipo: 'text', maxlength: 2, required: true },
      { campo: 'municipio_ibge_id', label: 'ID IBGE do município', tipo: 'text', hint: 'Código IBGE de 7 dígitos. Opcional.' },
      { campo: 'observacoes', label: 'Observações', tipo: 'textarea' },
    ],
  },

  necessidades: {
    titulo: 'Necessidades especiais',
    descricao: 'Atendimento diferenciado durante a prova: gravidez, PcD, baixa visão, mobilidade reduzida, etc.',
    icone: 'img/Accessibility_logo.svg',
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
    descricao: 'Configuração de documentos exigidos nas inscrições (RG, histórico, declarações, laudos).',
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
    descricao: 'Critérios reutilizáveis pelos editais ao definir ordem de desempate.',
    icone: '🥇',
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
      { campo: 'versao', label: 'Versão', tipo: 'text', hint: 'Versionamento dos critérios (v1, v2…)' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
    ],
  },

  obrigatoriedades: {
    titulo: 'Obrigatoriedades legais',
    descricao: 'Regras que validam editais conforme legislação. <strong>Substituem validações hardcoded</strong> — quando lei muda, atualiza aqui sem deploy.',
    icone: '📜',
    key: Keys.OBRIGATORIEDADES,
    colunas: [
      { campo: 'tipo_edital_codigo', label: 'Tipo edital' },
      { campo: 'categoria', label: 'Categoria' },
      { campo: 'regra_codigo', label: 'Regra' },
      { campo: 'descricao', label: 'Descrição', truncate: 60 },
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
        campo: 'descricao',
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

  cursos: {
    titulo: 'Cursos',
    descricao: 'Cada combinação <strong>(nome, grau, campus, turno)</strong> é uma entrada única. O mesmo nome (ex.: História, Engenharia Civil) pode ter múltiplas entradas — uma por campus + grau. Editais cadastram vagas referenciando entradas daqui.',
    icone: '🎓',
    key: Keys.CURSOS,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'grau', label: 'Grau' },
      { campo: 'campus_codigo', label: 'Campus' },
      { campo: 'turno', label: 'Turno' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único. Convenção: {CAMPUS}-{NOME-ABREV}-{GRAU-ABREV}. Ex.: MARABA-HISTORIA-LIC.' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      {
        campo: 'grau',
        label: 'Grau',
        tipo: 'select',
        required: true,
        options: [
          { value: 'BACHARELADO', label: 'Bacharelado' },
          { value: 'LICENCIATURA', label: 'Licenciatura' },
          { value: 'TECNOLOGO', label: 'Tecnólogo' },
        ],
      },
      {
        campo: 'campus_codigo',
        label: 'Cidade do campus',
        tipo: 'ref',
        refKey: 'cidades-prova',
        refValue: 'codigo',
        refLabel: 'nome',
        required: true,
        hint: 'Cidade onde fica o campus que oferece o curso. Vem de Configurações › Cidades de prova.',
      },
      {
        campo: 'turno',
        label: 'Turno',
        tipo: 'select',
        required: true,
        options: [
          { value: 'MATUTINO', label: 'Matutino' },
          { value: 'VESPERTINO', label: 'Vespertino' },
          { value: 'NOTURNO', label: 'Noturno' },
          { value: 'INTEGRAL', label: 'Integral' },
        ],
      },
      { campo: 'duracao_semestres', label: 'Duração (semestres)', tipo: 'number' },
      { campo: 'e_mec_codigo', label: 'Código e-MEC', tipo: 'text', hint: 'Identificador oficial no sistema e-MEC do MEC. Opcional.' },
      { campo: 'observacoes', label: 'Observações', tipo: 'textarea' },
    ],
  },

  'estrategias-balanceamento': {
    titulo: 'Estratégias de balanceamento de vagas',
    descricao: 'Estratégia aplicada quando o mínimo garantido por modalidade faria a soma exceder o total do curso. <strong>Componível via dados:</strong> escolha uma das 3 estratégias canônicas em <code>distribuicao-vagas.js → ESTRATEGIAS</code> e liste os campos afetados. Sem eval — estratégias novas precisam de PR no código (auditabilidade).',
    icone: '🎚️',
    key: Keys.ESTRATEGIAS_BALANCEAMENTO,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'estrategia_codigo', label: 'Estratégia' },
      { campo: 'parametros_campos', label: 'Campos', tipo: 'tags' },
      { campo: 'descricao', label: 'Descrição', truncate: 80 },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único, ex.: REDUZIR_AC, REDUZIR_EP_DEPOIS_AC.' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      {
        campo: 'estrategia_codigo',
        label: 'Estratégia canônica',
        tipo: 'select',
        required: true,
        options: [
          { value: 'PERMITE_ESTOURO', label: 'PERMITE_ESTOURO — não ajusta, soma pode passar VO' },
          { value: 'REDUZIR_DE', label: 'REDUZIR_DE — subtrai dos campos listados, na ordem (cascata)' },
          { value: 'REDUZIR_PROPORCIONAL_EM', label: 'REDUZIR_PROPORCIONAL_EM — distribui proporcionalmente entre os campos' },
        ],
        hint: 'Função em distribuicao-vagas.js → ESTRATEGIAS. Não há eval — só estas três estão disponíveis. Novas estratégias exigem PR no repositório.',
      },
      {
        campo: 'parametros_campos',
        label: 'Campos afetados',
        tipo: 'multi-tag',
        hint: 'Lista de modalidades (separadas por vírgula). Ordem importa em REDUZIR_DE. Códigos válidos: ac, lb_ppi, lb_q, lb_pcd, lb_ep, li_ppi, li_q, li_pcd, li_ep.',
      },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea', required: true, hint: 'Explique o efeito da combinação estratégia + campos para o admin entender quando usar.' },
      { campo: 'base_legal', label: 'Base legal / justificativa', tipo: 'text' },
    ],
  },

  'cascatas-remanejamento': {
    titulo: 'Cascatas de remanejamento',
    descricao: 'Ordem em que vagas não preenchidas são redirecionadas entre modalidades. Cada entrada é uma política (Portaria MEC 704/2025 para SiSU, Res. 532/2021 para PSIQ, etc.). <strong>O edital escolhe uma cascata; o snapshot congela na publicação (RN08).</strong> Em <code>ordens</code>, cada chave é uma modalidade de origem e o valor é a lista ordenada de destinos. Se todos os destinos esgotarem, a vaga vai para <code>fallback_codigo</code> (tipicamente AC).',
    icone: '🔀',
    key: Keys.CASCATAS_REMANEJAMENTO,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'fallback_codigo', label: 'Fallback' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único. Ex.: PORTARIA_MEC_704_2025, PSIQ_RES_532.' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text', required: true },
      {
        campo: 'fallback_codigo',
        label: 'Modalidade fallback',
        tipo: 'ref',
        refKey: 'modalidades',
        refValue: 'codigo',
        refLabel: 'codigo',
        required: true,
        hint: 'Destino final quando todos os destinos da ordem esgotarem. Tipicamente AC.',
      },
      {
        campo: 'ordens',
        label: 'Ordens de remanejamento',
        tipo: 'cascata-ordens',
        required: true,
        hint: 'Para cada modalidade origem, defina a ordem em que vagas não preenchidas serão redirecionadas. Use as setas para reordenar. Modalidades sem origem própria caem direto no fallback.',
      },
    ],
  },

  'percentuais-ibge': {
    titulo: 'Percentuais demográficos (IBGE)',
    descricao: 'Insumos da fórmula de distribuição de vagas por modalidade (Lei 12.711/2012 + Lei 14.723/2023). Cada entrada representa uma UF + edição do Censo. <strong>O edital referencia uma entrada pelo código; a publicação congela os valores no snapshot (RN08).</strong>',
    icone: '📊',
    key: Keys.PERCENTUAIS_IBGE,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'uf', label: 'UF' },
      { campo: 'ano_censo', label: 'Ano' },
      { campo: 'ppi', label: 'PPI (%)' },
      { campo: 'q', label: 'Q (%)' },
      { campo: 'pcd', label: 'PcD (%)' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único. Ex.: PARA_2022.' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'uf', label: 'UF', tipo: 'text', maxlength: 2, required: true },
      { campo: 'ano_censo', label: 'Ano do Censo', tipo: 'number', required: true, hint: 'Ano de referência do Censo Demográfico do IBGE.' },
      { campo: 'ppi', label: 'PPI (%) — Pretos + Pardos + Indígenas', tipo: 'number', step: '0.01', required: true },
      { campo: 'q', label: 'Q (%) — Quilombolas', tipo: 'number', step: '0.01', required: true },
      { campo: 'pcd', label: 'PcD (%) — critério Grupo de Washington', tipo: 'number', step: '0.01', required: true },
      { campo: 'fonte', label: 'Fonte', tipo: 'text', hint: 'Ex.: IBGE Censo 2022, Tabela 9605.' },
      { campo: 'observacoes', label: 'Observações', tipo: 'textarea' },
    ],
  },
};

/**
 * Ordem canônica das configurações no hub — agrupa por afinidade:
 *   1. Catalogação base (entidades de domínio + vocabulários)
 *   2. Insumos legais e demográficos
 *   3. Estratégias / regras de cálculo
 */
const ORDEM_CONFIGURACOES = [
  'tipos-edital',
  'tipos-etapa',
  'modalidades',
  'cursos',
  'cidades-prova',
  'tipos-documento',
  'necessidades',
  'criterios-desempate',
  'obrigatoriedades',
  'percentuais-ibge',
  'estrategias-balanceamento',
  'cascatas-remanejamento',
];

export const CONFIGURACOES = Object.fromEntries(
  ORDEM_CONFIGURACOES.map((slug) => [slug, _RAW_CONFIGURACOES[slug]])
);

export function getConfiguracao(slug) {
  return CONFIGURACOES[slug] || null;
}

export function listConfiguracoes() {
  return Object.entries(CONFIGURACOES).map(([slug, def]) => ({
    slug,
    titulo: def.titulo,
    descricao: def.descricao,
    icone: def.icone,
    key: def.key,
  }));
}
