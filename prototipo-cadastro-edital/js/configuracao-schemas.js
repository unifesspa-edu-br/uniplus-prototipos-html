// configuracao-schemas.js — define schema declarativo para cada configuração.
// O CRUD genérico em configuracao.js consome esses schemas para renderizar tabelas e formulários.

import { Keys } from './storage.js';
import { TIPOS_UNIDADE_OPTIONS } from './vocabulario-unidades.js';

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
  { value: 'ATENDIMENTO', label: 'Atendimento especializado' },
  { value: 'OUTROS', label: 'Outros' },
];

const _RAW_CONFIGURACOES = {
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
        hint: 'Classifica a unidade na hierarquia institucional. Obrigatório no MVP.',
        // options vêm de vocabulario-unidades.js — fonte única compartilhada com validador.
        options: TIPOS_UNIDADE_OPTIONS,
      },
      { campo: 'unidade_academica', label: 'Unidade acadêmica?', tipo: 'checkbox', hint: 'Marque se a unidade oferta cursos diretamente (Institutos, Faculdades).' },
    ],
  },

  'tipos-edital': {
    titulo: 'Tipos de edital',
    descricao: 'Templates por tipo de processo seletivo. Define defaults aplicados ao iniciar o wizard.',
    icone: '📋',
    key: Keys.TIPOS_EDITAL,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'permite_duas_opcoes_curso', label: '2 opções', tipo: 'bool' },
      { campo: 'exige_prova_presencial', label: 'Prova presencial', tipo: 'bool' },
      { campo: 'vagas_suplementares', label: 'Suplementares', tipo: 'bool' },
      { campo: 'base_legal_referencia', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único (ex.: SISU, PSIQ).' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'permite_duas_opcoes_curso', label: 'Permite 2 opções de curso?', tipo: 'checkbox' },
      { campo: 'exige_prova_presencial', label: 'Exige prova presencial?', tipo: 'checkbox', hint: 'Quando marcado, o edital exige prova local — habilita as obrigatoriedades de atendimento especializado (PcD, gestante, lactante). Tipos como SiSU/Transferência usam nota ENEM ou histórico, sem prova presencial.' },
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

  cidades: {
    titulo: 'Cidades',
    descricao: 'Cadastro de cidades reutilizável por qualquer parte do sistema (cidade do candidato, cidade onde fica o campus, cidade aceita para aplicação de prova no edital). Inclui metadados enriquecidos (IBGE, DDD, lat/long, mesorregião e dados do Censo) para preparar o terreno de operações futuras (georef, distância, ensalamento). <strong>Não confunda com "cidades de prova" — esse é um uso contextual no edital onde o admin escolhe quais Cidades cadastradas aceitam aplicação de prova.</strong>',
    icone: '📍',
    key: Keys.CIDADES,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Cidade' },
      { campo: 'uf', label: 'UF' },
      { campo: 'ibge_id', label: 'ID IBGE' },
      { campo: 'regiao', label: 'Região' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Identificador único, ex.: MARABA, SAO_FELIX.' },
      { campo: 'nome', label: 'Cidade', tipo: 'text', required: true, hint: 'Nome da cidade.' },
      { campo: 'uf', label: 'UF', tipo: 'text', maxlength: 2, required: true },
      { campo: 'ibge_id', label: 'ID IBGE do município', tipo: 'text', hint: 'Código IBGE de 7 dígitos.' },
      { campo: 'ddd', label: 'DDD', tipo: 'text', maxlength: 3, hint: 'DDD principal do município. Ex.: 94 (sudeste do Pará).' },
      { campo: 'latitude', label: 'Latitude', tipo: 'number', step: '0.000001', hint: 'Latitude do município (graus decimais, WGS-84).' },
      { campo: 'longitude', label: 'Longitude', tipo: 'number', step: '0.000001', hint: 'Longitude do município (graus decimais, WGS-84).' },
      {
        campo: 'regiao',
        label: 'Região',
        tipo: 'select',
        options: [
          { value: 'NORTE', label: 'Norte' },
          { value: 'NORDESTE', label: 'Nordeste' },
          { value: 'CENTRO_OESTE', label: 'Centro-Oeste' },
          { value: 'SUDESTE', label: 'Sudeste' },
          { value: 'SUL', label: 'Sul' },
        ],
        hint: 'Macrorregião IBGE.',
      },
      { campo: 'mesorregiao', label: 'Mesorregião', tipo: 'text', hint: 'Mesorregião IBGE.' },
      { campo: 'microrregiao', label: 'Microrregião', tipo: 'text', hint: 'Microrregião IBGE.' },
      { campo: 'populacao_residente', label: 'População residente (Censo)', tipo: 'number' },
      { campo: 'densidade_demografica', label: 'Densidade demográfica (hab/km²)', tipo: 'number', step: '0.01' },
      { campo: 'area_territorial_km2', label: 'Área territorial (km²)', tipo: 'number', step: '0.01' },
      { campo: 'observacoes', label: 'Observações', tipo: 'textarea' },
    ],
  },

  // Refactor 2 — LocalOferta (binding TL 2026-05-19): substitui 'campus'.
  // 13 entradas (1 por endereço e-MEC cadastrado sob IES 18440 — Unifesspa).
  'local-oferta': {
    titulo: 'Locais de Oferta',
    descricao: 'Locais físicos/regulatórios onde a Unifesspa oferta cursos. Cada entrada corresponde a <strong>um endereço cadastrado no e-MEC</strong> sob a IES 18440 (Decreto 9.235/2017). Tipos: campus sede, campus fora de sede, curso fora de sede, polo EaD, convênio de interiorização (Forma Pará, PARFOR, Pepeti, Pronera) e outro. <strong>Não confunda</strong> com Cidades (município) nem com Unidades (entidade institucional).',
    icone: '🏛️',
    key: Keys.LOCAL_OFERTA,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'tipo', label: 'Tipo' },
      { campo: 'cidade_codigo', label: 'Cidade' },
      { campo: 'codigo_emec', label: 'Código e-MEC' },
      { campo: 'principal_em_municipio', label: 'Principal?', tipo: 'bool' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Slug único. Ex.: MARABA_UI, SANTANA_A, CANAA_PEPETI.' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      {
        campo: 'tipo',
        label: 'Tipo regulatório',
        tipo: 'select',
        required: true,
        options: [
          { value: 'CAMPUS_SEDE', label: 'Campus sede (credenciado MEC)' },
          { value: 'CAMPUS_FORA_DE_SEDE', label: 'Campus fora de sede' },
          { value: 'CURSO_FORA_DE_SEDE', label: 'Curso fora de sede' },
          { value: 'POLO_EAD', label: 'Polo EaD' },
          { value: 'CONVENIO_INTERIORIZACAO', label: 'Convênio de interiorização (Forma Pará / PARFOR / Pepeti / Pronera)' },
          { value: 'OUTRO', label: 'Outro' },
        ],
        hint: 'Classifica o local segundo Decreto 9.235/2017. Impacta regras regulatórias e atos MEC necessários.',
      },
      {
        campo: 'cidade_codigo',
        label: 'Cidade',
        tipo: 'ref',
        refKey: 'cidades',
        refValue: 'codigo',
        refLabel: 'nome',
        required: true,
        hint: 'Município onde o local está situado. Vem de Configurações › Cidades.',
      },
      {
        campo: 'campus_responsavel_codigo',
        label: 'Campus responsável (sede)',
        tipo: 'ref',
        refKey: 'local-oferta',
        refValue: 'codigo',
        refLabel: 'nome',
        refFilterField: 'tipo',
        refFilterValues: ['CAMPUS_SEDE', 'CAMPUS_FORA_DE_SEDE'],
        required: false,
        hint: 'Campus sede que responde por este local no MEC (apenas campi sede são listados). Deixe em branco para campus sede principal.',
      },
      { campo: 'codigo_emec', label: 'Código e-MEC', tipo: 'text', hint: 'Código do endereço no cadastro e-MEC (IES 18440). Permite rastrear ao cadastro regulatório diretamente.' },
      { campo: 'principal_em_municipio', label: 'Principal no município?', tipo: 'checkbox', hint: 'Marca o endereço com Polo=A no e-MEC (referência administrativa principal do município).' },
      { campo: 'endereco', label: 'Endereço', tipo: 'text' },
      { campo: 'cep', label: 'CEP', tipo: 'text', maxlength: 9 },
      { campo: 'latitude', label: 'Latitude', tipo: 'number', step: '0.000001', hint: 'Latitude WGS-84. Opcional.' },
      { campo: 'longitude', label: 'Longitude', tipo: 'number', step: '0.000001', hint: 'Longitude WGS-84. Opcional.' },
      { campo: 'ato_regulatorio_mec', label: 'Ato regulatório MEC', tipo: 'text', hint: 'Referência do ato de credenciamento/autorização (ex.: Lei 12.824/2013, Portaria MEC nº X/YYYY). Auditoria MEC.' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
      { campo: 'observacoes', label: 'Observações', tipo: 'textarea' },
    ],
  },

  'tipos-deficiencia': {
    titulo: 'Tipos de deficiência (PcD)',
    descricao: 'Configuração restrita de deficiências reconhecidas como PcD (Lei 13.146/2015 — LBI; Resolução 64/2015 CONSEPE/Unifesspa). <strong>Não confunda</strong> com Condições de atendimento especializado (dislexia, TDAH, gestante, lactante, idoso, diabetes etc. — item 4.2.1 do edital ENEM) nem com Recursos de acessibilidade (adaptações na prova). A solicitação do candidato é processo posterior, modelado em fase futura.',
    icone: '♿',
    key: Keys.TIPOS_DEFICIENCIA,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'categoria_lbi', label: 'Categoria LBI' },
      { campo: 'exige_laudo', label: 'Laudo?', tipo: 'bool' },
      { campo: 'validade_laudo_dias', label: 'Validade (dias)' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'categoria_lbi', label: 'Categoria LBI', tipo: 'text', hint: 'Classificação da LBI (Lei 13.146/2015). Ex.: SENSORIAL, FISICA, MULTIPLA, INTELECTUAL, TEA.' },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'exige_laudo', label: 'Exige laudo?', tipo: 'checkbox' },
      { campo: 'validade_laudo_dias', label: 'Validade do laudo (dias)', tipo: 'number' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
    ],
  },

  'condicoes-atendimento-especializado': {
    titulo: 'Condições de atendimento especializado',
    descricao: 'Categorias de candidato reconhecidas pelo INEP para fins de atendimento especializado (Edital ENEM 52/2025 item 4.2.1). Inclui PcD, transtornos funcionais específicos (dislexia, TDAH, discalculia), condições de saúde (diabetes, classe hospitalar), gestante, lactante, idoso e outra condição específica. <strong>Não confunda</strong> com Tipos de deficiência (configuração PcD da LBI) nem com Recursos de acessibilidade (adaptações na prova).',
    icone: '🧩',
    key: Keys.CONDICOES_ATENDIMENTO_ESPECIALIZADO,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'descricao', label: 'Descrição', truncate: 80 },
      { campo: 'exige_laudo', label: 'Laudo?', tipo: 'bool' },
      { campo: 'base_legal', label: 'Base legal' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Ex.: PCD, DISLEXIA, DEFICIT_ATENCAO, GESTANTE, LACTANTE, IDOSO.' },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      { campo: 'exige_laudo', label: 'Exige laudo?', tipo: 'checkbox' },
      { campo: 'exige_tipos_deficiencia', label: 'Exige sub-bloco de tipos de deficiência?', tipo: 'checkbox', hint: 'Somente para PcD (LBI). Ao marcar, o passo 12 exibe o sub-bloco de tipos de deficiência.' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text' },
    ],
  },

  'recursos-acessibilidade': {
    titulo: 'Recursos de acessibilidade',
    descricao: 'Configuração de adaptações disponíveis para o candidato durante a aplicação da prova (vocabulário canônico INEP — Edital ENEM 52/2025 item 4.2.2 + extensões institucionais Unifesspa). O campo <strong>Origem</strong> distingue recursos oficiais do INEP de extensões locais. O edital oferece um subconjunto desses recursos no passo de <strong>atendimento especializado</strong>.',
    icone: '🛠️',
    key: Keys.RECURSOS_ACESSIBILIDADE,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'origem', label: 'Origem' },
      { campo: 'descricao', label: 'Descrição', truncate: 80 },
      { campo: 'fonte_normativa', label: 'Fonte normativa' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true },
      { campo: 'nome', label: 'Nome', tipo: 'text', required: true },
      { campo: 'descricao', label: 'Descrição', tipo: 'textarea' },
      {
        campo: 'origem',
        label: 'Origem',
        tipo: 'select',
        required: true,
        options: [
          { value: 'INEP', label: 'INEP (vocabulário oficial — item 4.2.2 do edital ENEM)' },
          { value: 'UNIFESSPA_LOCAL', label: 'Unifesspa (extensão institucional local)' },
        ],
        hint: 'INEP = recurso oficial reconhecido pelo INEP. UNIFESSPA_LOCAL = extensão institucional que vai além do item 4.2.2.',
      },
      { campo: 'fonte_normativa', label: 'Fonte normativa', tipo: 'text', hint: 'Ex.: "Edital ENEM 52/2025 item 4.2.2" ou "Resolução institucional Unifesspa".' },
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

  // Refactor 3 — Curso puro (binding TL 2026-05-19): entidade curricular sem FK de local/turno/modalidade.
  // A combinação Curso × LocalOferta × Turno × Modalidade vive em 'ofertas-curso'.
  // O código e-MEC varia por campus/oferta (ex.: Eng. Civil Marabá 1262444 ≠ Santana 1276153),
  // portanto pertence a OfertaCurso, não a Curso.
  cursos: {
    titulo: 'Cursos',
    descricao: 'Cadastro curricular puro: nome e grau do curso. Dimensões de oferta (local, turno, modalidade) vivem em <strong>Ofertas de Curso</strong>. Um mesmo curso pode ter múltiplas ofertas — ex.: Engenharia Civil em Marabá (regular) e em Santana (regular). O <strong>código e-MEC</strong> pertence à oferta (varia por campus), não ao curso curricular.',
    icone: '🎓',
    key: Keys.CURSOS,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'nome', label: 'Nome' },
      { campo: 'grau', label: 'Grau' },
      { campo: 'duracao_semestres_padrao', label: 'Duração (sem.)' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Slug único curricular. Ex.: HISTORIA-LIC, ENG-CIVIL-BACH, EDUCACAO-CAMPO-LIC.' },
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
      { campo: 'carga_horaria_total', label: 'Carga horária total (h)', tipo: 'number' },
      { campo: 'duracao_semestres_padrao', label: 'Duração padrão (semestres)', tipo: 'number' },
      { campo: 'descricao_curricular', label: 'Descrição curricular', tipo: 'textarea', hint: 'Resumo do projeto pedagógico. Opcional.' },
    ],
  },

  // Refactor 3 — OfertaCurso (binding TL 2026-05-19): instância regulatória de um Curso.
  // Curso × LocalOferta × Modalidade × FormatoPedagogico × Turno.
  // Editais referenciam OfertaCurso (não Curso) para vagas.
  'ofertas-curso': {
    titulo: 'Ofertas de Curso',
    descricao: 'Instâncias regulatórias de um curso: <strong>onde</strong> (local de oferta), <strong>qual modalidade</strong> (regular, Forma Pará, PARFOR, Pepeti…), <strong>formato pedagógico</strong> e <strong>turno</strong>. Editais cadastram vagas referenciando entradas daqui. Um mesmo curso pode ter N ofertas — ex.: <em>Educação do Campo</em> em Marabá e em Rondon são duas ofertas do mesmo curso curricular.',
    icone: '📋',
    key: Keys.OFERTAS_CURSO,
    colunas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'curso_codigo', label: 'Curso' },
      { campo: 'local_oferta_codigo', label: 'Local de oferta' },
      { campo: 'modalidade', label: 'Modalidade' },
      { campo: 'turno', label: 'Turno' },
      { campo: 'formato_pedagogico', label: 'Formato' },
      { campo: 'e_mec_codigo', label: 'Código e-MEC' },
      { campo: 'codigo_sga', label: 'SGA' },
    ],
    campos: [
      { campo: 'codigo', label: 'Código', tipo: 'text', required: true, hint: 'Slug único. Convenção mantida do legado: {LOCAL}-{CURSO-ABREV}-{GRAU-ABREV}. Ex.: MARABA-HISTORIA-LIC, CANAA-ENG-MINAS-BACH.' },
      {
        campo: 'curso_codigo',
        label: 'Curso',
        tipo: 'ref',
        refKey: 'cursos',
        refValue: 'codigo',
        refLabel: 'nome',
        required: true,
        hint: 'Curso curricular puro. Vem de Configurações › Cursos.',
      },
      {
        campo: 'local_oferta_codigo',
        label: 'Local de oferta',
        tipo: 'ref',
        refKey: 'local-oferta',
        refValue: 'codigo',
        refLabel: 'nome',
        required: true,
        hint: 'Onde o curso é ofertado. Vem de Configurações › Locais de Oferta.',
      },
      {
        campo: 'unidade_ofertante_codigo',
        label: 'Unidade ofertante',
        tipo: 'ref',
        refKey: 'unidades',
        refValue: 'codigo',
        refLabel: 'nome',
        refFilterField: 'tipo',
        refFilterValues: ['INSTITUTO', 'FACULDADE'],
        required: true,
        hint: 'Instituto/faculdade responsável acadêmico (só unidades acadêmicas são listadas). O vínculo institucional segue o instituto mesmo quando a oferta é em outro município (Rômulo/CTIC 2026-05-19).',
      },
      {
        campo: 'modalidade',
        label: 'Modalidade',
        tipo: 'select',
        required: true,
        options: [
          { value: 'REGULAR', label: 'Regular' },
          { value: 'FORMA_PARA', label: 'Forma Pará' },
          { value: 'PARFOR', label: 'PARFOR / PARFOR Equidade' },
          { value: 'PARFOR_EQUIDADE', label: 'PARFOR Equidade' },
          { value: 'PRONERA', label: 'PRONERA' },
          { value: 'PEPETI', label: 'Pepeti (Canaã dos Carajás)' },
          { value: 'PSIQ', label: 'PSIQ — Indígenas e Quilombolas' },
          { value: 'CONVENIO_OUTRO', label: 'Convênio — outro' },
          { value: 'OUTRO', label: 'Outro' },
        ],
      },
      {
        campo: 'formato_pedagogico',
        label: 'Formato pedagógico',
        tipo: 'select',
        required: true,
        options: [
          { value: 'PRESENCIAL', label: 'Presencial' },
          { value: 'SEMIPRESENCIAL', label: 'Semipresencial' },
          { value: 'EAD', label: 'EaD' },
        ],
        hint: 'Formato pedagógico conforme Portaria MEC 2.117/2019.',
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
      { campo: 'vagas_anuais_autorizadas', label: 'Vagas anuais autorizadas', tipo: 'number', hint: 'Conforme ato MEC de autorização. Opcional — editais podem ofertar menos vagas.' },
      { campo: 'ato_autorizacao_mec', label: 'Ato de autorização MEC', tipo: 'text', hint: 'Referência do convênio/ato específico desta oferta. Ex.: Resolução CONSEPE 64/2015, Portaria MEC X/YYYY. Opcional (Pergunta 8 parqueada).' },
      { campo: 'e_mec_codigo', label: 'Código e-MEC', tipo: 'text', hint: 'Código oficial do curso nesta oferta no e-MEC/MEC (Censup INEP). Varia por campus — ex.: Eng. Civil Marabá 1262444, Santana 1276153.' },
      { campo: 'codigo_sga', label: 'Código no Sistema de Gestão Acadêmica (SGA)', tipo: 'text', hint: 'Atualmente SIGAA. Identificador do curso na plataforma acadêmica. Permite cruzamento com dados de matrícula e notas.' },
      { campo: 'base_legal', label: 'Base legal', tipo: 'text', hint: 'Ex.: "Programa Pepeti", "PARFOR — Plano Nacional de Formação de Professores". Obrigatório para modalidades não-REGULAR (Forma Pará, PARFOR, PRONERA, Pepeti, PSIQ, Convênio, Outro); opcional para REGULAR.' },
      { campo: 'vigencia_inicio', label: 'Vigência — início', tipo: 'date' },
      { campo: 'vigencia_fim', label: 'Vigência — fim', tipo: 'date', hint: 'Vazio = em vigor.' },
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
 *   1. Unidade institucional + cadastros base (entidades de domínio + vocabulários)
 *   2. Insumos legais e demográficos
 *   3. Estratégias / regras de cálculo
 */
const ORDEM_CONFIGURACOES = [
  'unidades',
  'tipos-edital',
  'tipos-etapa',
  'modalidades',
  'cursos',
  'cidades',
  'local-oferta',
  'ofertas-curso',
  'tipos-documento',
  'tipos-deficiencia',
  'condicoes-atendimento-especializado',
  'recursos-acessibilidade',
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
