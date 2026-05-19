// presentation.js — bootstrap reveal.js + mermaid com isolamento de erro por diagrama

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#e3f0ff',
    primaryTextColor: '#071d41',
    primaryBorderColor: '#1351b4',
    lineColor: '#5b6b8c',
    secondaryColor: '#fff8d6',
    tertiaryColor: '#f8f8f8',
    fontFamily: 'Rawline, Inter, system-ui, sans-serif',
    fontSize: '13px',
  },
  flowchart: { htmlLabels: true, curve: 'basis', padding: 12 },
  er: { layoutDirection: 'TB', minEntityWidth: 100, entityPadding: 12 },
});

const deck = new Reveal({
  controls: true,
  controlsTutorial: false,
  progress: true,
  slideNumber: 'c/t',
  hash: true,
  hashOneBasedIndex: true,
  navigationMode: 'linear',
  transition: 'slide',
  transitionSpeed: 'default',
  backgroundTransition: 'fade',
  width: 1400,
  height: 900,
  margin: 0.04,
  minScale: 0.4,
  maxScale: 1.6,
  center: false,
  plugins: [RevealNotes, RevealHighlight],
});

// Renderiza um único nó Mermaid com isolamento de erro — falha de 1 não bloqueia os outros.
async function renderOne(node) {
  if (node.getAttribute('data-processed') === 'true') return;
  try {
    await mermaid.run({ nodes: [node] });
  } catch (err) {
    console.error('Mermaid falhou em diagrama', node, err);
    node.setAttribute('data-processed', 'true');
    node.innerHTML =
      '<div style="padding:1rem;background:#fde2e2;border:1px solid #c52727;border-radius:6px;color:#7d1a1a;font-size:0.85rem;">' +
      '<strong>⚠ Falha ao renderizar diagrama Mermaid.</strong><br>' +
      '<span style="font-family:monospace;font-size:0.75rem;">' +
      String(err && err.message || err).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])) +
      '</span></div>';
  }
}

async function renderMermaidIfNeeded(scope) {
  const nodes = scope.querySelectorAll('.mermaid:not([data-processed="true"])');
  if (nodes.length === 0) return false;
  // Render serial com isolamento — não usar mermaid.run em lote para evitar abort em cascata
  for (const node of nodes) {
    await renderOne(node);
  }
  return true;
}

// Renderizar Mermaid APENAS no slide visível — slides ocultos têm bbox 0×0
// e ER diagrams quebram com "getPointAtLength" em layouts não-renderizados.
// Esta estratégia (lazy por slide) é a única confiável para reveal.js + mermaid ER.

deck.initialize().then(async () => {
  const currentSlide = deck.getCurrentSlide();
  if (currentSlide) {
    await renderMermaidIfNeeded(currentSlide);
    deck.layout();
  }
});

deck.on('slidechanged', async (event) => {
  const rendered = await renderMermaidIfNeeded(event.currentSlide);
  if (rendered) deck.layout();
});
