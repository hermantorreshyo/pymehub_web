import { h, svg } from '../../lib/dom.js';

/**
 * Logotipo animado de Pyme Hub: se arma con las piezas exactas del logotipo
 * (las mismas de la landing "Muy pronto"), sin deformarlo ni recolorearlo (RNF-050b).
 *
 *   animatedLogo()                         → color, con lema y animación de entrada
 *   animatedLogo({ variant: 'claro' })     → para fondos navy: "Pyme" y lema en blanco
 *   animatedLogo({ tagline: false })       → sin lema
 *   animatedLogo({ animate: false })       → estático (p. ej. cabecera)
 *
 * La variante clara solo cambia el color de "Pyme" y del lema para mantener el contraste;
 * el símbolo y "Hub" conservan los colores de marca (P-13: variante negativa provisional).
 * Con prefers-reduced-motion el logotipo aparece ya montado (RNF-047).
 */
const BASE = 'assets/brand/logo-anim/';

const PIECES = [
  // [archivo, clase, tipo] — el orden coincide con el de la animación
  ['anillo', 'anillo', 'ring'],
  ['nucleo', 'nucleo', 'core'],
  ['persona-1', 'persona-1', 'head'],
  ['persona-2', 'persona-2', 'head'],
  ['persona-3', 'persona-3', 'head'],
  ['persona-4', 'persona-4', 'head'],
  ['persona-5', 'persona-5', 'head'],
  ['letra-p', 'letra-p', 'ltr', true],
  ['letra-y', 'letra-y', 'ltr', true],
  ['letra-m', 'letra-m', 'ltr', true],
  ['letra-e', 'letra-e', 'ltr', true],
  ['letra-h', 'letra-h', 'ltr'],
  ['letra-u', 'letra-u', 'ltr'],
  ['letra-b', 'letra-b', 'ltr'],
  ['lema', 'lema', 'tag', true],
];

export function animatedLogo({
  variant = 'color',
  tagline = true,
  animate = true,
  halo = animate,
  label = 'Pyme Hub · Talento que impulsa tu negocio',
  className = '',
} = {}) {
  const claro = variant === 'claro';
  const stage = h('div', { class: 'brand-logo__stage' });

  if (halo) {
    stage.append(
      h('div', { class: 'brand-logo__halo', 'aria-hidden': 'true' },
        svg('svg', { viewBox: '0 0 100 100', focusable: 'false' },
          svg('circle', { class: 'brand-logo__orbit', cx: 50, cy: 50, r: 49.5 }),
          svg('circle', { class: 'brand-logo__scan', cx: 50, cy: 50, r: 49 }))),
      h('div', { class: 'brand-logo__pulse', 'aria-hidden': 'true' }));
  }

  for (const [file, cls, type, hasLight] of PIECES) {
    if (type === 'tag' && !tagline) continue;
    const src = `${BASE}${file}${claro && hasLight ? '-claro' : ''}.webp`;
    stage.append(h('img', {
      class: `brand-logo__pc brand-logo__pc--${type} brand-logo__pc--${cls}`,
      src,
      alt: '',
      decoding: 'async',
      draggable: 'false',
    }));
  }

  return h('div', {
    class: ['brand-logo', claro && 'brand-logo--claro', animate && 'brand-logo--animate', !tagline && 'brand-logo--sin-lema', className],
    role: 'img',
    'aria-label': label,
  }, stage);
}
