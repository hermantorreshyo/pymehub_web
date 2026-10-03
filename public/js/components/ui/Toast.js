import { h } from '../../lib/dom.js';
import { icon } from './Icon.js';

let region = null;

function getRegion() {
  if (!region || !region.isConnected) {
    region = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  return region;
}

/** Aviso breve que se anuncia a lectores de pantalla; tone: success | error | info. */
export function toast(message, { tone = 'success', duration = 5000 } = {}) {
  const icons = { success: 'circle-check', error: 'circle-alert', info: 'info' };
  const el = h('div', { class: ['toast', `toast--${tone}`] }, icon(icons[tone] ?? 'info'), h('span', { text: message }));
  getRegion().append(el);
  setTimeout(() => el.remove(), duration);
}
