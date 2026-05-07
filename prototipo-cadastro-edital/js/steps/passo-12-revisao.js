// Passo 13: Revisão e publicação — validação dinâmica + snapshot + publicar.
// Implementação completa será feita nas Etapas 5 (validator) e 6 (snapshot).

import { el } from '../dom.js';

export async function render(container, ctx) {
  const { state, setStepStatus } = ctx;
  setStepStatus('in-progress');

  container.innerHTML = '';
  container.appendChild(el('p', { class: 'text-muted mb-4' }, 'Revisão final do edital. Painel de validações dinâmicas (obrigatoriedades legais) + snapshot + hash sha256.'));

  // Carrega dinamicamente os módulos de validação e snapshot
  let ValidatorMod, SnapshotMod;
  try {
    ValidatorMod = await import('../validator.js');
    SnapshotMod = await import('../snapshot.js');
  } catch (e) {
    container.appendChild(
      el(
        'div',
        { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '🚧'),
        el('p', {}, 'Módulos de validação/snapshot ainda não implementados.'),
        el('p', { class: 'text-small text-muted' }, 'Serão adicionados nas Etapas 5 e 6.')
      )
    );
    return;
  }

  await ValidatorMod.renderValidationPanel(container, ctx);
  await SnapshotMod.renderPublishPanel(container, ctx);
}
