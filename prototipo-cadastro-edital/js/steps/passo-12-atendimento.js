// Passo 12: atendimento especializado — o que o EDITAL oferece (configuração).
//
// Vocabulário canônico INEP/MEC (Edital ENEM 52/2025):
//   - "Atendimento Especializado" (título da tela) é o nome do conjunto de adaptações na prova.
//   - "Condição de atendimento especializado" é a categoria do candidato
//     (PcD, dislexia, TDAH, diabetes, gestante, lactante, idoso, etc. — item 4.2.1 do edital).
//   - "Tipo de deficiência" é a deficiência catalogada (Lei 13.146/2015 — LBI) para candidatos PcD.
//   - "Recurso de acessibilidade" é cada adaptação que o edital pode oferecer (item 4.2.2).
//
// IMPORTANTE — modelagem oferta vs. solicitação:
//
//   state.edital.atendimentoEspecializado.oferta = {
//     condicoes_aceitas:     [...códigos de CondicaoAtendimentoEspecializado],
//     deficiencias_aceitas:  [...códigos de TipoDeficiencia (para PcD)],
//     recursos_oferecidos:   [...códigos de RecursoAcessibilidade],
//   }
//
// A SolicitacaoAtendimentoEspecializado (escolha que o candidato faz no ato da inscrição,
// com workflow de análise pelo CEPS, laudo, parecer, recurso) é DECISÃO DE F3 e NÃO está
// modelada neste protótipo — aqui só configuramos a OFERTA do edital.

import { Collection, Keys } from '../storage.js';
import { el, checkbox } from '../dom.js';

/**
 * Migra o formato antigo de `atendimentoEspecializado` (listas no topo ou ausente)
 * para o formato canônico atual (`{ oferta: { ... } }`), persistindo via `updateState`
 * para garantir autosave imediato — evita drift entre o objeto em memória e o
 * `localStorage`, problema que ocorreria se mutássemos `state.edital` diretamente.
 */
function migrateAtendimentoIfNeeded(state, updateState) {
  const atual = state.edital.atendimentoEspecializado;
  if (atual && atual.oferta) return; // já no formato canônico
  let novaOferta;
  if (!atual) {
    novaOferta = { condicoes_aceitas: [], deficiencias_aceitas: [], recursos_oferecidos: [] };
  } else {
    novaOferta = {
      condicoes_aceitas: atual.condicoes_aceitas || [],
      deficiencias_aceitas: atual.deficiencias_aceitas || [],
      recursos_oferecidos: atual.recursos_oferecidos || [],
    };
  }
  updateState({ atendimentoEspecializado: { oferta: novaOferta } });
}

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;

  // Garante a forma canônica (`{ oferta: { ... } }`) ANTES de qualquer leitura,
  // persistindo a migração via `updateState` (não mutar `state.edital` direto).
  migrateAtendimentoIfNeeded(state, updateState);
  const oferta = state.edital.atendimentoEspecializado.oferta;
  const observacoesMigracao = state.edital.atendimentoEspecializado?.observacoes_migracao || null;

  function dispensarObservacoesMigracao() {
    const atendimentoAtual = state.edital.atendimentoEspecializado || {};
    const { observacoes_migracao: _omit, ...semObservacoes } = atendimentoAtual;
    updateState({ atendimentoEspecializado: semObservacoes });
    render(container, ctx);
  }

  const condicoesDisponiveis = new Collection(Keys.CONDICOES_ATENDIMENTO_ESPECIALIZADO).list({
    includeInactive: false,
  });
  const deficienciasDisponiveis = new Collection(Keys.TIPOS_DEFICIENCIA).list({ includeInactive: false });
  const recursosDisponiveis = new Collection(Keys.RECURSOS_ACESSIBILIDADE).list({ includeInactive: false });

  function atualizarOferta(patch) {
    const novaOferta = { ...oferta, ...patch };
    updateState({ atendimentoEspecializado: { oferta: novaOferta } });
    avaliarStatus();
  }

  function toggle(lista, codigo, marcado) {
    return marcado ? [...new Set([...lista, codigo])] : lista.filter((c) => c !== codigo);
  }

  function toggleCondicao(codigo, marcado) {
    atualizarOferta({ condicoes_aceitas: toggle(oferta.condicoes_aceitas || [], codigo, marcado) });
    render(container, ctx);
  }

  function toggleDeficiencia(codigo, marcado) {
    atualizarOferta({ deficiencias_aceitas: toggle(oferta.deficiencias_aceitas || [], codigo, marcado) });
    render(container, ctx);
  }

  function toggleRecurso(codigo, marcado) {
    atualizarOferta({ recursos_oferecidos: toggle(oferta.recursos_oferecidos || [], codigo, marcado) });
    render(container, ctx);
  }

  function avaliarStatus() {
    const o = state.edital.atendimentoEspecializado?.oferta || {};
    const total =
      (o.condicoes_aceitas || []).length +
      (o.deficiencias_aceitas || []).length +
      (o.recursos_oferecidos || []).length;
    setStepStatus(total > 0 ? 'concluido' : 'pendente');
  }

  container.innerHTML = '';
  container.appendChild(
    el(
      'p',
      { class: 'text-muted mb-4' },
      'Configure a ',
      el('strong', {}, 'oferta de atendimento especializado'),
      ' deste edital, no vocabulário canônico do INEP (Edital ENEM 52/2025). Selecione as ',
      el('strong', {}, 'condições aceitas'),
      ' (item 4.2.1), as ',
      el('strong', {}, 'deficiências reconhecidas'),
      ' (LBI) e os ',
      el('strong', {}, 'recursos de acessibilidade'),
      ' oferecidos durante a aplicação da prova (item 4.2.2). A solicitação feita pelo candidato é decisão de fase posterior — aqui só configuramos o que o edital aceita oferecer.'
    )
  );

  // Banner de migração: clone de snapshot pré-2026-05 não consegue mapear o
  // formato legado `atendimento_especial[]` para a nova oferta — exibe aviso
  // para o usuário re-cadastrar manualmente e depois dispensar.
  if (observacoesMigracao) {
    container.appendChild(
      el(
        'div',
        {
          class: 'tag tag-warning',
          style:
            'display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.875rem 1rem; margin-bottom: 1rem; line-height: 1.4',
        },
        el('span', { 'aria-hidden': 'true', style: 'font-size: 1.25rem; line-height: 1' }, '⚠️'),
        el(
          'div',
          { style: 'flex: 1' },
          el(
            'p',
            { style: 'margin: 0 0 0.5rem; font-weight: 600' },
            'Atendimento especializado clonado de formato antigo'
          ),
          el(
            'p',
            { class: 'text-small', style: 'margin: 0 0 0.5rem' },
            'Este rascunho foi clonado de um edital publicado antes da padronização do vocabulário INEP (pré-2026-05). A oferta de atendimento especializado precisa ser re-cadastrada manualmente abaixo.'
          ),
          el(
            'p',
            { class: 'text-small text-muted', style: 'margin: 0 0 0.5rem' },
            `Detalhes da migração: ${observacoesMigracao}`
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-small',
              on: { click: dispensarObservacoesMigracao },
            },
            'Dispensar aviso'
          )
        )
      )
    );
  }

  if (
    condicoesDisponiveis.length === 0 &&
    deficienciasDisponiveis.length === 0 &&
    recursosDisponiveis.length === 0
  ) {
    container.appendChild(
      el(
        'p',
        { class: 'text-muted' },
        'Cadastre condições de atendimento especializado, tipos de deficiência e recursos de acessibilidade primeiro nas Configurações.'
      )
    );
    return;
  }

  // ===== Condições aceitas =====
  if (condicoesDisponiveis.length > 0) {
    const blocoCondicoes = el(
      'section',
      {
        style:
          'background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.25rem',
      }
    );
    blocoCondicoes.appendChild(
      el('h3', { style: 'font-size: 1rem; margin: 0 0 0.5rem' }, 'Condições aceitas (item 4.2.1)')
    );
    blocoCondicoes.appendChild(
      el(
        'p',
        { class: 'text-small text-muted', style: 'margin: 0 0 0.75rem' },
        'Categorias de candidato que o edital reconhece para fins de atendimento especializado (PcD, dislexia, TDAH, diabetes, gestante, lactante, idoso, outra condição específica).'
      )
    );

    const grid = el('div', {
      style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.375rem',
    });
    for (const cond of condicoesDisponiveis) {
      const marcada = (oferta.condicoes_aceitas || []).includes(cond.codigo);
      grid.appendChild(
        el(
          'div',
          {
            style:
              'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.5rem 0.625rem; background: ' +
              (marcada ? 'var(--primary-pastel-02)' : 'var(--bg-surface)'),
          },
          checkbox(cond.nome, marcada, (v) => toggleCondicao(cond.codigo, v)),
          cond.exige_laudo
            ? el(
                'div',
                { style: 'margin-top: 0.25rem' },
                el('span', { class: 'tag tag-warning', style: 'font-size: 0.7rem' }, 'Exige laudo')
              )
            : null
        )
      );
    }
    blocoCondicoes.appendChild(grid);
    container.appendChild(blocoCondicoes);
  }

  // ===== Deficiências aceitas =====
  const blocoDeficiencias = el(
    'section',
    {
      style:
        'background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.25rem',
    }
  );
  blocoDeficiencias.appendChild(
    el('h3', { style: 'font-size: 1rem; margin: 0 0 0.5rem' }, 'Deficiências reconhecidas (PcD)')
  );
  blocoDeficiencias.appendChild(
    el(
      'p',
      { class: 'text-small text-muted', style: 'margin: 0 0 0.75rem' },
      'Tipos de deficiência reconhecidos (Lei 13.146/2015 — LBI; Resolução 64/2015 CONSEPE/Unifesspa). Selecione quais o edital reconhece quando a condição aceita inclui PcD.'
    )
  );

  const gridDeficiencias = el('div', {
    style:
      'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.375rem',
  });
  for (const def of deficienciasDisponiveis) {
    const marcada = (oferta.deficiencias_aceitas || []).includes(def.codigo);
    gridDeficiencias.appendChild(
      el(
        'div',
        {
          style:
            'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.5rem 0.625rem; background: ' +
            (marcada ? 'var(--primary-pastel-02)' : 'var(--bg-surface)'),
        },
        checkbox(def.nome, marcada, (v) => toggleDeficiencia(def.codigo, v)),
        def.exige_laudo
          ? el(
              'div',
              { style: 'margin-top: 0.25rem' },
              el('span', { class: 'tag tag-warning', style: 'font-size: 0.7rem' }, 'Exige laudo')
            )
          : null
      )
    );
  }
  blocoDeficiencias.appendChild(gridDeficiencias);
  container.appendChild(blocoDeficiencias);

  // ===== Recursos de acessibilidade oferecidos =====
  const blocoRecursos = el(
    'section',
    {
      style:
        'background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; padding: 1rem 1.25rem',
    }
  );
  blocoRecursos.appendChild(
    el('h3', { style: 'font-size: 1rem; margin: 0 0 0.5rem' }, 'Recursos de acessibilidade oferecidos (item 4.2.2)')
  );
  blocoRecursos.appendChild(
    el(
      'p',
      { class: 'text-small text-muted', style: 'margin: 0 0 0.75rem' },
      'Adaptações disponíveis para a aplicação da prova (Edital ENEM 52/2025). Selecione quais o edital oferece — o candidato faz a solicitação no momento da inscrição.'
    )
  );

  const gridRecursos = el('div', {
    style:
      'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.375rem',
  });
  for (const rec of recursosDisponiveis) {
    const marcado = (oferta.recursos_oferecidos || []).includes(rec.codigo);
    gridRecursos.appendChild(
      el(
        'div',
        {
          style:
            'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.5rem 0.625rem; background: ' +
            (marcado ? 'var(--primary-pastel-02)' : 'var(--bg-surface)'),
        },
        checkbox(rec.nome, marcado, (v) => toggleRecurso(rec.codigo, v)),
        rec.origem === 'UNIFESSPA_LOCAL'
          ? el(
              'div',
              { style: 'margin-top: 0.25rem' },
              el('span', { class: 'tag tag-info', style: 'font-size: 0.7rem' }, 'Extensão local')
            )
          : null,
        rec.descricao
          ? el(
              'p',
              { class: 'text-small text-muted', style: 'margin: 0.25rem 0 0' },
              rec.descricao
            )
          : null
      )
    );
  }
  blocoRecursos.appendChild(gridRecursos);
  container.appendChild(blocoRecursos);

  avaliarStatus();
}
