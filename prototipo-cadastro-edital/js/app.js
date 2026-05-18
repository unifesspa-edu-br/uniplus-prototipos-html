// app.js — bootstrap do dashboard (index.html)

import { Storage, Collection, Keys } from './storage.js';
import { Toast } from './toast.js';

function updateStats() {
  const editaisRascunho = new Collection(Keys.EDITAIS_RASCUNHOS).count({
    includeInactive: true,
  });
  const editaisPublicado = new Collection(Keys.EDITAIS_PUBLICADOS).count({
    includeInactive: true,
  });
  const modelos = new Collection(Keys.MODELOS).count({ includeInactive: true });

  const configuracoesCount = [
    Keys.TIPOS_EDITAL,
    Keys.MODALIDADES,
    Keys.TIPOS_ETAPA,
    Keys.CIDADES_PROVA,
    Keys.NECESSIDADES,
    Keys.TIPOS_DOCUMENTO,
    Keys.CRITERIOS_DESEMPATE,
    Keys.OBRIGATORIEDADES,
    Keys.PERCENTUAIS_IBGE,
    Keys.ESTRATEGIAS_BALANCEAMENTO,
    Keys.CASCATAS_REMANEJAMENTO,
    Keys.CURSOS,
  ].reduce((sum, k) => sum + new Collection(k).count({ includeInactive: false }), 0);

  setStats(
    'editais',
    `${editaisRascunho} rascunho(s) · ${editaisPublicado} publicado(s)`
  );
  setStats('modelos', `${modelos} modelo(s)`);
  setStats('configuracoes', `${configuracoesCount} entradas em 8 configurações`);
}

function setStats(name, value) {
  const el = document.querySelector(`[data-stats="${name}"]`);
  if (el) el.textContent = value;
}

async function resetData() {
  const ok = window.confirm(
    'Isso vai apagar TODOS os dados do protótipo (editais, modelos, configurações) e repopular as configurações + 2 rascunhos demo. Continuar?'
  );
  if (!ok) return;

  Storage.clearAll();

  try {
    const { loadSeeds } = await import('./seeds.js');
    await loadSeeds();

    const { loadDemoEditais, loadDemoModelos } = await import('./demo-editais.js');
    const qtdRascunhos = loadDemoEditais();
    const qtdModelos = await loadDemoModelos();

    Toast.success(
      `Configurações repopulados + ${qtdRascunhos} rascunho(s) e ${qtdModelos} modelo(s) demo criados.`
    );
    updateStats();
  } catch (e) {
    console.error(e);
    Toast.error(`Erro ao carregar seeds: ${e.message}`);
  }
}

async function ensureSeedsLoaded() {
  if (Storage.get(Keys.SEEDS_LOADED)) return;
  try {
    const { loadSeeds } = await import('./seeds.js');
    await loadSeeds();

    const { loadDemoEditais, loadDemoModelos } = await import('./demo-editais.js');
    loadDemoEditais();
    await loadDemoModelos();

    Toast.info('Configurações, rascunhos e modelos demo populados pela primeira vez.');
  } catch (e) {
    console.warn('Seeds ainda não disponíveis:', e.message);
  }
}

function init() {
  document
    .getElementById('btn-resetar')
    ?.addEventListener('click', resetData);

  ensureSeedsLoaded().then(updateStats);
  updateStats();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
