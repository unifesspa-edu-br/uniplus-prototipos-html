// app.js — bootstrap do dashboard (index.html)

import { Storage, Collection, Keys } from './storage.js';
import { Toast } from './toast.js';

function updateStats() {
  const editaisRascunho = new Collection(Keys.EDITAIS_RASCUNHO).count({
    includeInactive: true,
  });
  const editaisPublicado = new Collection(Keys.EDITAIS_PUBLICADO).count({
    includeInactive: true,
  });
  const modelos = new Collection(Keys.MODELOS).count({ includeInactive: true });

  const catalogoCount = [
    Keys.TIPOS_EDITAL,
    Keys.MODALIDADES,
    Keys.TIPOS_ETAPA,
    Keys.LOCAIS_PROVA,
    Keys.NECESSIDADES,
    Keys.TIPOS_DOCUMENTO,
    Keys.CRITERIOS_DESEMPATE,
    Keys.OBRIGATORIEDADES,
  ].reduce((sum, k) => sum + new Collection(k).count({ includeInactive: false }), 0);

  setStats(
    'editais',
    `${editaisRascunho} rascunho(s) · ${editaisPublicado} publicado(s)`
  );
  setStats('modelos', `${modelos} modelo(s)`);
  setStats('catalogos', `${catalogoCount} entradas em 8 catálogos`);
}

function setStats(name, value) {
  const el = document.querySelector(`[data-stats="${name}"]`);
  if (el) el.textContent = value;
}

async function resetData() {
  const ok = window.confirm(
    'Isso vai apagar TODOS os dados do protótipo (editais, modelos, catálogos) e repopular os catálogos + 2 rascunhos demo. Continuar?'
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
      `Catálogos repopulados + ${qtdRascunhos} rascunho(s) e ${qtdModelos} modelo(s) demo criados.`
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

    Toast.info('Catálogos, rascunhos e modelos demo populados pela primeira vez.');
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
