// Passo 12: atendimento especializado — o que o EDITAL oferece (configuração).
//
// Vocabulário canônico INEP/MEC (Edital ENEM 52/2025):
//   - "Atendimento Especializado" (título da tela) é o nome do conjunto de adaptações na prova.
//   - "Condição de atendimento especializado" é a categoria do candidato
//     (PcD, dislexia, TDAH, diabetes, gestante, lactante, idoso, etc. — item 4.2.1 do edital).
//   - "Tipo de deficiência" é a deficiência catalogada (Lei 13.146/2015 — LBI) para candidatos PcD.
//   - "Recurso de acessibilidade" é cada adaptação que o edital pode oferecer (item 4.2.2).
//
// MODELAGEM — Opção C (aninhamento hierárquico, binding TL 2026-05-19):
//
//   state.edital.atendimentoEspecializado.oferta = {
//     condicoes_aceitas:   [...códigos de CondicaoAtendimentoEspecializado],
//     detalhes_pcd: { tipos_deficiencia: [...códigos de TipoDeficiencia] } | null,
//     recursos_oferecidos: [...códigos de RecursoAcessibilidade],
//   }
//
// Invariantes estruturais (nunca permite estado inválido):
//   - PCD ∈ condicoes_aceitas ⟺ detalhes_pcd.tipos_deficiencia.length ≥ 1
//   - PCD ∉ condicoes_aceitas → detalhes_pcd é null ou ausente
//   - TipoDeficiencia jamais aparece fora de detalhes_pcd
//
// A SolicitacaoAtendimentoEspecializado (escolha que o candidato faz no ato da inscrição,
// com workflow de análise pelo CEPS, laudo, parecer, recurso) é DECISÃO DE F3 e NÃO está
// modelada neste protótipo — aqui só configuramos a OFERTA do edital.

import { Collection, Keys } from '../storage.js';
import { el, checkbox } from '../dom.js';

/**
 * Migra o formato de `atendimentoEspecializado` para o formato canônico Opção C
 * (`{ oferta: { condicoes_aceitas, detalhes_pcd, recursos_oferecidos } }`).
 *
 * Formatos tratados:
 *   1. Canônico novo (Opção C): `oferta.detalhes_pcd.tipos_deficiencia` — retorna sem modificar.
 *   2. Pós-C7 (atual): `oferta.deficiencias_aceitas` — migra para `detalhes_pcd` se PCD presente.
 *   3. Pré-C7 legado: `atendimento_especial[]` — via `clone.js` `observacoes_migracao` já tratado.
 *   4. Legado inválido: PCD marcado mas deficiências vazias — gera `observacoes_migracao_pcd`
 *      (nunca preenche arbitrariamente).
 */
function migrateAtendimentoIfNeeded(state, updateState) {
  const atual = state.edital.atendimentoEspecializado;

  // Já no formato canônico Opção C — sem campo legado deficiencias_aceitas.
  // FIX 2 (P1): antes de retornar, detectar caso patológico (PCD marcado + detalhes_pcd
  // null/ausente no shape canônico). Persiste observacoes_migracao_pcd sem preencher tipos.
  if (atual && atual.oferta && atual.oferta.detalhes_pcd !== undefined &&
      !atual.oferta.deficiencias_aceitas) {
    const temPCD = (atual.oferta.condicoes_aceitas || []).includes('PCD');
    const temDetalhes = (atual.oferta.detalhes_pcd?.tipos_deficiencia || []).length > 0;
    if (temPCD && !temDetalhes && !atual.observacoes_migracao_pcd) {
      // Estado canônico inválido: PCD sem tipos. Gravar aviso sem alterar dados.
      updateState({
        atendimentoEspecializado: {
          ...atual,
          observacoes_migracao_pcd:
            'Edital aceita PCD mas não declara tipos de deficiência reconhecidos. ' +
            'Complete a configuração abaixo (sub-bloco "Tipos de deficiência reconhecidos") ' +
            'ou remova PCD das condições aceitas.',
        },
      });
    }
    return;
  }

  let novaOferta;

  if (!atual) {
    novaOferta = { condicoes_aceitas: [], detalhes_pcd: null, recursos_oferecidos: [] };
  } else if (!atual.oferta) {
    // Formato intermediário sem `oferta` wrapper
    novaOferta = {
      condicoes_aceitas: atual.condicoes_aceitas || [],
      deficiencias_aceitas: atual.deficiencias_aceitas || [],
      recursos_oferecidos: atual.recursos_oferecidos || [],
    };
  } else {
    novaOferta = { ...atual.oferta };
  }

  // Caso 1 (pós-C7): tem deficiencias_aceitas com dados → migrar para detalhes_pcd
  if (novaOferta.deficiencias_aceitas && novaOferta.deficiencias_aceitas.length > 0 &&
      !novaOferta.detalhes_pcd) {
    novaOferta.detalhes_pcd = { tipos_deficiencia: novaOferta.deficiencias_aceitas };
    if (!(novaOferta.condicoes_aceitas || []).includes('PCD')) {
      novaOferta.condicoes_aceitas = [...(novaOferta.condicoes_aceitas || []), 'PCD'];
    }
    delete novaOferta.deficiencias_aceitas;
  } else if (novaOferta.deficiencias_aceitas !== undefined && !novaOferta.detalhes_pcd) {
    // Lista vazia — apenas remover o campo legado
    delete novaOferta.deficiencias_aceitas;
    novaOferta.detalhes_pcd = null;
  }

  // Caso 2 (legado inválido): PCD marcado mas detalhes_pcd null/vazio
  // NÃO preencher arbitrariamente — gerar aviso para o admin corrigir manualmente.
  const temPCD = (novaOferta.condicoes_aceitas || []).includes('PCD');
  const temDetalhes = novaOferta.detalhes_pcd?.tipos_deficiencia?.length > 0;

  if (temPCD && !temDetalhes) {
    // Estado legado inválido — preservar null e registrar observação
    novaOferta.detalhes_pcd = novaOferta.detalhes_pcd || null;
    updateState({
      atendimentoEspecializado: {
        oferta: novaOferta,
        observacoes_migracao_pcd:
          'Edital aceita PCD mas não declara tipos de deficiência reconhecidos. ' +
          'Complete a configuração abaixo (sub-bloco "Tipos de deficiência reconhecidos") ' +
          'ou remova PCD das condições aceitas.',
      },
    });
    return;
  }

  updateState({ atendimentoEspecializado: { oferta: novaOferta } });
}

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;

  // Garante a forma canônica Opção C ANTES de qualquer leitura,
  // persistindo a migração via `updateState` (não mutar `state.edital` direto).
  migrateAtendimentoIfNeeded(state, updateState);
  const oferta = state.edital.atendimentoEspecializado.oferta;
  const observacoesMigracao = state.edital.atendimentoEspecializado?.observacoes_migracao || null;
  const observacoesMigracaoPcd = state.edital.atendimentoEspecializado?.observacoes_migracao_pcd || null;

  function dispensarObservacoesMigracao() {
    const atendimentoAtual = state.edital.atendimentoEspecializado || {};
    const { observacoes_migracao: _omit, ...semObservacoes } = atendimentoAtual;
    updateState({ atendimentoEspecializado: semObservacoes });
    render(container, ctx);
  }

  function dispensarObservacoesMigracaoPcd() {
    const atendimentoAtual = state.edital.atendimentoEspecializado || {};
    const { observacoes_migracao_pcd: _omit, ...semObservacoes } = atendimentoAtual;
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
    updateState({ atendimentoEspecializado: { ...state.edital.atendimentoEspecializado, oferta: novaOferta } });
    avaliarStatus();
  }

  function toggle(lista, codigo, marcado) {
    return marcado ? [...new Set([...lista, codigo])] : lista.filter((c) => c !== codigo);
  }

  function toggleCondicao(codigo, marcado) {
    // FIX 3 (P1): para PCD, o checkbox controla apenas a visibilidade do sub-bloco.
    // 'PCD' só entra em condicoes_aceitas quando houver ≥1 tipo selecionado.
    // Ao desmarcar PCD → limpar detalhes_pcd, remover 'PCD' e cancelar _pcd_pending.
    // Ao marcar PCD sem tipos → salvar _pcd_pending: true (sinaliza sub-bloco visível)
    //   sem adicionar 'PCD' a condicoes_aceitas. Hint orienta o admin a selecionar tipos.
    if (codigo === 'PCD') {
      if (!marcado) {
        // Desmarcou PCD: remover da lista, limpar tipos e cancelar pending
        const semPcd = (oferta.condicoes_aceitas || []).filter((c) => c !== 'PCD');
        atualizarOferta({ condicoes_aceitas: semPcd, detalhes_pcd: null, _pcd_pending: false });
      } else {
        // Marcou PCD mas ainda sem tipos: sinalizar pending para exibir sub-bloco
        atualizarOferta({ _pcd_pending: true });
      }
      render(container, ctx);
      return;
    }
    const novasCondicoes = toggle(oferta.condicoes_aceitas || [], codigo, marcado);
    atualizarOferta({ condicoes_aceitas: novasCondicoes });
    render(container, ctx);
  }

  function toggleDeficienciaPcd(codigoDeficiencia, marcado) {
    const atual = oferta.detalhes_pcd?.tipos_deficiencia || [];
    const novosTypes = toggle(atual, codigoDeficiencia, marcado);
    // FIX 3 (P1): PCD entra/sai de condicoes_aceitas aqui, sincronizado com os tipos.
    // Se há ≥1 tipo → garantir 'PCD' em condicoes_aceitas.
    // Se há 0 tipos → remover 'PCD' de condicoes_aceitas e limpar detalhes_pcd.
    const novasCondicoes = [...(oferta.condicoes_aceitas || [])];
    if (novosTypes.length > 0) {
      if (!novasCondicoes.includes('PCD')) novasCondicoes.push('PCD');
      atualizarOferta({
        condicoes_aceitas: novasCondicoes,
        detalhes_pcd: { tipos_deficiencia: novosTypes },
        // Primeiro tipo selecionado: consolidar pending → condicoes_aceitas
        _pcd_pending: false,
      });
    } else {
      const semPcd = novasCondicoes.filter((c) => c !== 'PCD');
      // Todos os tipos desmarcados: rebaixar para pending (sub-bloco continua visível
      // com hint, mas 'PCD' sai de condicoes_aceitas — estado inválido inalcançável).
      atualizarOferta({ condicoes_aceitas: semPcd, detalhes_pcd: null, _pcd_pending: true });
    }
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
      (o.detalhes_pcd?.tipos_deficiencia || []).length +
      (o.recursos_oferecidos || []).length;
    setStepStatus(total > 0 ? 'concluido' : 'pendente');
  }

  // FIX 3 (P1): sub-bloco visível quando PCD está em condicoes_aceitas (tipos já salvos)
  // OU quando _pcd_pending sinaliza que o admin marcou o checkbox mas ainda não selecionou tipos.
  const temPCDMarcado = (oferta.condicoes_aceitas || []).includes('PCD') || !!oferta._pcd_pending;

  container.innerHTML = '';
  container.appendChild(
    el(
      'p',
      { class: 'text-muted mb-4' },
      'Configure a ',
      el('strong', {}, 'oferta de atendimento especializado'),
      ' deste edital, no vocabulário canônico do INEP (Edital ENEM 52/2025). Selecione as ',
      el('strong', {}, 'condições aceitas'),
      ' (item 4.2.1) — ao marcar PCD, especifique os ',
      el('strong', {}, 'tipos de deficiência reconhecidos'),
      ' (LBI) no sub-bloco que aparece abaixo — e os ',
      el('strong', {}, 'recursos de acessibilidade'),
      ' oferecidos durante a aplicação da prova (item 4.2.2). A solicitação feita pelo candidato é decisão de fase posterior — aqui só configuramos o que o edital aceita oferecer.'
    )
  );

  // Banner de migração legado (formato pré-C7)
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

  // Banner de pendência PCD (estado legado inválido — PCD marcado sem tipos de deficiência)
  if (observacoesMigracaoPcd) {
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
            'Pendência: PCD marcado sem tipos de deficiência'
          ),
          el(
            'p',
            { class: 'text-small', style: 'margin: 0 0 0.5rem' },
            observacoesMigracaoPcd
          ),
          el(
            'div',
            { style: 'display: flex; gap: 0.5rem; flex-wrap: wrap' },
            el(
              'button',
              {
                type: 'button',
                class: 'btn btn-primary btn-small',
                on: {
                  click: () => {
                    // Rola para o sub-bloco de tipos de deficiência
                    const el = document.getElementById('bloco-tipos-deficiencia-pcd');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  },
                },
              },
              'Corrigir agora'
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'btn btn-ghost btn-small',
                on: { click: dispensarObservacoesMigracaoPcd },
              },
              'Dispensar aviso'
            )
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
        'Categorias de candidato que o edital reconhece para fins de atendimento especializado (PcD, dislexia, TDAH, diabetes, gestante, lactante, idoso, outra condição específica). Ao marcar PCD, aparece sub-bloco para especificar os tipos de deficiência (LBI).'
      )
    );

    const grid = el('div', {
      style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.375rem',
    });
    for (const cond of condicoesDisponiveis) {
      // FIX 3 (P1): para PCD, checkbox aparece marcado quando PCD está em condicoes_aceitas
      // OU quando _pcd_pending está ativo (admin clicou mas ainda não selecionou tipos).
      const marcada = cond.codigo === 'PCD'
        ? temPCDMarcado
        : (oferta.condicoes_aceitas || []).includes(cond.codigo);
      // Hint adicional para PCD pending (sem tipos ainda)
      const pcdPendente = cond.codigo === 'PCD' && !!oferta._pcd_pending &&
        !(oferta.condicoes_aceitas || []).includes('PCD');
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
            : null,
          // FIX 3: hint quando PCD marcado mas ainda sem tipos (pending)
          pcdPendente
            ? el(
                'div',
                { style: 'margin-top: 0.25rem' },
                el('span', { class: 'tag tag-warning', style: 'font-size: 0.7rem' }, 'Selecione ao menos 1 tipo de deficiência para ativar PCD')
              )
            : null,
          // Indicador visual: PCD tem sub-detalhamento (quando já ativado com tipos)
          cond.exige_tipos_deficiencia && marcada && !pcdPendente
            ? el(
                'div',
                { style: 'margin-top: 0.25rem' },
                el('span', { class: 'tag tag-info', style: 'font-size: 0.7rem' }, '↓ Especifique tipos abaixo')
              )
            : null
        )
      );
    }
    blocoCondicoes.appendChild(grid);

    // ===== Sub-bloco: Tipos de deficiência (só aparece quando PCD marcado) =====
    if (temPCDMarcado && deficienciasDisponiveis.length > 0) {
      const blocoTiposPcd = el(
        'div',
        {
          id: 'bloco-tipos-deficiencia-pcd',
          style:
            'margin-top: 1rem; border: 1px solid var(--color-warning, #e0a800); border-radius: 6px; padding: 0.875rem 1rem; background: var(--primary-pastel-02)',
        }
      );
      blocoTiposPcd.appendChild(
        el(
          'h4',
          { style: 'font-size: 0.9rem; margin: 0 0 0.375rem; font-weight: 600' },
          'Tipos de deficiência reconhecidos (LBI)'
        )
      );
      blocoTiposPcd.appendChild(
        el(
          'p',
          { class: 'text-small text-muted', style: 'margin: 0 0 0.625rem' },
          'Especifique quais tipos de deficiência (Lei 13.146/2015 — LBI) este edital reconhece. Obrigatório quando PCD está marcado. Selecione ao menos 1.'
        )
      );

      const gridTipos = el('div', {
        style:
          'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.375rem',
      });
      const tiposSelecionados = oferta.detalhes_pcd?.tipos_deficiencia || [];
      for (const def of deficienciasDisponiveis) {
        const marcadaDef = tiposSelecionados.includes(def.codigo);
        gridTipos.appendChild(
          el(
            'div',
            {
              style:
                'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.5rem 0.625rem; background: ' +
                (marcadaDef ? 'var(--primary-pastel-01, var(--primary-pastel-02))' : 'var(--bg-surface)'),
            },
            checkbox(def.nome, marcadaDef, (v) => toggleDeficienciaPcd(def.codigo, v)),
            def.categoria_lbi
              ? el(
                  'div',
                  { style: 'margin-top: 0.25rem' },
                  el('span', { class: 'tag', style: 'font-size: 0.7rem' }, `LBI: ${def.categoria_lbi}`)
                )
              : null
          )
        );
      }
      blocoTiposPcd.appendChild(gridTipos);

      // Mensagem de validação em tempo real
      if (tiposSelecionados.length === 0) {
        blocoTiposPcd.appendChild(
          el(
            'p',
            { class: 'text-small', style: 'margin-top: 0.5rem; color: var(--color-danger, #c92a2a)' },
            '⚠️ Selecione ao menos 1 tipo de deficiência ou desmarque PCD nas condições acima.'
          )
        );
      }

      blocoCondicoes.appendChild(blocoTiposPcd);
    }

    container.appendChild(blocoCondicoes);
  }

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
