// Passo 2: Identificação — número, ano, data, sigla, nome, ingresso, PDF.

import { el, field, input, textarea, select } from '../dom.js';

export async function render(container, ctx) {
  const { state, updateState, setStepStatus } = ctx;
  const ident = state.edital.identificacao;

  function update(campo, valor) {
    const novoIdent = { ...ident, [campo]: valor };
    updateState({ identificacao: novoIdent });
    avaliarStatus();
  }

  function avaliarStatus() {
    const i = state.edital.identificacao;
    const completo = i.numero && i.ano && i.dataEdital && i.sigla && i.nomeProcesso;
    setStepStatus(completo ? 'completed' : 'in-progress');
  }

  container.innerHTML = '';
  container.appendChild(
    el('p', { class: 'text-muted mb-4' }, 'Dados de identificação do edital. O PDF é obrigatório para auditoria (RN08 + LGPD).')
  );

  const grid = el('div', { class: 'form-grid' });

  grid.appendChild(field('Número do edital', input(ident.numero, (v) => update('numero', v ? Number(v) : null), { type: 'number' }), 'Ex.: 003'));
  grid.appendChild(field('Ano', input(ident.ano, (v) => update('ano', v ? Number(v) : null), { type: 'number' }), 'Ex.: 2026'));
  grid.appendChild(field('Data do edital', input(ident.dataEdital, (v) => update('dataEdital', v), { type: 'date' })));
  grid.appendChild(field('Sigla órgão expedidor', input(ident.sigla || 'CEPS/UNIFESSPA', (v) => update('sigla', v))));
  grid.appendChild(field('Ano de ingresso', input(ident.anoIngresso, (v) => update('anoIngresso', v ? Number(v) : null), { type: 'number' }), 'Ex.: 2026'));
  grid.appendChild(
    field(
      'Período de ingresso',
      select(
        ident.periodoIngresso,
        [
          { value: '1S', label: '1º semestre' },
          { value: '2S', label: '2º semestre' },
        ],
        (v) => update('periodoIngresso', v),
        { placeholder: '— selecione —' }
      )
    )
  );

  container.appendChild(grid);

  // Linha cheia: nome do processo
  container.appendChild(
    field(
      'Nome do processo seletivo',
      input(ident.nomeProcesso, (v) => update('nomeProcesso', v), { placeholder: 'Ex.: Processo Seletivo PSE Educação do Campo 2026' })
    )
  );

  // Upload PDF (simulado)
  const pdfInfo = ident.pdf
    ? el(
        'div',
        { style: 'background: var(--primary-pastel-02); padding: 0.75rem; border-radius: 4px;' },
        el('strong', {}, '📎 ' + (ident.pdf.nome || 'arquivo.pdf')),
        el(
          'p',
          { class: 'text-small text-muted', style: 'margin: 0.25rem 0 0' },
          `${(ident.pdf.tamanho / 1024).toFixed(1)} KB · `,
          el('code', { style: 'font-size: 0.7rem' }, (ident.pdf.hash || '').substring(0, 16) + '…')
        )
      )
    : el('p', { class: 'text-muted text-small' }, 'Nenhum PDF anexado.');

  const fileInput = el('input', { type: 'file', accept: 'application/pdf', class: 'form-input' });
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    update('pdf', {
      nome: file.name,
      tamanho: file.size,
      hash: hashHex,
      anexadoEm: new Date().toISOString(),
    });
    // Re-render para mostrar info
    render(container, ctx);
  });

  container.appendChild(
    field(
      'PDF do edital (auditoria)',
      el('div', { class: 'flex gap-4', style: 'align-items: flex-start; flex-direction: column' }, pdfInfo, fileInput),
      'No protótipo, o arquivo não é persistido — apenas nome, tamanho e hash sha256 ficam registrados.'
    )
  );

  avaliarStatus();
}
