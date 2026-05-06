// demo-editais.js — gera rascunhos completos pré-preenchidos para demonstração.
// Carregado após os seeds dos catálogos (precisa dos ids para resolver as referências).

import { Collection, Keys } from './storage.js';

function tipoEditalIdPorCodigo(codigo) {
  const t = new Collection(Keys.TIPOS_EDITAL).byCodigo(codigo);
  return t ? { tipoEditalId: t.id, codigo: t.codigo, nome: t.nome } : null;
}

function todosOsPassosCompletos(quaisIncompletos = []) {
  const status = {};
  for (let i = 1; i <= 13; i++) {
    status[i] = quaisIncompletos.includes(i) ? 'in-progress' : 'completed';
  }
  return status;
}

function nowIso() {
  return new Date().toISOString();
}

// =====================================================
// Demo 1: PSE Educação do Campo 2026 — Marabá
// =====================================================
function montarPseEducacaoCampo() {
  const tipo = tipoEditalIdPorCodigo('PSE_EC');
  if (!tipo) return null;

  return {
    id: crypto.randomUUID(),
    status: 'rascunho',
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    passoAtual: 13,
    statusPorPasso: todosOsPassosCompletos([13]),
    edital: {
      tipo,
      identificacao: {
        numero: 3,
        ano: 2026,
        dataEdital: '2026-04-01',
        sigla: 'CEPS/UNIFESSPA',
        nomeProcesso: 'Processo Seletivo Especial — Licenciatura em Educação do Campo 2026',
        anoIngresso: 2026,
        periodoIngresso: '2S',
      },
      cronograma: {
        inscricao: { inicio: '2026-05-01', fim: '2026-05-31' },
        homologacao: { inicio: '2026-06-01', fim: '2026-06-07' },
        recursoHomologacao: { inicio: '2026-06-08', fim: '2026-06-10' },
        prova: { inicio: '2026-06-15', fim: '2026-06-15' },
        classificacao: { inicio: '2026-07-15', fim: '2026-07-20' },
        recursoClassificacao: { inicio: '2026-07-21', fim: '2026-07-23' },
      },
      vagasModalidades: {
        cursos: [
          { curso: 'Licenciatura em Educação do Campo', campus: 'Marabá', turno: 'Integral', vagas: 30 },
          { curso: 'Licenciatura em Educação do Campo', campus: 'Rondon do Pará', turno: 'Integral', vagas: 25 },
        ],
        modalidades: ['AC', 'V'],
        concorrenciaDupla: false,
        cascata: [],
      },
      etapas: [
        {
          tipoEtapaCodigo: 'REDACAO',
          nomeCustomizado: '',
          peso: 1,
          ordem: 1,
          pertenceCalculo: true,
          eliminatoria: true,
          notaMinima: 4.0,
          dataAplicacao: '2026-06-15',
          janelaRecursoInicio: '2026-06-22',
          janelaRecursoFim: '2026-06-24',
        },
        {
          tipoEtapaCodigo: 'ENTREVISTA',
          nomeCustomizado: '',
          peso: 2,
          ordem: 2,
          pertenceCalculo: true,
          eliminatoria: false,
          notaMinima: null,
          dataAplicacao: '2026-06-29',
          janelaRecursoInicio: null,
          janelaRecursoFim: null,
        },
        {
          tipoEtapaCodigo: 'ANALISE_HISTORICO',
          nomeCustomizado: '',
          peso: 1,
          ordem: 3,
          pertenceCalculo: true,
          eliminatoria: false,
          notaMinima: null,
          dataAplicacao: null,
          janelaRecursoInicio: '2026-07-06',
          janelaRecursoFim: '2026-07-08',
        },
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
      documentos: [
        { tipoDocumentoCodigo: 'RG', modalidade: 'AC', obrigatorio: true },
        { tipoDocumentoCodigo: 'RG', modalidade: 'V', obrigatorio: true },
        { tipoDocumentoCodigo: 'CPF', modalidade: 'AC', obrigatorio: true },
        { tipoDocumentoCodigo: 'CPF', modalidade: 'V', obrigatorio: true },
        { tipoDocumentoCodigo: 'HISTORICO_MEDIO', modalidade: 'AC', obrigatorio: true },
        { tipoDocumentoCodigo: 'HISTORICO_MEDIO', modalidade: 'V', obrigatorio: true },
        { tipoDocumentoCodigo: 'CERTIFICADO_CONCLUSAO_EM', modalidade: 'AC', obrigatorio: true },
        { tipoDocumentoCodigo: 'CERTIFICADO_CONCLUSAO_EM', modalidade: 'V', obrigatorio: true },
        { tipoDocumentoCodigo: 'DECLARACAO_PERTENCIMENTO_TERRITORIAL', modalidade: 'AC', obrigatorio: true },
        { tipoDocumentoCodigo: 'DECLARACAO_PERTENCIMENTO_TERRITORIAL', modalidade: 'V', obrigatorio: true },
        { tipoDocumentoCodigo: 'COMPROVANTE_PROFESSOR_RURAL', modalidade: 'AC', obrigatorio: false },
        { tipoDocumentoCodigo: 'COMPROVANTE_PROFESSOR_RURAL', modalidade: 'V', obrigatorio: false },
        { tipoDocumentoCodigo: 'LAUDO_MEDICO_PCD', modalidade: 'V', obrigatorio: true },
        { tipoDocumentoCodigo: 'COMPROVANTE_RESIDENCIA', modalidade: 'AC', obrigatorio: true },
        { tipoDocumentoCodigo: 'COMPROVANTE_RESIDENCIA', modalidade: 'V', obrigatorio: true },
      ],
      locais: [
        {
          localProvaCodigo: 'MARABA',
          capacidade: 200,
          sessoes: [
            { dataInicio: '2026-06-15', dataFim: '2026-06-15', fechamentoPortoesAntesMin: 30 },
          ],
        },
        {
          localProvaCodigo: 'RONDON',
          capacidade: 150,
          sessoes: [
            { dataInicio: '2026-06-15', dataFim: '2026-06-15', fechamentoPortoesAntesMin: 30 },
          ],
        },
      ],
      atendimento: [
        {
          necessidadeEspecialCodigo: 'GRAVIDEZ',
          recursos_disponibilizados: ['SALA_TERREA', 'MOBILIARIO_ADEQUADO'],
        },
        {
          necessidadeEspecialCodigo: 'AMAMENTACAO',
          recursos_disponibilizados: ['BERCARIO', 'TEMPO_ADICIONAL'],
        },
        {
          necessidadeEspecialCodigo: 'CADEIRANTE',
          recursos_disponibilizados: ['SALA_TERREA', 'MOBILIARIO_ADAPTADO', 'BANHEIRO_ACESSIVEL'],
        },
        {
          necessidadeEspecialCodigo: 'BAIXA_VISAO',
          recursos_disponibilizados: ['PROVA_AMPLIADA', 'ILUMINACAO_REFORCADA', 'TEMPO_ADICIONAL'],
        },
        {
          necessidadeEspecialCodigo: 'MOBILIDADE_REDUZIDA',
          recursos_disponibilizados: ['SALA_TERREA', 'MOBILIARIO_ADEQUADO'],
        },
      ],
    },
  };
}

// =====================================================
// Demo 2: PS Convênios 2026 — Canaã dos Carajás
// =====================================================
function montarPsConveniosCanaa() {
  const tipo = tipoEditalIdPorCodigo('PS_CONVENIOS');
  if (!tipo) return null;

  return {
    id: crypto.randomUUID(),
    status: 'rascunho',
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    passoAtual: 13,
    statusPorPasso: todosOsPassosCompletos([13]),
    edital: {
      tipo,
      identificacao: {
        numero: 5,
        ano: 2026,
        dataEdital: '2026-03-15',
        sigla: 'CEPS/UNIFESSPA',
        nomeProcesso: 'Processo Seletivo Convênio Canaã dos Carajás 2026',
        anoIngresso: 2026,
        periodoIngresso: '1S',
      },
      cronograma: {
        inscricao: { inicio: '2026-04-01', fim: '2026-04-30' },
        cartao: { inicio: '2026-05-15', fim: '2026-05-20' },
        prova: { inicio: '2026-05-20', fim: '2026-05-20' },
        homologacao: { inicio: '2026-04-25', fim: '2026-05-10' },
        recursoHomologacao: { inicio: '2026-05-11', fim: '2026-05-13' },
        classificacao: { inicio: '2026-06-15', fim: '2026-06-20' },
        recursoClassificacao: { inicio: '2026-06-21', fim: '2026-06-23' },
        habilitacao: { inicio: '2026-07-01', fim: '2026-07-15' },
        confirmacaoInteresse: { inicio: '2026-07-16', fim: '2026-07-31' },
      },
      vagasModalidades: {
        cursos: [
          { curso: 'Engenharia de Minas e Meio Ambiente', campus: 'Canaã dos Carajás', turno: 'Integral', vagas: 50 },
          { curso: 'Geologia', campus: 'Canaã dos Carajás', turno: 'Integral', vagas: 30 },
          { curso: 'Sistemas de Informação', campus: 'Canaã dos Carajás', turno: 'Noturno', vagas: 40 },
        ],
        modalidades: [
          'AC', 'V',
          'LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP',
          'LI_PPI', 'LI_Q', 'LI_PcD', 'LI_EP',
        ],
        concorrenciaDupla: true,
        cascata: [],
      },
      etapas: [
        {
          tipoEtapaCodigo: 'PROVA_OBJETIVA',
          nomeCustomizado: '',
          peso: 1,
          ordem: 1,
          pertenceCalculo: true,
          eliminatoria: true,
          notaMinima: 4.0,
          dataAplicacao: '2026-05-20',
          janelaRecursoInicio: '2026-05-25',
          janelaRecursoFim: '2026-05-27',
        },
        {
          tipoEtapaCodigo: 'REDACAO',
          nomeCustomizado: '',
          peso: 1,
          ordem: 2,
          pertenceCalculo: true,
          eliminatoria: true,
          notaMinima: 4.0,
          dataAplicacao: '2026-05-20',
          janelaRecursoInicio: '2026-05-25',
          janelaRecursoFim: '2026-05-27',
        },
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
      locais: [
        {
          localProvaCodigo: 'CANAA',
          capacidade: 400,
          sessoes: [
            { dataInicio: '2026-05-20', dataFim: '2026-05-20', fechamentoPortoesAntesMin: 30 },
          ],
        },
      ],
      atendimento: [
        {
          necessidadeEspecialCodigo: 'GRAVIDEZ',
          recursos_disponibilizados: ['SALA_TERREA', 'MOBILIARIO_ADEQUADO'],
        },
        {
          necessidadeEspecialCodigo: 'AMAMENTACAO',
          recursos_disponibilizados: ['BERCARIO', 'TEMPO_ADICIONAL'],
        },
        {
          necessidadeEspecialCodigo: 'CADEIRANTE',
          recursos_disponibilizados: ['SALA_TERREA', 'MOBILIARIO_ADAPTADO', 'BANHEIRO_ACESSIVEL'],
        },
        {
          necessidadeEspecialCodigo: 'BAIXA_VISAO',
          recursos_disponibilizados: ['PROVA_AMPLIADA', 'ILUMINACAO_REFORCADA', 'TEMPO_ADICIONAL'],
        },
        {
          necessidadeEspecialCodigo: 'CEGUEIRA',
          recursos_disponibilizados: ['LEDOR', 'PROVA_BRAILE', 'TEMPO_ADICIONAL'],
        },
        {
          necessidadeEspecialCodigo: 'SURDEZ',
          recursos_disponibilizados: ['INTERPRETE_LIBRAS'],
        },
        {
          necessidadeEspecialCodigo: 'MOBILIDADE_REDUZIDA',
          recursos_disponibilizados: ['SALA_TERREA', 'MOBILIARIO_ADEQUADO'],
        },
      ],
    },
  };
}

function gerarDocumentosPsConvenios() {
  const todasModalidades = ['AC', 'V', 'LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP', 'LI_PPI', 'LI_Q', 'LI_PcD', 'LI_EP'];
  const docs = [];

  // Documentos básicos para todas as modalidades
  for (const mod of todasModalidades) {
    docs.push({ tipoDocumentoCodigo: 'RG', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'CPF', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'HISTORICO_MEDIO', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'CERTIFICADO_CONCLUSAO_EM', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'COMPROVANTE_RESIDENCIA', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'FOTO_3X4', modalidade: mod, obrigatorio: true });
  }

  // PcD: laudo médico para V e modalidades PcD
  for (const mod of ['V', 'LB_PcD', 'LI_PcD']) {
    docs.push({ tipoDocumentoCodigo: 'LAUDO_MEDICO_PCD', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'TERMO_AUTODECLARACAO_PCD', modalidade: mod, obrigatorio: true });
  }

  // PPI: autodeclaração para LB_PPI e LI_PPI
  for (const mod of ['LB_PPI', 'LI_PPI']) {
    docs.push({ tipoDocumentoCodigo: 'DECLARACAO_AUTORRECONHECIMENTO', modalidade: mod, obrigatorio: true });
  }

  // Quilombola: declaração com lideranças para LB_Q e LI_Q
  for (const mod of ['LB_Q', 'LI_Q']) {
    docs.push({ tipoDocumentoCodigo: 'DECLARACAO_QUILOMBOLA', modalidade: mod, obrigatorio: true });
  }

  // Renda: comprovante para todas LB_*
  for (const mod of ['LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP']) {
    docs.push({ tipoDocumentoCodigo: 'COMPROVANTE_RENDA', modalidade: mod, obrigatorio: true });
  }

  return docs;
}

// =====================================================
// Loader — rascunhos
// =====================================================
export function loadDemoEditais() {
  const rascunhos = new Collection(Keys.EDITAIS_RASCUNHO);
  const demos = [montarPseEducacaoCampo(), montarPsConveniosCanaa()].filter(Boolean);
  for (const demo of demos) {
    rascunhos.upsert(demo);
  }
  return demos.length;
}

// =====================================================
// Loader — modelos
// =====================================================
export async function loadDemoModelos() {
  const { buildSnapshot } = await import('./snapshot.js');
  const modelosCol = new Collection(Keys.MODELOS);

  const fontes = [
    { nome: 'PSE Educação do Campo — modelo padrão', state: montarPseEducacaoCampo() },
    { nome: 'PS Convênios — modelo padrão', state: montarPsConveniosCanaa() },
  ].filter((m) => m.state);

  for (const { nome, state } of fontes) {
    const snapshot = buildSnapshot(state);
    // Sanitiza: limpa identificação (exceto sigla), datas, vagas, datas das etapas
    const sanitized = {
      ...snapshot,
      identificacao: { sigla: snapshot.identificacao?.sigla || 'CEPS/UNIFESSPA' },
      cronograma: {},
      vagas: [],
      etapas: (snapshot.etapas || []).map((e) => ({
        ...e,
        data_aplicacao: null,
        janela_recurso: { inicio: null, fim: null },
      })),
      locais: (snapshot.locais || []).map((l) => ({ ...l, sessoes: [] })),
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
