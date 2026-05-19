// demo-editais.js — gera rascunhos completos pré-preenchidos para demonstração.
// Carregado após os seeds das configurações (precisa dos ids para resolver as referências).
//
// Modelo de etapa unificado (toda janela do edital é uma etapa):
//   - administrativa (inscrição, homologação, divulgações)
//   - avaliativa (provas, redação, banca, entrevista)
//   - importação automática (notas ENEM)

import { Collection, Keys, randomUUID } from './storage.js';

function tipoPorCodigo(codigo) {
  const t = new Collection(Keys.TIPOS_EDITAL).byCodigo(codigo);
  return t ? { codigo: t.codigo, nome: t.nome } : null;
}

function todosOsPassosCompletos(quaisIncompletos = []) {
  const status = {};
  for (let i = 1; i <= 13; i++) {
    status[i] = quaisIncompletos.includes(i) ? 'emProgresso' : 'concluido';
  }
  return status;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Constrói uma etapa com os campos no novo formato.
 * Para etapas administrativas, peso/notaMinima/eliminatoria são ignorados pelo snapshot.
 */
function etapa({
  ordem,
  tipoEtapaCodigo,
  janelaInicio,
  janelaFim = null,
  recurso = null,
  peso = 1,
  pertenceCalculo = true,
  eliminatoria = false,
  notaMinima = null,
}) {
  return {
    tipoEtapaCodigo,
    nomeCustomizado: '',
    ordem,
    janelaInicio,
    janelaFim: janelaFim || janelaInicio,
    recurso,
    peso,
    pertenceCalculo,
    eliminatoria,
    notaMinima,
  };
}

/**
 * Constrói uma entrada de documento incluído no edital.
 * - modalidades: lista de modalidades que devem entregar (subset das modalidades do edital).
 * - etapasObrigatorias: lista de tipoEtapaCodigo onde é obrigatório; [] = todas as etapas.
 */
function doc({ codigo, modalidades, etapasObrigatorias = [] }) {
  return {
    tipoDocumentoCodigo: codigo,
    incluido: true,
    modalidades,
    etapasObrigatorias,
  };
}

// =====================================================
// Demo 1: PSE Educação do Campo 2026 — Marabá
// =====================================================
function montarPseEducacaoCampo() {
  const tipo = tipoPorCodigo('PSE_EC');
  if (!tipo) return null;

  return {
    id: randomUUID(),
    status: 'rascunho',
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    passoAtual: 12,
    statusPorPasso: todosOsPassosCompletos([13]),
    edital: {
      tipo,
      identificacao: {
        numero: 3,
        ano: 2026,
        dataEdital: '2026-04-01',
        sigla: 'CEPS/UNIFESSPA',
        unidadeDonaCodigo: 'CEPS',
        nomeProcesso:
          'Processo Seletivo Especial — Licenciatura em Educação do Campo 2026',
        anoIngresso: 2026,
        periodoIngresso: '2S',
      },
      vagas: {
        cursos: [
          { cursoCodigo: 'MARABA-EDUCACAO-CAMPO-LIC', vagas: 30 },
          { cursoCodigo: 'RONDON-EDUCACAO-CAMPO-LIC', vagas: 25 },
        ],
      },
      distribuicaoModalidades: {
        modalidades: ['AC', 'V'],
        concorrenciaDupla: false,
      },
      etapas: [
        etapa({
          ordem: 1,
          tipoEtapaCodigo: 'INSCRICAO_CANDIDATOS',
          janelaInicio: '2026-05-01',
          janelaFim: '2026-05-31',
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 2,
          tipoEtapaCodigo: 'HOMOLOGACAO_INSCRICOES',
          janelaInicio: '2026-06-01',
          janelaFim: '2026-06-07',
          recurso: { inicio: '2026-06-08', fim: '2026-06-10' },
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 3,
          tipoEtapaCodigo: 'REDACAO',
          janelaInicio: '2026-06-15',
          recurso: { inicio: '2026-06-22', fim: '2026-06-24' },
          peso: 1,
          eliminatoria: true,
          notaMinima: 4.0,
        }),
        etapa({
          ordem: 4,
          tipoEtapaCodigo: 'ENTREVISTA',
          janelaInicio: '2026-06-29',
          peso: 2,
        }),
        etapa({
          ordem: 5,
          tipoEtapaCodigo: 'ANALISE_HISTORICO',
          janelaInicio: '2026-07-06',
          janelaFim: '2026-07-08',
          peso: 1,
        }),
        etapa({
          ordem: 6,
          tipoEtapaCodigo: 'DIVULGACAO_RESULTADO_PARCIAL',
          janelaInicio: '2026-07-15',
          recurso: { inicio: '2026-07-16', fim: '2026-07-18' },
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 7,
          tipoEtapaCodigo: 'DIVULGACAO_RESULTADO_FINAL',
          janelaInicio: '2026-07-25',
          pertenceCalculo: false,
        }),
      ],
      formula: {
        agregacao: 'SOMA_PONDERADA_COM_FATOR',
        fator: 4,
        precisao: 'TRUNCAR_2_CASAS',
      },
      bonus: null,
      desempate: [
        { codigo: 'IDOSO_60', ordem: 1 },
        { codigo: 'MAIOR_NOTA_ENTREVISTA', ordem: 2 },
        { codigo: 'MAIOR_NOTA_REDACAO', ordem: 3 },
        { codigo: 'PROFESSOR_RURAL', ordem: 4 },
        { codigo: 'MAIOR_IDADE', ordem: 5 },
      ],
      eliminacao: {
        notasMinimas: { REDACAO: 4.0 },
        clausulas: [
          'FALTA_PROVA',
          'ATRASO',
          'FRAUDE',
          'NOTA_REDACAO_ZERO',
          'NOTA_REDACAO_BRANCA',
          'SEM_DECLARACAO_PERTENCIMENTO',
          'CONDUTA_INADEQUADA',
        ],
      },
      // Documentos obrigatórios na inscrição; identidade e cota ficam exigidos até a
      // homologação (etapas explícitas). COMPROVANTE_PROFESSOR_RURAL e demais tipos não
      // listados ficam fora do edital (não fazem parte da documentação necessária).
      documentos: [
        doc({ codigo: 'RG', modalidades: ['AC', 'V'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
        doc({ codigo: 'CPF', modalidades: ['AC', 'V'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
        doc({ codigo: 'HISTORICO_MEDIO', modalidades: ['AC', 'V'], etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
        doc({ codigo: 'CERTIFICADO_CONCLUSAO_EM', modalidades: ['AC', 'V'], etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
        doc({ codigo: 'DECLARACAO_PERTENCIMENTO_TERRITORIAL', modalidades: ['AC', 'V'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
        doc({ codigo: 'COMPROVANTE_RESIDENCIA', modalidades: ['AC', 'V'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS'] }),
        doc({ codigo: 'LAUDO_MEDICO_PCD', modalidades: ['V'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
        doc({ codigo: 'FOTO_3X4', modalidades: ['AC', 'V'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS'] }),
      ],
      // Em Marabá faz prova só para o curso de Marabá; idem Rondon. Capacidades realistas
      // baseadas no histórico do campus.
      cidades: [
        { cidadeCodigo: 'MARABA', cursoCodigos: ['MARABA-EDUCACAO-CAMPO-LIC'], capacidadeMaxima: 120 },
        { cidadeCodigo: 'RONDON', cursoCodigos: ['RONDON-EDUCACAO-CAMPO-LIC'], capacidadeMaxima: 80 },
      ],
      // No novo modelo, o edital separa três listas:
      //   - oferta.condicoes_aceitas: quais CondicaoAtendimentoEspecializado o edital aceita
      //   - oferta.deficiencias_aceitas: dentre as PcD (TipoDeficiencia), quais são reconhecidas
      //   - oferta.recursos_oferecidos: quais RecursoAcessibilidade o edital provê
      // A SolicitacaoAtendimentoEspecializado (workflow de candidato) é decisão de F3 —
      // não está modelada neste protótipo.
      atendimentoEspecializado: {
        oferta: {
          condicoes_aceitas: ['PCD', 'DEFICIT_ATENCAO', 'GESTANTE', 'LACTANTE'],
          deficiencias_aceitas: ['BAIXA_VISAO', 'DEFICIENCIA_FISICA', 'AUTISMO_ASPERGER_RETT'],
          recursos_oferecidos: [
            'SALA_FACIL_ACESSO',
            'MESA_SEM_BRACO',
            'APOIO_PERNAS_PES',
            'ACOMPANHANTE_LACTANTE',
            'PROVA_AMPLIADA',
            'TEMPO_ADICIONAL',
          ],
        },
      },
    },
  };
}

// =====================================================
// Demo 2: PS Convênios 2026 — Canaã dos Carajás
// =====================================================
function montarPsConveniosCanaa() {
  const tipo = tipoPorCodigo('PS_CONVENIOS');
  if (!tipo) return null;

  return {
    id: randomUUID(),
    status: 'rascunho',
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    passoAtual: 12,
    statusPorPasso: todosOsPassosCompletos([13]),
    edital: {
      tipo,
      identificacao: {
        numero: 5,
        ano: 2026,
        dataEdital: '2026-03-15',
        sigla: 'CEPS/UNIFESSPA',
        unidadeDonaCodigo: 'CEPS',
        nomeProcesso: 'Processo Seletivo Convênio Canaã dos Carajás 2026',
        anoIngresso: 2026,
        periodoIngresso: '1S',
      },
      vagas: {
        cursos: [
          { cursoCodigo: 'CANAA-ENG-MINAS-BACH', vagas: 50 },
          { cursoCodigo: 'CANAA-GEOLOGIA-BACH', vagas: 30 },
          { cursoCodigo: 'CANAA-SI-BACH', vagas: 40 },
        ],
      },
      distribuicaoModalidades: {
        modalidades: [
          'AC', 'V',
          'LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP',
          'LI_PPI', 'LI_Q', 'LI_PcD', 'LI_EP',
        ],
        concorrenciaDupla: true,
      },
      etapas: [
        etapa({
          ordem: 1,
          tipoEtapaCodigo: 'INSCRICAO_CANDIDATOS',
          janelaInicio: '2026-04-01',
          janelaFim: '2026-04-30',
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 2,
          tipoEtapaCodigo: 'HOMOLOGACAO_INSCRICOES',
          janelaInicio: '2026-05-02',
          janelaFim: '2026-05-10',
          recurso: { inicio: '2026-05-11', fim: '2026-05-13' },
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 3,
          tipoEtapaCodigo: 'PROVA_OBJETIVA',
          janelaInicio: '2026-05-20',
          recurso: { inicio: '2026-05-25', fim: '2026-05-27' },
          peso: 1,
          eliminatoria: true,
          notaMinima: 4.0,
        }),
        etapa({
          ordem: 4,
          tipoEtapaCodigo: 'REDACAO',
          janelaInicio: '2026-05-20',
          recurso: { inicio: '2026-05-25', fim: '2026-05-27' },
          peso: 1,
          eliminatoria: true,
          notaMinima: 4.0,
        }),
        etapa({
          ordem: 5,
          tipoEtapaCodigo: 'DIVULGACAO_BONIFICACAO',
          janelaInicio: '2026-06-10',
          recurso: { inicio: '2026-06-11', fim: '2026-06-13' },
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 6,
          tipoEtapaCodigo: 'DIVULGACAO_RESULTADO_PARCIAL',
          janelaInicio: '2026-06-15',
          janelaFim: '2026-06-20',
          recurso: { inicio: '2026-06-21', fim: '2026-06-23' },
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 7,
          tipoEtapaCodigo: 'DIVULGACAO_RESULTADO_FINAL',
          janelaInicio: '2026-06-30',
          pertenceCalculo: false,
        }),
      ],
      formula: {
        agregacao: 'MEDIA_SIMPLES',
        precisao: 'ARREDONDAR_PARA_CIMA_2_CASAS_SE_3A_GTE_5',
      },
      bonus: {
        habilitado: true,
        tipo: 'ADITIVO',
        valor: 0.2,
        modalidades_aplicaveis: ['AC'],
        criterio_elegibilidade: 'RESIDENCIA_MUNICIPIO_CONVENIO',
      },
      desempate: [
        { codigo: 'IDOSO_60', ordem: 1 },
        { codigo: 'MAIOR_NOTA_REDACAO', ordem: 2 },
        { codigo: 'MAIOR_NOTA_OBJETIVA', ordem: 3 },
        { codigo: 'MAIOR_IDADE', ordem: 4 },
      ],
      eliminacao: {
        notasMinimas: { PROVA_OBJETIVA: 4.0, REDACAO: 4.0 },
        clausulas: [
          'FALTA_PROVA',
          'ATRASO',
          'FRAUDE',
          'USO_ELETRONICOS',
          'COMUNICACAO_EXTERNA',
          'NOTA_REDACAO_ZERO',
          'NOTA_REDACAO_BRANCA',
          'PLAGIO',
          'CONDUTA_INADEQUADA',
        ],
      },
      documentos: gerarDocumentosPsConvenios(),
      // Em Canaã, prova vale para os 3 cursos do edital.
      cidades: [
        {
          cidadeCodigo: 'CANAA',
          cursoCodigos: ['CANAA-ENG-MINAS-BACH', 'CANAA-GEOLOGIA-BACH', 'CANAA-SI-BACH'],
          capacidadeMaxima: 400,
        },
      ],
      atendimentoEspecializado: {
        oferta: {
          condicoes_aceitas: ['PCD', 'DISLEXIA', 'DEFICIT_ATENCAO', 'DISCALCULIA', 'GESTANTE', 'LACTANTE', 'IDOSO'],
          deficiencias_aceitas: [
            'BAIXA_VISAO',
            'CEGUEIRA',
            'SURDEZ',
            'DEFICIENCIA_FISICA',
            'DEFICIENCIA_AUDITIVA',
            'AUTISMO_ASPERGER_RETT',
          ],
          recursos_oferecidos: [
            'SALA_FACIL_ACESSO',
            'MESA_SEM_BRACO',
            'APOIO_PERNAS_PES',
            'ACOMPANHANTE_LACTANTE',
            'PROVA_AMPLIADA',
            'PROVA_BRAILE',
            'TRADUTOR_INTERPRETE_LIBRAS',
            'AUXILIO_LEITURA',
            'TEMPO_ADICIONAL',
          ],
        },
      },
    },
  };
}

function gerarDocumentosPsConvenios() {
  const todas = ['AC', 'V', 'LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP', 'LI_PPI', 'LI_Q', 'LI_PcD', 'LI_EP'];
  // PS Convênios: docs comuns exigidos na inscrição e na homologação; cota-específicos
  // exigidos na inscrição e (no caso de PcD/PPI/Q) reforçados na homologação para verificação.
  return [
    doc({ codigo: 'RG', modalidades: todas, etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'CPF', modalidades: todas, etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'HISTORICO_MEDIO', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'CERTIFICADO_CONCLUSAO_EM', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'COMPROVANTE_RESIDENCIA', modalidades: todas, etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'DIVULGACAO_BONIFICACAO'] }),
    doc({ codigo: 'FOTO_3X4', modalidades: todas, etapasObrigatorias: ['INSCRICAO_CANDIDATOS'] }),

    doc({ codigo: 'LAUDO_MEDICO_PCD', modalidades: ['V', 'LB_PcD', 'LI_PcD'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'TERMO_AUTODECLARACAO_PCD', modalidades: ['V', 'LB_PcD', 'LI_PcD'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS'] }),

    doc({ codigo: 'DECLARACAO_AUTORRECONHECIMENTO', modalidades: ['LB_PPI', 'LI_PPI'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS'] }),
    doc({ codigo: 'DECLARACAO_QUILOMBOLA', modalidades: ['LB_Q', 'LI_Q'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS'] }),
    doc({ codigo: 'COMPROVANTE_RENDA', modalidades: ['LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP'], etapasObrigatorias: ['INSCRICAO_CANDIDATOS', 'HOMOLOGACAO_INSCRICOES'] }),
  ];
}

// =====================================================
// Demo 3: SiSU 2026 — Edital nº 26/2025-CEPS (Anexo I real, 1.345 vagas / 40 cursos / 5 campi)
// Fonte: notícia "Unifesspa oferta 1.345 vagas em cursos de graduação por meio do SiSU 2026"
// publicada em 23/12/2025 — quadro de vagas extraído do PDF oficial.
// =====================================================
// Referências para entradas da configuração `cursos`. Mantém só (cursoCodigo, vagas)
// — nome/grau/campus/turno vêm da configuração, denormalizados pelo snapshot.
const CURSOS_SISU_2026 = [
  // Marabá (27 cursos / 890 vagas)
  { cursoCodigo: 'MARABA-FISICA-LIC', vagas: 40 },
  { cursoCodigo: 'MARABA-MATEMATICA-LIC', vagas: 40 },
  { cursoCodigo: 'MARABA-CIENCIAS-NATURAIS-LIC', vagas: 30 },
  { cursoCodigo: 'MARABA-QUIMICA-LIC', vagas: 40 },
  { cursoCodigo: 'MARABA-CIENCIAS-SOCIAIS-BACH', vagas: 25 },
  { cursoCodigo: 'MARABA-CIENCIAS-SOCIAIS-LIC', vagas: 25 },
  { cursoCodigo: 'MARABA-GEOGRAFIA-BACH', vagas: 40 },
  { cursoCodigo: 'MARABA-HISTORIA-LIC', vagas: 40 },
  { cursoCodigo: 'MARABA-PEDAGOGIA-LIC', vagas: 40 },
  { cursoCodigo: 'MARABA-DIREITO-BACH', vagas: 40 },
  { cursoCodigo: 'MARABA-CIENCIAS-ECONOMICAS-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-AGRONOMIA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-CIENCIAS-BIOLOGICAS-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-SAUDE-COLETIVA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-PSICOLOGIA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-SI-BACH', vagas: 40 },
  { cursoCodigo: 'MARABA-GEOLOGIA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-MATERIAIS-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-MINAS-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-COMPUTACAO-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-ELETRICA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-QUIMICA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-MECANICA-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-ENG-CIVIL-BACH', vagas: 30 },
  { cursoCodigo: 'MARABA-LETRAS-PORTUGUES-LIC', vagas: 40 },
  { cursoCodigo: 'MARABA-ARTES-VISUAIS-LIC', vagas: 30 },
  { cursoCodigo: 'MARABA-LETRAS-INGLES-LIC', vagas: 30 },
  // Rondon do Pará (3 cursos / 120 vagas)
  { cursoCodigo: 'RONDON-ADMINISTRACAO-BACH', vagas: 40 },
  { cursoCodigo: 'RONDON-CIENCIAS-CONTABEIS-BACH', vagas: 40 },
  { cursoCodigo: 'RONDON-JORNALISMO-BACH', vagas: 40 },
  // São Félix do Xingu (3 cursos / 90 vagas)
  { cursoCodigo: 'SAO_FELIX-LETRAS-PORTUGUES-LIC', vagas: 30 },
  { cursoCodigo: 'SAO_FELIX-CIENCIAS-BIOLOGICAS-LIC', vagas: 30 },
  { cursoCodigo: 'SAO_FELIX-ENG-FLORESTAL-BACH', vagas: 30 },
  // Santana do Araguaia (3 cursos / 100 vagas)
  { cursoCodigo: 'SANTANA-MATEMATICA-LIC', vagas: 40 },
  { cursoCodigo: 'SANTANA-ENG-CIVIL-BACH', vagas: 30 },
  { cursoCodigo: 'SANTANA-ARQUITETURA-BACH', vagas: 30 },
  // Xinguara (4 cursos / 145 vagas)
  { cursoCodigo: 'XINGUARA-HISTORIA-LIC', vagas: 40 },
  { cursoCodigo: 'XINGUARA-GEOGRAFIA-LIC', vagas: 40 },
  { cursoCodigo: 'XINGUARA-ZOOTECNIA-BACH', vagas: 35 },
  { cursoCodigo: 'XINGUARA-MED-VETERINARIA-BACH', vagas: 30 },
];

function gerarDocumentosSisu2026() {
  // SiSU: a inscrição é feita no portal do MEC; a habilitação ao vínculo institucional
  // (CRCA) consome todos os documentos na etapa HOMOLOGACAO_INSCRICOES.
  const todas = ['AC', 'V', 'LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP', 'LI_PPI', 'LI_Q', 'LI_PcD', 'LI_EP'];
  return [
    doc({ codigo: 'RG', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'CPF', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'HISTORICO_MEDIO', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'CERTIFICADO_CONCLUSAO_EM', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'FOTO_3X4', modalidades: todas, etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),

    doc({ codigo: 'LAUDO_MEDICO_PCD', modalidades: ['V', 'LB_PcD', 'LI_PcD'], etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'DECLARACAO_AUTORRECONHECIMENTO', modalidades: ['LB_PPI', 'LI_PPI'], etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'DECLARACAO_QUILOMBOLA', modalidades: ['LB_Q', 'LI_Q'], etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
    doc({ codigo: 'COMPROVANTE_RENDA', modalidades: ['LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP'], etapasObrigatorias: ['HOMOLOGACAO_INSCRICOES'] }),
  ];
}

function montarSisu2026() {
  const tipo = tipoPorCodigo('SISU');
  if (!tipo) return null;

  return {
    id: randomUUID(),
    status: 'rascunho',
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    passoAtual: 13,
    statusPorPasso: todosOsPassosCompletos([13]),
    edital: {
      tipo,
      identificacao: {
        numero: 26,
        ano: 2025,
        dataEdital: '2025-12-23',
        sigla: 'CEPS/UNIFESSPA',
        unidadeDonaCodigo: 'CEPS',
        nomeProcesso: 'Sistema de Seleção Unificada — SiSU 2026',
        anoIngresso: 2026,
        periodoIngresso: '1S',
      },
      vagas: { cursos: CURSOS_SISU_2026 },
      distribuicaoModalidades: {
        modalidades: ['AC', 'V', 'LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP', 'LI_PPI', 'LI_Q', 'LI_PcD', 'LI_EP'],
        concorrenciaDupla: true,
        percentuaisIbgeCodigo: 'PARA_2022',
        estrategiaBalanceamentoCodigo: 'REDUZIR_AC',
        cascataRemanejamentoCodigo: 'PORTARIA_MEC_704_2025',
      },
      etapas: [
        etapa({
          ordem: 1,
          tipoEtapaCodigo: 'INSCRICAO_CANDIDATOS',
          nomeCustomizado: 'Inscrição no portal SiSU/MEC',
          janelaInicio: '2026-01-20',
          janelaFim: '2026-01-24',
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 2,
          tipoEtapaCodigo: 'IMPORTACAO_NOTAS_ENEM',
          nomeCustomizado: 'Importação de notas — ENEM 2023/2024/2025 (melhor média)',
          janelaInicio: '2026-01-30',
          janelaFim: '2026-01-31',
        }),
        etapa({
          ordem: 3,
          tipoEtapaCodigo: 'DIVULGACAO_RESULTADO_PARCIAL',
          nomeCustomizado: 'Chamada regular — resultado SiSU',
          janelaInicio: '2026-02-04',
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 4,
          tipoEtapaCodigo: 'HOMOLOGACAO_INSCRICOES',
          nomeCustomizado: 'Habilitação ao vínculo institucional (CRCA)',
          janelaInicio: '2026-02-09',
          janelaFim: '2026-02-13',
          recurso: { inicio: '2026-02-16', fim: '2026-02-18' },
          pertenceCalculo: false,
        }),
        etapa({
          ordem: 5,
          tipoEtapaCodigo: 'DIVULGACAO_RESULTADO_FINAL',
          nomeCustomizado: 'Resultado final + lista de espera',
          janelaInicio: '2026-02-25',
          pertenceCalculo: false,
        }),
      ],
      formula: {
        agregacao: 'MEDIA_PONDERADA_ENEM',
        fator: null,
        precisao: 'ARREDONDAR_PARA_CIMA_2_CASAS_SE_3A_GTE_5',
      },
      bonus: null,
      desempate: [
        { codigo: 'IDOSO_60', ordem: 1 },
        { codigo: 'MAIOR_NOTA_REDACAO', ordem: 2 },
        { codigo: 'MAIOR_IDADE', ordem: 3 },
      ],
      eliminacao: {
        notasMinimas: {},
        clausulas: ['NOTA_REDACAO_ZERO', 'NOTA_REDACAO_BRANCA'],
      },
      documentos: gerarDocumentosSisu2026(),
      // SiSU não tem prova presencial (classifica pela nota do ENEM), então o candidato
      // não escolhe cidade na inscrição — habilitação é documental no CRCA dos 5 campi.
      cidades: [],
      atendimentoEspecializado: {
        oferta: { condicoes_aceitas: [], deficiencias_aceitas: [], recursos_oferecidos: [] },
      },
    },
  };
}

// =====================================================
// Loaders
// =====================================================
export function loadDemoEditais() {
  const rascunhos = new Collection(Keys.EDITAIS_RASCUNHOS);
  const demos = [montarPseEducacaoCampo(), montarPsConveniosCanaa(), montarSisu2026()].filter(Boolean);
  for (const demo of demos) {
    rascunhos.upsert(demo);
  }
  return demos.length;
}

export async function loadDemoModelos() {
  const { buildSnapshot } = await import('./snapshot.js');
  const modelosCol = new Collection(Keys.MODELOS);

  const fontes = [
    { nome: 'PSE Educação do Campo — modelo padrão', state: montarPseEducacaoCampo() },
    { nome: 'PS Convênios — modelo padrão', state: montarPsConveniosCanaa() },
    { nome: 'SiSU — modelo padrão (baseado no Edital 26/2025)', state: montarSisu2026() },
  ].filter((m) => m.state);

  for (const { nome, state } of fontes) {
    const snapshot = buildSnapshot(state);
    // Sanitiza: limpa identificação, datas das etapas, vagas
    const sanitized = {
      ...snapshot,
      identificacao: { sigla: snapshot.identificacao?.sigla || 'CEPS/UNIFESSPA' },
      vagas: [],
      etapas: (snapshot.etapas || []).map((e) => ({
        ...e,
        janela: { inicio: null, fim: null },
        recurso: e.recurso ? { inicio: null, fim: null } : null,
      })),
      cidades: snapshot.cidades || [],
    };
    delete sanitized.edital_uuid;

    modelosCol.upsert({
      nome,
      tipo_edital_codigo: snapshot.tipo?.codigo,
      snapshot: sanitized,
      ativo: true,
    });
  }

  return fontes.length;
}
