/**
 * Formación (§10): etiquetas, ilustraciones de marca por categoría, estados y la copia
 * local de los módulos abiertos para cursarlos sin conexión (RF-045, RF-061).
 */
import { h, svg } from './dom.js';
import { formatDate, parseDate } from './format.js';
import { badge } from '../components/ui/Badge.js';
import { icon } from '../components/ui/Icon.js';

export const CATEGORIAS = {
  CONDUCCION: { label: 'Conducción y seguridad vial', short: 'Conducción', icon: 'truck' },
  ALMACEN: { label: 'Almacén y carga', short: 'Almacén', icon: 'package' },
  CLIENTE: { label: 'Cliente y entrega', short: 'Cliente', icon: 'user-check' },
  BIENESTAR: { label: 'Bienestar', short: 'Bienestar', icon: 'heart' },
  DESARROLLO: { label: 'Desarrollo profesional', short: 'Desarrollo', icon: 'trending-up' },
};

export const NIVELES = { BASICO: 'Básico', INTERMEDIO: 'Intermedio', AVANZADO: 'Avanzado' };

/** Estado de una formación: texto, tono e icono (nunca solo color, RNF-044). */
export const ESTADOS = {
  PENDIENTE: { text: 'Pendiente', tone: 'neutral', icon: 'circle' },
  EN_CURSO: { text: 'En curso', tone: 'info', icon: 'circle-dot' },
  COMPLETADA: { text: 'Completada', tone: 'success', icon: 'circle-check' },
  VENCIDA: { text: 'Vencida', tone: 'danger', icon: 'triangle-alert' },
};

export const ORIGENES = { GESTION: 'Asignada por tu empresa', AUTOINSCRIPCION: 'Por tu cuenta', ASESOR_IA: 'Recomendada por el asesor' };
export const ORIGENES_GESTION = { GESTION: 'Asignada', AUTOINSCRIPCION: 'Autoinscripción', ASESOR_IA: 'Asesor de IA' };

export const REGLAS = {
  SINIESTRO: { text: 'Siniestro reciente', icon: 'triangle-alert' },
  QUEJA_CLIENTE: { text: 'Queja de cliente', icon: 'message-square' },
  BIENESTAR_EQUIPO: { text: 'Alerta de bienestar del equipo', icon: 'heart' },
  ACOGIDA: { text: 'Acogida', icon: 'user-plus' },
};

export const APROBADO = 70;

export function stateBadge(estado) {
  const e = ESTADOS[estado] ?? { text: estado ?? '—', tone: 'neutral', icon: 'info' };
  return badge(e.text, { tone: e.tone, iconName: e.icon });
}

export function categoryBadge(categoria) {
  const c = CATEGORIAS[categoria] ?? { short: categoria, icon: 'book-open' };
  return h('span', { class: ['cat-chip', `cat-chip--${String(categoria).toLowerCase()}`] }, icon(c.icon, { size: 'sm' }), c.short);
}

/** "Vence el 19 oct" / "Venció hace 3 días" / "Sin fecha límite". */
export function deadlineText(a, hoy = null) {
  if (!a.fecha_limite) return a.origen === 'GESTION' ? 'Sin fecha límite' : 'A tu ritmo';
  if (a.estado === 'COMPLETADA') return `Fecha límite: ${formatDate(a.fecha_limite, 'short')}`;
  const today = parseDate(hoy ?? new Date().toISOString().slice(0, 10));
  const limit = parseDate(a.fecha_limite);
  const days = Math.round((limit - today) / 86400000);
  if (days < 0) return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 7) return `Vence en ${days} días`;
  return `Vence el ${formatDate(a.fecha_limite, 'short')}`;
}

/** Minutos en texto: "4 min". */
export function minutes(n) {
  return `${n} min`;
}

/**
 * Ilustración de marca por categoría: composición local (degradado, retícula, formas y el
 * icono de la categoría). Sustituye a las fotos de stock de los mockups (RNF-048, §13.6).
 */
export function moduleArt(categoria, { alt = null, size = 'md', className = '' } = {}) {
  const c = CATEGORIAS[categoria] ?? { icon: 'book-open' };
  const shapes = svg('svg', { class: 'module-art__shapes', viewBox: '0 0 200 120', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid slice' },
    svg('circle', { cx: 168, cy: 18, r: 46, class: 'module-art__blob module-art__blob--a' }),
    svg('circle', { cx: 22, cy: 112, r: 34, class: 'module-art__blob module-art__blob--b' }),
    svg('path', { d: 'M0 86 C 50 62, 92 104, 140 80 S 200 70, 200 70', class: 'module-art__wave' }),
    svg('circle', { cx: 132, cy: 92, r: 5, class: 'module-art__dot' }),
    svg('circle', { cx: 52, cy: 28, r: 4, class: 'module-art__dot' }));
  return h('div', {
    class: ['module-art', `module-art--${String(categoria).toLowerCase()}`, `module-art--${size}`, className],
    role: alt ? 'img' : null,
    'aria-label': alt,
    'aria-hidden': alt ? null : 'true',
  }, shapes, h('span', { class: 'module-art__icon' }, icon(c.icon)));
}

/* ---------- Copia local para cursar sin conexión (RF-045) ----------
 * Solo contenido formativo y el estado de la propia formación; ningún dato de otras personas.
 * Se borra al cerrar sesión (store.js).
 */
const PREFIX = 'pymehub-formacion:';

export const trainingCache = {
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* sin almacenamiento: solo funcionará con conexión */ }
  },
  clear() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
    } catch { /* nada que borrar */ }
  },
};
