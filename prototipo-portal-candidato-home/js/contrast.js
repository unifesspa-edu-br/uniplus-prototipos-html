/* contrast.js — utilidades para razão de contraste WCAG (algoritmo oficial) */

function hexToRgb(hex) {
  const v = hex.replace('#', '').trim();
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [channel(r), channel(g), channel(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function ratio(fgHex, bgHex) {
  const Lfg = relativeLuminance(hexToRgb(fgHex));
  const Lbg = relativeLuminance(hexToRgb(bgHex));
  const [light, dark] = Lfg > Lbg ? [Lfg, Lbg] : [Lbg, Lfg];
  return (light + 0.05) / (dark + 0.05);
}

/** Resolve uma CSS variable para um hex em runtime — segue --refs em cadeia */
export function resolveCSSVar(varName, root = document.documentElement) {
  const computed = getComputedStyle(root).getPropertyValue(varName).trim();
  if (!computed) return null;
  if (computed.startsWith('#')) return computed;
  if (computed.startsWith('rgb')) {
    const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const hex = '#' + [m[1], m[2], m[3]]
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('');
      return hex;
    }
  }
  return computed;
}

export function classifyRatio(r, isLargeText = false) {
  if (isLargeText) {
    if (r >= 4.5) return { tag: 'AAA', cls: 'contrast-badge--aaa' };
    if (r >= 3.0) return { tag: 'AA', cls: 'contrast-badge--aa' };
    return { tag: 'FAIL', cls: 'contrast-badge--fail' };
  }
  if (r >= 7.0) return { tag: 'AAA', cls: 'contrast-badge--aaa' };
  if (r >= 4.5) return { tag: 'AA', cls: 'contrast-badge--aa' };
  if (r >= 3.0) return { tag: 'AA-LG', cls: 'contrast-badge--aa-large' };
  return { tag: 'FAIL', cls: 'contrast-badge--fail' };
}
