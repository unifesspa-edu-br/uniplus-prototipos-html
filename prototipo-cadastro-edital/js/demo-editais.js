// demo-editais.js — gera rascunhos completos pré-preenchidos para demonstração.
// Carregado após os seeds dos catálogos (precisa dos ids para resolver as referências).
//
// Modelo de etapa unificado (toda janela do edital é uma etapa):
//   - administrativa (inscrição, homologação, divulgações)
//   - avaliativa (provas, redação, banca, entrevista)
//   - importação automática (notas ENEM)

import { Collection, Keys } from './storage.js';

function tipoEditalIdPorCodigo(codigo) {
  const t = new Collection(Keys.TIPOS_EDITAL).byCodigo(codigo);
  return t ? { tipoEditalId: t.id, codigo: t.codigo, nome: t.nome } : null;
}

function todosOsPassosCompletos(quaisIncompletos = []) {
  const status = {};
  for (let i = 1; i <= 12; i++) {
    status[i] = quaisIncompletos.includes(i) ? 'in-progress' : 'completed';
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
    passoAtual: 12,
    statusPorPasso: todosOsPassosCompletos([12]),
    edital: {
      tipo,
      identificacao: {
        numero: 3,
        ano: 2026,
        dataEdital: '2026-04-01',
        sigla: 'CEPS/UNIFESSPA',
        nomeProcesso:
          'Processo Seletivo Especial — Licenciatura em Educação do Campo 2026',
        anoIngresso: 2026,
        periodoIngresso: '2S',
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
    passoAtual: 12,
    statusPorPasso: todosOsPassosCompletos([12]),
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

  for (const mod of todasModalidades) {
    docs.push({ tipoDocumentoCodigo: 'RG', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'CPF', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'HISTORICO_MEDIO', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'CERTIFICADO_CONCLUSAO_EM', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'COMPROVANTE_RESIDENCIA', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'FOTO_3X4', modalidade: mod, obrigatorio: true });
  }

  for (const mod of ['V', 'LB_PcD', 'LI_PcD']) {
    docs.push({ tipoDocumentoCodigo: 'LAUDO_MEDICO_PCD', modalidade: mod, obrigatorio: true });
    docs.push({ tipoDocumentoCodigo: 'TERMO_AUTODECLARACAO_PCD', modalidade: mod, obrigatorio: true });
  }

  for (const mod of ['LB_PPI', 'LI_PPI']) {
    docs.push({ tipoDocumentoCodigo: 'DECLARACAO_AUTORRECONHECIMENTO', modalidade: mod, obrigatorio: true });
  }

  for (const mod of ['LB_Q', 'LI_Q']) {
    docs.push({ tipoDocumentoCodigo: 'DECLARACAO_QUILOMBOLA', modalidade: mod, obrigatorio: true });
  }

  for (const mod of ['LB_PPI', 'LB_Q', 'LB_PcD', 'LB_EP']) {
    docs.push({ tipoDocumentoCodigo: 'COMPROVANTE_RENDA', modalidade: mod, obrigatorio: true });
  }

  return docs;
}

// =====================================================
// Loaders
// =====================================================
export function loadDemoEditais() {
  const rascunhos = new Collection(Keys.EDITAIS_RASCUNHO);
  const demos = [montarPseEducacaoCampo(), montarPsConveniosCanaa()].filter(Boolean);
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
