import { h } from '../../lib/dom.js';
import { ESTADO_ACCESO } from '../../lib/format.js';
import { icon } from './Icon.js';

/** Insignia con texto e icono; tone: neutral | success | warning | danger | info. */
export function badge(text, { tone = 'neutral', iconName = null } = {}) {
  return h('span', { class: ['badge', tone !== 'neutral' && `badge--${tone}`] },
    iconName ? icon(iconName, { size: 'sm' }) : null, text);
}

/** Estado de acceso de una cuenta. */
export function accessBadge(estado) {
  const e = ESTADO_ACCESO[estado] ?? { text: estado ?? '—', tone: 'neutral', icon: 'info' };
  return badge(e.text, { tone: e.tone, iconName: e.icon });
}

/**
 * Nivel de riesgo o de bienestar: nunca solo con color (RNF-044).
 * level: 'ALTO' | 'MEDIO' | 'BAJO'
 */
const NIVELES = {
  ALTO: { text: 'Alto', tone: 'danger', icon: 'triangle-alert' },
  MEDIO: { text: 'Medio', tone: 'warning', icon: 'circle-alert' },
  BAJO: { text: 'Bajo', tone: 'success', icon: 'circle-check' },
};

export function levelBadge(level) {
  const n = NIVELES[level] ?? { text: level ?? '—', tone: 'neutral', icon: 'info' };
  return badge(n.text, { tone: n.tone, iconName: n.icon });
}

/** Vigencia de la suscripción (fase 9b): nunca solo con color. */
const VIGENCIA = {
  PRUEBA: { text: 'Prueba gratuita', tone: 'info', icon: 'clock' },
  VIGENTE: { text: 'Vigente', tone: 'success', icon: 'circle-check' },
  GRACIA: { text: 'En periodo de gracia', tone: 'warning', icon: 'triangle-alert' },
  VENCIDA: { text: 'Vencida · solo lectura', tone: 'danger', icon: 'circle-alert' },
};

export function vigenciaBadge(estado) {
  const v = VIGENCIA[estado] ?? { text: estado ?? '—', tone: 'neutral', icon: 'info' };
  return badge(v.text, { tone: v.tone, iconName: v.icon });
}
