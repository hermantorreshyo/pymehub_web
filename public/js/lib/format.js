/**
 * Formatos y etiquetas en español (RNF-053). Los enumerados de la API se traducen aquí
 * para no repetir textos en las vistas.
 */
const LOCALE = 'es-ES';

export const LABELS = {
  perfil: { ADMIN: 'Administración', GERENTE: 'Gerencia', RRHH: 'RR. HH.', EMPLEADO: 'Empleado' },
  plan: { ENTRADA: 'Plan Entrada', COMPLETO: 'Plan Completo' },
  cicloCobro: { MENSUAL: 'Mensual', ANUAL: 'Anual' },
  estadoEmpresa: { PILOTO: 'Piloto', ACTIVO: 'Activa', SUSPENDIDO: 'Suspendida', BAJA: 'De baja' },
  puesto: {
    CONDUCTOR: 'Conductor',
    REPARTIDOR: 'Repartidor',
    MOZO_ALMACEN: 'Mozo de almacén',
    COORDINADOR: 'Coordinador',
    ADMINISTRATIVO: 'Administrativo',
    OTRO: 'Otro',
  },
  tipoContrato: { INDEFINIDO: 'Indefinido', TEMPORAL: 'Temporal', ETT: 'ETT' },
  turno: { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche', ROTATIVO: 'Rotativo' },
  motivoBaja: { VOLUNTARIA: 'Voluntaria', NO_VOLUNTARIA: 'No voluntaria', FIN_CONTRATO: 'Fin de contrato' },
  tipoIncidencia: {
    AUSENCIA_INJUSTIFICADA: 'Ausencia injustificada',
    RETRASO: 'Retraso',
    SINIESTRO: 'Siniestro',
    QUEJA_CLIENTE: 'Queja de cliente',
    RECONOCIMIENTO: 'Reconocimiento',
  },
  situacion: { ALTA: 'De alta', BAJA: 'De baja', TODAS: 'Todas' },
};

/** Estado de acceso: texto, tono e icono (nunca solo color, RNF-044). */
export const ESTADO_ACCESO = {
  SIN_ACCESO: { text: 'Sin acceso', tone: 'neutral', icon: 'minus' },
  INVITADO: { text: 'Invitado', tone: 'info', icon: 'mail' },
  ACTIVO: { text: 'Activo', tone: 'success', icon: 'circle-check' },
  BLOQUEADO: { text: 'Bloqueado', tone: 'danger', icon: 'lock' },
  BAJA: { text: 'De baja', tone: 'neutral', icon: 'log-out' },
};

/** Traduce un enumerado; si no se conoce, devuelve el valor tal cual. */
export function label(group, value) {
  if (value === null || value === undefined || value === '') return '—';
  return LABELS[group]?.[value] ?? String(value);
}

/** Convierte 'AAAA-MM-DD' (o con hora) en Date local sin desfase de zona horaria. */
export function parseDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(value));
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss] = m;
  if (hh !== undefined) {
    // Las marcas de tiempo de la API van en UTC
    return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, +(ss ?? 0)));
  }
  return new Date(+y, +mo - 1, +d);
}

export function formatDate(value, style = 'medium') {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  const options = style === 'long'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}

export function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** "Hoy, 3 de octubre de 2026" */
export function todayLong() {
  return `Hoy, ${new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`;
}

/** Fecha de hoy en formato 'AAAA-MM-DD' (hora local) para inputs de tipo date. */
export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Antigüedad legible: "3 semanas", "8 meses", "2 años". */
export function seniority(fromValue, toValue = null) {
  const from = parseDate(fromValue);
  const to = toValue ? parseDate(toValue) : new Date();
  if (!from || !to) return '—';
  const days = Math.max(0, Math.floor((to - from) / 86400000));
  if (days < 14) return days === 1 ? '1 día' : `${days} días`;
  if (days < 60) return `${Math.floor(days / 7)} semanas`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} meses`;
  const years = Math.floor(months / 12);
  return `${years} años`;
}

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(LOCALE, options).format(Number(value));
}

export function formatCurrency(value) {
  return formatNumber(value, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function fullName(person) {
  if (!person) return '—';
  return [person.nombre, person.apellidos].filter(Boolean).join(' ') || '—';
}

export function initials(person) {
  const parts = [person?.nombre, person?.apellidos].filter(Boolean).join(' ').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

/** Plural sencillo: plural(3, 'empleado', 'empleados') → "3 empleados". */
export function plural(n, one, many) {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}
