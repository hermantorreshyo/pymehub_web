/**
 * Vocabulario del módulo de Bienestar (§11): escalas del check-in, niveles del índice y
 * formato de semanas. Compartido por la vista del empleado y la de gestión.
 */
import { badge } from '../components/ui/Badge.js';

/** Tres escalas 1–5 (RF-050). En estrés, 5 es "mucho" (peor). */
export const SCALES = [
  {
    name: 'animo',
    question: '¿Qué tal tu ánimo hoy?',
    short: 'Ánimo',
    options: [
      { value: 1, label: 'Muy bajo', icon: 'frown' },
      { value: 2, label: 'Bajo', icon: 'annoyed' },
      { value: 3, label: 'Normal', icon: 'meh' },
      { value: 4, label: 'Bien', icon: 'smile' },
      { value: 5, label: 'Muy bien', icon: 'laugh' },
    ],
  },
  {
    name: 'energia',
    question: '¿Cuánta energía tienes?',
    short: 'Energía',
    options: [
      { value: 1, label: 'Agotado', icon: 'battery-warning' },
      { value: 2, label: 'Poca', icon: 'battery-low' },
      { value: 3, label: 'Normal', icon: 'battery-medium' },
      { value: 4, label: 'Bastante', icon: 'battery-full' },
      { value: 5, label: 'A tope', icon: 'zap' },
    ],
  },
  {
    name: 'estres',
    question: '¿Cuánto estrés notas?',
    short: 'Estrés',
    inverse: true,
    options: [
      { value: 1, label: 'Nada', icon: 'leaf' },
      { value: 2, label: 'Poco', icon: 'smile' },
      { value: 3, label: 'Algo', icon: 'meh' },
      { value: 4, label: 'Bastante', icon: 'annoyed' },
      { value: 5, label: 'Mucho', icon: 'frown' },
    ],
  },
];

/** Tono visual de una respuesta: 1 = peor … 5 = mejor (en estrés se invierte). */
export function tone(scale, value) {
  const v = scale.inverse ? 6 - value : value;
  return v <= 2 ? 'low' : v === 3 ? 'mid' : 'high';
}

export function optionLabel(scaleName, value) {
  const s = SCALES.find((x) => x.name === scaleName);
  return s?.options.find((o) => o.value === value)?.label ?? String(value);
}

/** Nivel del índice de bienestar 0–100 (API: BUENO ≥ 65, ATENCION 45–64, BAJO < 45). */
const LEVELS = {
  BUENO: { text: 'Bueno', tone: 'success', icon: 'circle-check' },
  ATENCION: { text: 'Atención', tone: 'warning', icon: 'circle-alert' },
  BAJO: { text: 'Bajo', tone: 'danger', icon: 'triangle-alert' },
};

export function levelOf(indice) {
  if (indice === null || indice === undefined) return null;
  return indice >= 65 ? 'BUENO' : indice >= 45 ? 'ATENCION' : 'BAJO';
}

/** El bienestar nunca se comunica solo con color: texto e icono (RNF-044). */
export function wellbeingBadge(level) {
  const l = LEVELS[level];
  return l ? badge(l.text, { tone: l.tone, iconName: l.icon }) : badge('Sin datos', { iconName: 'lock' });
}

const SHORT = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

/** '2026-10-05' → '5 oct.' */
export function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return SHORT.format(new Date(y, m - 1, d));
}

/** Etiqueta de semana: 'Sem. 5 oct.' */
export function weekLabel(iso) {
  return `Sem. ${shortDate(iso)}`;
}

/** Número con coma decimal. */
export function dec(v) {
  return v === null || v === undefined ? '—' : String(v).replace('.', ',');
}
