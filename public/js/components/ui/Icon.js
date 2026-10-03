import { svg } from '../../lib/dom.js';

const SPRITE = 'assets/icons/sprite.svg';

/**
 * Icono del sprite local (RNF-046). Decorativo por defecto (aria-hidden);
 * con `label` pasa a ser informativo.
 */
export function icon(name, { label = null, size = null, className = '' } = {}) {
  const el = svg('svg', {
    class: ['icon', size ? `icon--${size}` : '', className].filter(Boolean).join(' '),
    viewBox: '0 0 24 24',
    focusable: 'false',
    'aria-hidden': label ? null : 'true',
    role: label ? 'img' : null,
    'aria-label': label,
  }, svg('use', { href: `${SPRITE}#${name}` }));
  return el;
}
