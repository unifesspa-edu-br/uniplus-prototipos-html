// Passo 11: Cidades de prova — quais cidades o candidato pode escolher na inscrição
// e quais cursos do edital cada cidade aceita.
//
// Modelo:
//   state.edital.cidades = [{ cidadeCodigo, cursoCodigos: string[] }]
//   - cursoCodigos sempre é array; "todos" é preenchido explicitamente via botão (sem null/sentinela).
//
// O local exato (sala/prédio) é definido pelo módulo de ensalamento — fora do escopo
// da fase de inscrição.

import { Collection, Keys } from '../storage.js';
import { el, checkbox, input } from '../dom.js';

const GRAU_ABREV = { BACHARELADO: 'Bach.', LICENCIATURA: 'Lic.', TECNOLOGO: 'Tecn.' };
const TURNO_LABEL = {
  MATUTINO: 'Matutino',
  VESPERTINO: 'Vespertino',
  NOTURNO: 'Noturno',
  INTEGRAL: 'Integral',
};

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;

  const cidadesDisponiveis = new Collection(Keys.CIDADES).list({ includeInactive: false });
  const cursosCatalogo = new Collection(Keys.CURSOS).list({ includeInactive: true });
  const campusList = new Collection(Keys.CAMPUS).list({ includeInactive: true });
  const campusPorCodigo = Object.fromEntries(campusList.map((c) => [c.codigo, c]));
  const cidadesPorCodigo = Object.fromEntries(cidadesDisponiveis.map((c) => [c.codigo, c]));
  const cursoPorCodigo = Object.fromEntries(cursosCatalogo.map((c) => [c.codigo, c]));

  // Cursos do edital (referenciados em passo 4)
  const cursosDoEdital = (state.edital.vagas?.cursos || [])
    .map((linha) => cursoPorCodigo[linha.cursoCodigo])
    .filter(Boolean);
  const codigosCursosEdital = cursosDoEdital.map((c) => c.codigo);

  function getCidades() {
    return state.edital.cidades || [];
  }

  function findEntry(cidadeCodigo) {
    return getCidades().find((c) => c.cidadeCodigo === cidadeCodigo);
  }

  function rerender() {
    render(container, ctx);
  }

  function avaliarStatus() {
    const lista = getCidades();
    const algumaCidadeSemCurso = lista.some((c) => (c.cursoCodigos || []).length === 0);
    if (lista.length === 0) return setStepStatus('pendente');
    if (algumaCidadeSemCurso) return setStepStatus('atencao');
    setStepStatus('concluido');
  }

  function toggleCidade(cidadeCodigo, marcar) {
    const lista = getCidades();
    if (marcar) {
      if (lista.some((c) => c.cidadeCodigo === cidadeCodigo)) return;
      updateState({
        cidades: [...lista, { cidadeCodigo, cursoCodigos: [], capacidadeMaxima: null }],
      });
    } else {
      updateState({ cidades: lista.filter((c) => c.cidadeCodigo !== cidadeCodigo) });
    }
    avaliarStatus();
    rerender();
  }

  function setCapacidade(cidadeCodigo, capacidadeMaxima) {
    const lista = getCidades().map((c) =>
      c.cidadeCodigo === cidadeCodigo ? { ...c, capacidadeMaxima } : c
    );
    updateState({ cidades: lista });
  }

  function setCursosDaCidade(cidadeCodigo, cursoCodigos) {
    const lista = getCidades().map((c) =>
      c.cidadeCodigo === cidadeCodigo ? { ...c, cursoCodigos } : c
    );
    updateState({ cidades: lista });
    avaliarStatus();
    rerender();
  }

  function toggleCursoNaCidade(cidadeCodigo, cursoCodigo, marcar) {
    const entry = findEntry(cidadeCodigo);
    if (!entry) return;
    const atual = entry.cursoCodigos || [];
    const novos = marcar
      ? [...new Set([...atual, cursoCodigo])]
      : atual.filter((c) => c !== cursoCodigo);
    setCursosDaCidade(cidadeCodigo, novos);
  }

  function rotuloCurso(curso) {
    const campus = campusPorCodigo[curso.campus_codigo];
    const campusNome = campus?.nome || curso.campus_codigo;
    const cidadeNome = campus ? cidadesPorCodigo[campus.cidade_codigo]?.nome : null;
    const local = cidadeNome ? `${campusNome} · ${cidadeNome}` : campusNome;
    return `${curso.nome} — ${GRAU_ABREV[curso.grau] || curso.grau} — ${local} — ${TURNO_LABEL[curso.turno] || curso.turno}`;
  }

  container.innerHTML = '';

  container.appendChild(el('h3', { style: 'font-size: 1rem; margin-bottom: 0.5rem' }, 'Cidades de prova'));
  container.appendChild(
    el(
      'p',
      { class: 'text-muted text-small mb-3' },
      'Marque as cidades onde haverá prova. Para cada cidade marcada, selecione quais cursos do edital terão prova ali (use ',
      el('strong', {}, 'Selecionar todos'),
      ' para todos os cursos do edital). ',
      el('strong', {}, 'O local exato (sala/prédio) não é definido aqui '),
      '— isso é feito pelo módulo de ensalamento depois das inscrições. Para incluir uma cidade nova, vá em ',
      el('a', { href: 'configuracao.html?slug=cidades' }, 'Configurações › Cidades'),
      '.'
    )
  );

  if (cidadesDisponiveis.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'tag tag-warning', style: 'padding: 0.75rem; display: block' },
        'Nenhuma cidade cadastrada. Cadastre antes em Configurações › Cidades.'
      )
    );
    avaliarStatus();
    return;
  }

  if (cursosDoEdital.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'tag tag-warning', style: 'padding: 0.75rem; display: block; margin-bottom: 0.75rem' },
        'Adicione cursos no passo 4 (Vagas) antes de mapear cidades a cursos.'
      )
    );
  }

  for (const cidade of cidadesDisponiveis) {
    const entry = findEntry(cidade.codigo);
    const marcada = !!entry;

    const box = el(
      'div',
      {
        style:
          'border: 1px solid var(--border-default); border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; font-weight: 600; background: ' +
          (marcada ? 'var(--primary-pastel-02)' : 'var(--bg-surface)'),
      },
      checkbox(
        `${cidade.nome} (${cidade.uf})`,
        marcada,
        (val) => toggleCidade(cidade.codigo, val)
      )
    );

    if (marcada) {
      // Capacidade máxima de inscritos nessa cidade para este edital.
      const capacidadeLinha = el(
        'div',
        {
          style:
            'display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0 0; font-weight: 400; font-size: 0.875rem',
        },
        el('label', {}, 'Capacidade máxima de inscritos:'),
        (() => {
          const i = input(
            entry.capacidadeMaxima ?? '',
            (v) => setCapacidade(cidade.codigo, v === '' || v == null ? null : Number(v)),
            { type: 'number', placeholder: 'sem limite' }
          );
          i.style.maxWidth = '140px';
          i.setAttribute('min', '0');
          return i;
        })(),
        el(
          'span',
          { class: 'text-small text-muted' },
          entry.capacidadeMaxima
            ? 'Vagas estouradas serão rejeitadas pelo sistema.'
            : 'Vazio = sem limite (o que pode estourar a capacidade real do local).'
        )
      );
      box.appendChild(capacidadeLinha);
    }

    if (marcada && cursosDoEdital.length > 0) {
      const selecionados = entry.cursoCodigos || [];

      const acoes = el(
        'div',
        { style: 'margin: 0.5rem 0 0.25rem; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap' },
        el(
          'span',
          { class: 'text-small text-muted' },
          `${selecionados.length} de ${cursosDoEdital.length} curso(s)`
        ),
        el(
          'a',
          {
            href: '#',
            style: 'font-size: 0.875rem',
            on: {
              click: (e) => {
                e.preventDefault();
                setCursosDaCidade(cidade.codigo, [...codigosCursosEdital]);
              },
            },
          },
          'Selecionar todos'
        ),
        el(
          'a',
          {
            href: '#',
            style: 'font-size: 0.875rem',
            on: {
              click: (e) => {
                e.preventDefault();
                setCursosDaCidade(cidade.codigo, []);
              },
            },
          },
          'Limpar'
        )
      );
      box.appendChild(acoes);

      const lista = el(
        'div',
        {
          style:
            'max-height: 220px; overflow-y: auto; padding: 0.5rem; font-weight: 400; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; margin-top: 0.25rem',
        }
      );
      for (const curso of cursosDoEdital) {
        const marcado = selecionados.includes(curso.codigo);
        lista.appendChild(
          el(
            'div',
            { style: 'padding: 0.125rem 0' },
            checkbox(
              rotuloCurso(curso),
              marcado,
              (val) => toggleCursoNaCidade(cidade.codigo, curso.codigo, val)
            )
          )
        );
      }
      box.appendChild(lista);

      if (selecionados.length === 0) {
        box.appendChild(
          el(
            'div',
            { class: 'tag tag-warning', style: 'margin-top: 0.5rem; display: inline-block' },
            '⚠️ Marque ao menos um curso, ou desmarque a cidade.'
          )
        );
      }
    }

    container.appendChild(box);
  }

  const total = getCidades().length;
  container.appendChild(
    el(
      'div',
      { class: 'mt-3 text-small text-muted' },
      `${total} cidade(s) com prova · ${cidadesDisponiveis.length} disponível(eis) na configuração`
    )
  );

  avaliarStatus();
}
