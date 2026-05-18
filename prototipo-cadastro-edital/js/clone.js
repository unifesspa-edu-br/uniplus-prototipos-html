// clone.js — converte snapshot (denormalizado) em estado de wizard (normalizado).
// Usado para clonar de modelo ou de edital publicado.

import { Collection, Keys, randomUUID } from './storage.js';

/**
 * Reconstrói o `state.edital` (formato do wizard) a partir de um snapshot publicado.
 * Configurações são re-resolvidos pelos seus códigos (caso tenham sido renomeados, mantém o código).
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
    id: randomUUID(),
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    passoAtual: 1,
    statusPorPasso: {},
    edital: {
      tipo: tipoLocal
        ? { codigo: tipoLocal.codigo, nome: tipoLocal.nome }
        : null,
      identificacao: options.manterIdentificacao
        ? { ...snapshot.identificacao }
        : { sigla: snapshot.identificacao?.sigla || 'CEPS/UNIFESSPA' },
      vagas: {
        // Round-trip via `codigo` da entrada Curso. Sem manterVagas, descarta tudo.
        cursos: options.manterVagas
          ? (snapshot.vagas || [])
              .filter((v) => v.codigo)
              .map((v) => ({ cursoCodigo: v.codigo, vagas: v.vagas }))
          : [],
      },
      distribuicaoModalidades: {
        modalidades: (snapshot.modalidades || []).map((m) => m.codigo),
        concorrenciaDupla: snapshot.concorrencia_dupla || false,
        percentuaisIbgeCodigo: snapshot.percentuais_ibge?.codigo || null,
        estrategiaBalanceamentoCodigo: snapshot.estrategia_balanceamento?.codigo || null,
        cascataRemanejamentoCodigo: snapshot.cascata_remanejamento?.codigo || null,
      },
      etapas: (snapshot.etapas || []).map((e) => ({
        tipoEtapaCodigo: e.tipo?.codigo || null,
        nomeCustomizado: e.nome_customizado,
        ordem: e.ordem,
        // Datas só preservadas se manterCronograma === true
        janelaInicio: options.manterCronograma ? e.janela?.inicio || null : null,
        janelaFim: options.manterCronograma ? e.janela?.fim || null : null,
        recurso:
          options.manterCronograma && e.recurso
            ? { inicio: e.recurso.inicio, fim: e.recurso.fim }
            : null,
        // Campos avaliativos
        peso: e.peso,
        pertenceCalculo: e.pertence_calculo,
        eliminatoria: e.eliminatoria,
        notaMinima: e.nota_minima,
      })),
      formula: { ...snapshot.formula },
      bonus: snapshot.bonus ? { ...snapshot.bonus } : null,
      desempate: (snapshot.desempate || []).map((d) => ({
        codigo: d.criterio?.codigo,
        ordem: d.ordem,
        etapaReferencia: d.etapa_referencia,
      })),
      eliminacao: { ...snapshot.eliminacao },
      documentos: (snapshot.documentos || []).map((d) => ({
        tipoDocumentoCodigo: d.documento?.codigo,
        incluido: true,
        modalidades: [...(d.modalidades || [])],
        etapasObrigatorias: d.todas_etapas
          ? []
          : (d.etapas_obrigatorias || [])
              .map((e) => e.tipo_etapa_codigo)
              .filter(Boolean),
      })),
      cidades: (snapshot.cidades || [])
        .filter((c) => c.cidade?.codigo)
        .map((c) => ({
          cidadeCodigo: c.cidade.codigo,
          cursoCodigos: (c.cursos || []).map((curso) => curso.codigo).filter(Boolean),
          capacidadeMaxima: c.capacidade_maxima ?? null,
        })),
      atendimento: (snapshot.atendimento_especial || []).map((a) => ({
        necessidadeEspecialCodigo: a.necessidade?.codigo,
        recursosDisponibilizados: [...(a.recursos_disponibilizados || [])],
      })),
    },
  };

  // Se tipo selecionado, marca passo 1 como completo
  if (state.edital.tipo) {
    state.statusPorPasso[1] = 'concluido';
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
  const publicados = new Collection(Keys.EDITAIS_PUBLICADOS);
  const ed = publicados.byId(publicadoId);
  if (!ed) throw new Error('Edital publicado não encontrado.');

  return snapshotToWizardState(ed.snapshot, {
    manterIdentificacao: false,
    manterCronograma: false,
    manterVagas: true, // mantém vagas como referência
  });
}
