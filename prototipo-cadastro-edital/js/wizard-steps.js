// wizard-steps.js — definição dos 13 passos do wizard.
// Cada passo será implementado em js/steps/passo-NN-*.js (Etapa 4).
// Aqui apenas declaramos a metadata (ordem, título, ícone, módulo).

export const STEPS = [
  { id: 1, codigo: 'tipo', titulo: 'Tipo do edital', icone: '🏷️', modulo: './steps/passo-01-tipo.js' },
  { id: 2, codigo: 'identificacao', titulo: 'Identificação', icone: '📋', modulo: './steps/passo-02-identificacao.js' },
  { id: 3, codigo: 'cronograma', titulo: 'Cronograma', icone: '📅', modulo: './steps/passo-03-cronograma.js' },
  { id: 4, codigo: 'vagas-modalidades', titulo: 'Vagas e modalidades', icone: '🎯', modulo: './steps/passo-04-vagas-modalidades.js' },
  { id: 5, codigo: 'etapas', titulo: 'Etapas', icone: '📝', modulo: './steps/passo-05-etapas.js' },
  { id: 6, codigo: 'formula', titulo: 'Fórmula e precisão', icone: '🧮', modulo: './steps/passo-06-formula.js' },
  { id: 7, codigo: 'bonus', titulo: 'Bônus (opcional)', icone: '⭐', modulo: './steps/passo-07-bonus.js' },
  { id: 8, codigo: 'desempate', titulo: 'Desempate', icone: '⚖️', modulo: './steps/passo-08-desempate.js' },
  { id: 9, codigo: 'eliminacao', titulo: 'Eliminação', icone: '🚫', modulo: './steps/passo-09-eliminacao.js' },
  { id: 10, codigo: 'documentos', titulo: 'Documentos por modalidade', icone: '📄', modulo: './steps/passo-10-documentos.js' },
  { id: 11, codigo: 'locais', titulo: 'Locais de prova', icone: '📍', modulo: './steps/passo-11-locais.js' },
  { id: 12, codigo: 'atendimento', titulo: 'Atendimento especial', icone: '♿', modulo: './steps/passo-12-atendimento.js' },
  { id: 13, codigo: 'revisao', titulo: 'Revisão e publicação', icone: '✅', modulo: './steps/passo-13-revisao.js' },
];

export function getStep(id) {
  return STEPS.find((s) => s.id === id) || null;
}
