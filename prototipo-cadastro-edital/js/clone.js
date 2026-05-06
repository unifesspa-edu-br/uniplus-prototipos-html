// clone.js — converte snapshot (denormalizado) em estado de wizard (normalizado).
// Usado para clonar de modelo ou de edital publicado.

import { Collection, Keys } from './storage.js';

/**
 * Reconstrói o `state.edital` (formato do wizard) a partir de um snapshot publicado.
 * Catálogos são re-resolvidos pelos seus códigos (caso tenham sido renomeados, mantém o código).
 *
 * @param {object} snapshot - snapshot do edital publicado ou do modelo
 * @param {object} options - { manterIdentificacao: bool, manterCronograma: bool, manterVagas: bool }
 */
export function snapshotToWizardState(snapshot, options = {}) {
  const tiposEdital = new Collection(Keys.TIPOS_EDITAL).list({ includeInactive: true });
  const tipoLocal = snapshot.tipo
    ? tiposEdital.find((t) => t.codigo === snapshot.tipo.codigo)
    : null;

  const state = {
    id: crypto.randomUUID(),
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    passoAtual: 1,
    statusPorPasso: {},
    edital: {
      tipo: tipoLocal
        ? {
            tipoEditalId: tipoLocal.id,
            codigo: tipoLocal.codigo,
            nome: tipoLocal.nome,
          }
        : null,
      identificacao: options.manterIdentificacao
        ? { ...snapshot.identificacao }
        : { sigla: snapshot.identificacao?.sigla || 'CEPS/UNIFESSPA' },
      cronograma: options.manterCronograma ? { ...snapshot.cronograma } : {},
      vagasModalidades: {
        cursos: options.manterVagas ? [...(snapshot.vagas || [])] : [],
        modalidades: (snapshot.modalidades || []).map((m) => m.codigo),
        concorrenciaDupla: snapshot.concorrencia_dupla || false,
        cascata: [...(snapshot.cascata_remanejamento || [])],
      },
      etapas: (snapshot.etapas || []).map((e) => ({
        tipoEtapaCodigo: e.tipo?.codigo || null,
        nomeCustomizado: e.nome_customizado,
        peso: e.peso,
        ordem: e.ordem,
        pertenceCalculo: e.pertence_calculo,
        eliminatoria: e.eliminatoria,
        notaMinima: e.nota_minima,
        dataAplicacao: options.manterCronograma ? e.data_aplicacao : null,
        janelaRecursoInicio: options.manterCronograma ? e.janela_recurso?.inicio : null,
        janelaRecursoFim: options.manterCronograma ? e.janela_recurso?.fim : null,
      })),
      formula: { ...snapshot.formula },
      bonus: snapshot.bonus ? { ...snapshot.bonus } : null,
      desempate: (snapshot.desempate || []).map((d) => ({
        codigo: d.criterio?.codigo,
        ordem: d.ordem,
        etapaRef: d.etapa_referencia,
      })),
      eliminacao: { ...snapshot.eliminacao },
      documentos: (snapshot.documentos_por_modalidade || []).map((d) => ({
        tipoDocumentoCodigo: d.documento?.codigo,
        modalidade: d.modalidade,
        obrigatorio: d.obrigatorio,
      })),
      locais: (snapshot.locais || []).map((l) => ({
        localProvaCodigo: l.local?.codigo,
        capacidade: l.capacidade_neste_edital,
        sessoes: options.manterCronograma ? [...(l.sessoes || [])] : [],
      })),
      atendimento: (snapshot.atendimento_especial || []).map((a) => ({
        necessidadeEspecialCodigo: a.necessidade?.codigo,
        recursos_disponibilizados: [...(a.recursos_disponibilizados || [])],
      })),
    },
  };

  // Se tipo selecionado, marca passo 1 como completo
  if (state.edital.tipo) {
    state.statusPorPasso[1] = 'completed';
  }

  return state;
}

/**
 * Clona a partir de um modelo (limpa datas/vagas/identificação).
 */
export function cloneFromModelo(modeloId) {
  const modelos = new Collection(Keys.MODELOS);
  const modelo = modelos.byId(modeloId);
  if (!modelo) throw new Error('Modelo não encontrado.');

  return snapshotToWizardState(modelo.snapshot, {
    manterIdentificacao: false,
    manterCronograma: false,
    manterVagas: false,
  });
}

/**
 * Clona a partir de um edital publicado (mantém tudo exceto identificação).
 */
export function cloneFromEditalPublicado(publicadoId) {
  const publicados = new Collection(Keys.EDITAIS_PUBLICADO);
  const ed = publicados.byId(publicadoId);
  if (!ed) throw new Error('Edital publicado não encontrado.');

  return snapshotToWizardState(ed.snapshot, {
    manterIdentificacao: false,
    manterCronograma: false,
    manterVagas: true, // mantém vagas como referência
  });
}
