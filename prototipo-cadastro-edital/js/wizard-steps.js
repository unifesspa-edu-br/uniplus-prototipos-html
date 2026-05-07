// wizard-steps.js — definição dos 12 passos do wizard.
// Cada passo é implementado em js/steps/passo-NN-*.js.

export const STEPS = [
  { id: 1, codigo: 'tipo', titulo: 'Tipo do edital', icone: '🏷️', modulo: './steps/passo-01-tipo.js' },
  { id: 2, codigo: 'identificacao', titulo: 'Identificação', icone: '📋', modulo: './steps/passo-02-identificacao.js' },
  { id: 3, codigo: 'vagas-modalidades', titulo: 'Vagas e modalidades', icone: '🎯', modulo: './steps/passo-03-vagas-modalidades.js' },
  { id: 4, codigo: 'etapas', titulo: 'Etapas', icone: '📝', modulo: './steps/passo-04-etapas.js' },
  { id: 5, codigo: 'formula', titulo: 'Fórmula e precisão', icone: '🧮', modulo: './steps/passo-05-formula.js' },
  { id: 6, codigo: 'bonus', titulo: 'Bônus (opcional)', icone: '⭐', modulo: './steps/passo-06-bonus.js' },
  { id: 7, codigo: 'desempate', titulo: 'Desempate', icone: '⚖️', modulo: './steps/passo-07-desempate.js' },
  { id: 8, codigo: 'eliminacao', titulo: 'Eliminação', icone: '🚫', modulo: './steps/passo-08-eliminacao.js' },
  { id: 9, codigo: 'documentos', titulo: 'Documentos por modalidade', icone: '📄', modulo: './steps/passo-09-documentos.js' },
  { id: 10, codigo: 'locais', titulo: 'Locais de prova', icone: '📍', modulo: './steps/passo-10-locais.js' },
  { id: 11, codigo: 'atendimento', titulo: 'Atendimento especial', icone: '♿', modulo: './steps/passo-11-atendimento.js' },
  { id: 12, codigo: 'revisao', titulo: 'Revisão e publicação', icone: '✅', modulo: './steps/passo-12-revisao.js' },
];

export function getStep(id) {
  return STEPS.find((s) => s.id === id) || null;
}
