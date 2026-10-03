/**
 * Único punto de acceso a la API de Pyme Hub (RNF-032, contrato docs/openapi.yaml de pymehub_api).
 *
 * - credentials: 'include' para la cookie de sesión HttpOnly (DEC-06).
 * - X-CSRF-Token en toda petición que modifica datos (RF-004, SEC-002); el token llega
 *   en /v1/auth/me y /v1/auth/login. Si la API lo rechaza (PH-AUTH-003) se renueva una vez.
 * - Respuestas de éxito: { data, meta? }. Errores: { error: { code, message, details, correlation_id } }.
 * - Los códigos PH-* se traducen a mensajes claros con la voz de la marca.
 *
 * Eventos en window:
 *   'ph:sesion-caducada'  PH-AUTH-002 con una sesión que estaba abierta
 *   'ph:mantenimiento'    PH-SYS-003
 */

/** Mensajes para el usuario por código (§16 de los requisitos). */
const MESSAGES = {
  'PH-AUTH-001': 'El email o la contraseña no son correctos.',
  'PH-AUTH-002': 'Tu sesión ha caducado. Vuelve a entrar para continuar.',
  'PH-AUTH-003': 'No hemos podido verificar la petición. Recarga la página e inténtalo de nuevo.',
  'PH-AUTH-004': 'Has superado el número de intentos. Espera 15 minutos y vuelve a probar.',
  'PH-AUTH-005': 'Esta invitación ha caducado o ya se ha usado. Pide un enlace nuevo a tu empresa.',
  'PH-PERM-001': 'Tu perfil no permite hacer esta acción.',
  'PH-PLAN-001': 'Esta funcionalidad forma parte del plan Completo.',
  'PH-TENANT-001': 'No encontramos lo que buscas. Puede que ya no exista.',
  'PH-TENANT-002': 'Has llegado al límite de empleados de tu plan. Escríbenos y lo ampliamos.',
  'PH-TENANT-003': 'Para invitar a tu equipo falta registrar el contrato de encargado del tratamiento de la empresa.',
  'PH-TENANT-004': 'La cuenta de la empresa está dada de baja: puedes consultar los datos, pero no cambiarlos.',
  'PH-VAL-001': 'Revisa los datos marcados.',
  'PH-VAL-002': 'El archivo tiene filas con errores y no se ha importado ninguna.',
  'PH-RATE-001': 'Vas muy rápido. Espera un momento y vuelve a intentarlo.',
  'PH-WB-001': 'Todavía no hay respuestas suficientes para mostrar el bienestar del equipo sin identificar a nadie.',
  'PH-TRN-001': 'Este módulo no está asignado a esta persona.',
  'PH-TRN-002': 'Ya estás inscrito en este módulo.',
  'PH-AI-001': 'El asistente no está disponible ahora mismo; te mostramos recomendaciones basadas en reglas.',
  'PH-AI-002': 'Has llegado al límite de consultas de hoy; te mostramos recomendaciones basadas en reglas.',
  'PH-AI-003': 'No hemos podido generar la respuesta; te mostramos recomendaciones basadas en reglas.',
  'PH-AI-004': 'Tu comentario incluye datos personales (como un email o el nombre de alguien). Quítalos y vuelve a enviarlo.',
  'PH-SYS-001': 'Algo ha fallado por nuestra parte. Inténtalo de nuevo en unos minutos.',
  'PH-SYS-002': 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
  'PH-SYS-003': 'Pyme Hub está en mantenimiento programado. Volvemos enseguida.',
  // Códigos propios del frontend (no los devuelve la API)
  'PH-NET-001': 'No hay conexión con Pyme Hub. Comprueba tu conexión e inténtalo de nuevo.',
  'PH-NET-002': 'La respuesta del servidor no es válida. Inténtalo de nuevo en unos minutos.',
};

/** En estos códigos el mensaje de la API es más concreto que el genérico (p. ej. "Ese email ya tiene una cuenta"). */
const PREFER_API_MESSAGE = new Set(['PH-VAL-001']);

export class ApiError extends Error {
  constructor({ code, message, status = 0, details = {}, correlationId = null }) {
    super(MESSAGES[code] && !(PREFER_API_MESSAGE.has(code) && message) ? MESSAGES[code] : (message || MESSAGES['PH-SYS-001']));
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details ?? {};
    this.correlationId = correlationId;
    this.apiMessage = message;
  }

  /** Errores por campo de PH-VAL-001: { campo: 'motivo' } */
  get fieldErrors() {
    const d = this.details;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return {};
    return Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === 'string'));
  }
}

export function messageFor(code) {
  return MESSAGES[code] ?? MESSAGES['PH-SYS-001'];
}

let baseUrl = '';
let csrfToken = null;
let hadSession = false;

export function configureApi({ apiUrl }) {
  baseUrl = String(apiUrl ?? '').replace(/\/+$/, '');
}

function buildUrl(path, query) {
  const url = new URL(baseUrl + path, location.href);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError({ code: 'PH-NET-002', status: response.status, correlationId: response.headers.get('X-Correlation-Id') });
  }
}

/**
 * Petición genérica. Devuelve el cuerpo completo ({ data, meta }) o null en 204.
 * opts: { query, json, csv, signal, retry }
 */
export async function request(method, path, opts = {}) {
  const { query, json, csv, signal, retry = true } = opts;
  const headers = { Accept: 'application/json' };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (csv !== undefined) {
    headers['Content-Type'] = 'text/csv; charset=utf-8';
    body = csv;
  }
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body,
      signal,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError({ code: 'PH-NET-001' });
  }

  const payload = await parseBody(response);
  if (response.ok) return payload;

  const e = payload?.error ?? {};
  const error = new ApiError({
    code: e.code ?? (response.status >= 500 ? 'PH-SYS-001' : 'PH-NET-002'),
    message: e.message,
    status: response.status,
    details: e.details,
    correlationId: e.correlation_id ?? response.headers.get('X-Correlation-Id'),
  });

  if (error.code === 'PH-AUTH-003' && retry && method !== 'GET') {
    await auth.me();
    return request(method, path, { ...opts, retry: false });
  }
  if (error.code === 'PH-AUTH-002' && hadSession) {
    hadSession = false;
    csrfToken = null;
    window.dispatchEvent(new CustomEvent('ph:sesion-caducada'));
  }
  if (error.code === 'PH-SYS-003') {
    window.dispatchEvent(new CustomEvent('ph:mantenimiento', { detail: error }));
  }
  throw error;
}

const get = async (path, query, signal) => request('GET', path, { query, signal });
const data = async (promise) => (await promise)?.data ?? null;

function rememberSession(me) {
  csrfToken = me?.csrf_token ?? null;
  hadSession = Boolean(me);
  return me;
}

/* ---------- Autenticación (§8.1) ---------- */
export const auth = {
  async me() {
    return rememberSession(await data(get('/v1/auth/me')));
  },
  async login(email, password) {
    return rememberSession(await data(request('POST', '/v1/auth/login', { json: { email, password } })));
  },
  async logout() {
    try {
      await request('POST', '/v1/auth/logout');
    } finally {
      rememberSession(null);
    }
  },
  acceptInvitation(token, password, aceptaPrivacidad) {
    return data(request('POST', '/v1/auth/invitations/accept', {
      json: { token, password, acepta_privacidad: aceptaPrivacidad },
    }));
  },
};

/* ---------- Plataforma (§8.2, perfil ADMIN) ---------- */
export const admin = {
  tenants: (signal) => get('/v1/admin/tenants', {}, signal),
  tenant: (id, signal) => data(get(`/v1/admin/tenants/${encodeURIComponent(id)}`, {}, signal)),
  metrics: (signal) => data(get('/v1/admin/metrics', {}, signal)),
};

export const health = () => data(get('/v1/health'));

/* ---------- Organización (§8.3) ---------- */
export const users = {
  list: (signal) => get('/v1/users', {}, signal),
};

export const teams = {
  list: (signal) => data(get('/v1/teams', {}, signal)),
  create: (input) => data(request('POST', '/v1/teams', { json: input })),
  update: (id, input) => data(request('PATCH', `/v1/teams/${encodeURIComponent(id)}`, { json: input })),
  remove: (id) => request('DELETE', `/v1/teams/${encodeURIComponent(id)}`),
};

export const employees = {
  /** query: { situacion, equipo_id, q, page, per_page } → { data, meta } */
  list: (query, signal) => get('/v1/employees', query, signal),
  get: (id, signal) => data(get(`/v1/employees/${encodeURIComponent(id)}`, {}, signal)),
  create: (input) => data(request('POST', '/v1/employees', { json: input })),
  update: (id, input) => data(request('PATCH', `/v1/employees/${encodeURIComponent(id)}`, { json: input })),
  terminate: (id, input) => data(request('DELETE', `/v1/employees/${encodeURIComponent(id)}`, { json: input })),
  invite: (id, email) => data(request('POST', `/v1/employees/${encodeURIComponent(id)}/invitation`, { json: email ? { email } : {} })),
  importCsv: (csvText, simulate = false) => data(request('POST', '/v1/employees/import', {
    csv: csvText,
    query: simulate ? { simular: 1 } : {},
  })),
  incidents: (id, query, signal) => get(`/v1/employees/${encodeURIComponent(id)}/incidents`, query, signal),
  addIncident: (id, input) => data(request('POST', `/v1/employees/${encodeURIComponent(id)}/incidents`, { json: input })),
};
