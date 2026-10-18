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
  'PH-PLAN-002': 'La suscripción ha vencido: puedes consultar y exportar, pero no hacer cambios hasta renovarla.',
  'PH-SKL-002': 'El formador todavía no puede cobrar online. Prueba más adelante.',
  'PH-SKL-003': 'Este curso ya está disponible para ti.',
  'PH-PAY-001': 'El pago online no está disponible ahora mismo. Escríbenos y te ayudamos a renovar.',
  'PH-PAY-002': 'No hemos podido conectar con la pasarela de pago. Inténtalo de nuevo en unos minutos.',
  'PH-PAY-003': 'Tu empresa ya tiene el pago online activo. Gestiona los cambios desde «Gestionar el pago».',
  'PH-PAY-004': 'Todavía no hay un pago online para tu empresa.',
  'PH-TENANT-001': 'No encontramos lo que buscas. Puede que ya no exista.',
  'PH-TENANT-002': 'Has llegado al límite de empleados de tu plan. Escríbenos y lo ampliamos.',
  'PH-TENANT-003': 'Para invitar a tu equipo falta registrar el contrato de encargado del tratamiento de la empresa.',
  'PH-TENANT-004': 'La cuenta de la empresa está dada de baja: puedes consultar los datos, pero no cambiarlos.',
  'PH-VAL-001': 'Revisa los datos marcados.',
  'PH-VAL-002': 'El archivo tiene filas con errores y no se ha importado ninguna.',
  'PH-RATE-001': 'Vas muy rápido. Espera un momento y vuelve a intentarlo.',
  'PH-WB-001': 'Todavía no hay respuestas suficientes para mostrar el bienestar del equipo sin identificar a nadie.',
  'PH-TRN-001': 'Este módulo no está en tu formación.',
  'PH-TRN-002': 'Ya estás inscrito en este módulo.',
  'PH-AI-001': 'El asistente no está disponible ahora mismo; te mostramos recomendaciones basadas en reglas.',
  'PH-AI-002': 'Has llegado al límite de consultas de hoy; te mostramos recomendaciones basadas en reglas.',
  'PH-AI-003': 'No hemos podido generar la respuesta; te mostramos recomendaciones basadas en reglas.',
  'PH-AI-004': 'Tu comentario incluye datos personales (como un email o el nombre de alguien). Quítalos y vuelve a enviarlo.',
  'PH-DEMO-001': 'Esta acción no está disponible en la demostración: los datos de ejemplo se restauran cada noche.',
  'PH-DEMO-002': 'La demostración no está disponible en este momento.',
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
let contactEmail = null;

export function configureApi({ apiUrl, contactEmail: email = null }) {
  baseUrl = String(apiUrl ?? '').replace(/\/+$/, '');
  contactEmail = typeof email === 'string' && email.includes('@') ? email : null;
}

/** Correo de contacto comercial de config.js (DMO-017), o null. */
export function commercialEmail() {
  return contactEmail;
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

/**
 * Descarga un archivo de la API (exportaciones): lo guarda con el nombre que envía el servidor.
 * Los errores llegan como ApiError, igual que en request().
 */
export async function download(path, fallbackName = 'pymehub.zip') {
  let response;
  try {
    response = await fetch(buildUrl(path), { credentials: 'include', cache: 'no-store', headers: { Accept: '*/*' } });
  } catch {
    throw new ApiError({ code: 'PH-NET-001' });
  }
  if (!response.ok) {
    const payload = await parseBody(response).catch(() => null);
    const e = payload?.error ?? {};
    throw new ApiError({ code: e.code ?? 'PH-SYS-001', message: e.message, status: response.status, details: e.details, correlationId: e.correlation_id });
  }
  const blob = await response.blob();
  const match = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') ?? '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] ?? fallbackName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return a.download;
}
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
  /** Uso del asesor de IA, sin contenido → { data, meta } */
  aiUsage: (signal) => get('/v1/admin/ai-usage', { days: 30 }, signal),
  updateTenant: (id, input) => data(request('PATCH', `/v1/admin/tenants/${encodeURIComponent(id)}`, { json: input })),
  /** Exportación completa de una empresa en ZIP (RF-110) */
  exportTenant: (id) => download(`/v1/admin/tenants/${encodeURIComponent(id)}/export`),
  /** Modo mantenimiento (RNF-063) → { activo, mensaje, programado } */
  maintenance: (signal) => data(get('/v1/admin/maintenance', {}, signal)),
  saveMaintenance: (input) => data(request('PUT', '/v1/admin/maintenance', { json: input })),
  /** Parámetros de la plataforma (fase 9a) */
  params: (signal) => data(get('/v1/admin/params', {}, signal)),
  saveParams: (input) => data(request('PUT', '/v1/admin/params', { json: input })),
  /** Errores 5xx agrupados (RNF-062) */
  errors: (hours, signal) => data(get('/v1/admin/errors', { hours }, signal)),
  /** Pagos de todas las empresas o de una (fase 9c) → { data, meta: { total, cobrado, stripe } } */
  payments: (tenant, signal) => get('/v1/admin/payments', tenant ? { tenant } : {}, signal),
  /** Vigencia: { accion: AMPLIAR|FIJAR|SIN_VENCIMIENTO, dias?, periodo_fin?, vigencia?, pago_manual?: { base, nota } } */
  setValidity: (id, input) => data(request('PUT', `/v1/admin/tenants/${encodeURIComponent(id)}/validity`, { json: input })),
  /** Pyme Hub Skills (fase 9d) */
  trainers: (signal) => get('/v1/admin/trainers', {}, signal),
  createTrainer: (input) => data(request('POST', '/v1/admin/trainers', { json: input })),
  skillsCourses: (estado, signal) => get('/v1/admin/skills/courses', estado ? { estado } : {}, signal),
  skillsCourse: (id, signal) => data(get(`/v1/admin/skills/courses/${encodeURIComponent(id)}`, {}, signal)),
  reviewCourse: (id, input) => data(request('POST', `/v1/admin/skills/courses/${encodeURIComponent(id)}/review`, { json: input })),
  skillsSales: (signal) => get('/v1/admin/skills/sales', {}, signal),
  /** Métricas del QR del folleto (DMO-035). query: { campaign, from, to } → { data, meta } */
  campaignMetrics: (query, signal) => get('/v1/admin/campaign-metrics', query, signal),
};

/* ---------- Público: demo comercial (REQ_QR_DEMO_COMERCIAL) ---------- */
export const publicApi = {
  /** ¿Está disponible la demostración? (DMO-037) → { enabled } */
  demoStatus: (signal) => data(get('/v1/public/demo-status', {}, signal)),
  /** Cuenta una visita de campaña, sin cookies ni datos personales (DMO-030) */
  visit: (input) => request('POST', '/v1/public/visits', { json: input, retry: false }),
  /** Parámetros públicos: precios sin IVA, IVA, descuento anual, titular y versión legal */
  params: (signal) => data(get('/v1/public/params', {}, signal)),
  /** Mantenimiento activo o programado en las próximas 48 h (RNF-063) */
  status: (signal) => data(get('/v1/public/status', {}, signal)),
};

/* ---------- Suscripción y pagos de la empresa (fases 9b y 9c, gerencia) ---------- */
export const billing = {
  /** Plan, vigencia, empleados e importes (base, IVA y total) por ciclo */
  subscription: (signal) => data(get('/v1/billing/subscription', {}, signal)),
  /** Facturas y pagos → { data, meta } */
  invoices: (signal) => get('/v1/billing/invoices', {}, signal),
  /** Sesión de Checkout de Stripe (modo prueba) → { url, importe, cobro_al_terminar_prueba } */
  checkout: (input) => data(request('POST', '/v1/billing/checkout', { json: input })),
  /** Portal del cliente de Stripe → { url } */
  portal: () => data(request('POST', '/v1/billing/portal', { json: {} })),
};

/* ---------- Pyme Hub Skills (fase 9d) ---------- */
export const skills = {
  /** Cursos aprobados con precios e importes por tipo de compra → { data, meta } */
  catalog: (signal) => get('/v1/skills/catalog', {}, signal),
  purchases: (signal) => get('/v1/skills/purchases', {}, signal),
  /** { modulo_id, acepta_condiciones, renuncia_desistimiento? } → { url, compra_id, importe } */
  purchase: (input) => data(request('POST', '/v1/skills/purchases', { json: input })),
  // Formador: sus cursos (mismo formato que los módulos de formación)
  myCourses: (signal) => get('/v1/skills/my-courses', {}, signal),
  module: (id, signal) => data(get(`/v1/skills/my-courses/${encodeURIComponent(id)}`, {}, signal)),
  createModule: (input) => data(request('POST', '/v1/skills/my-courses', { json: input })),
  updateModule: (id, input) => data(request('PATCH', `/v1/skills/my-courses/${encodeURIComponent(id)}`, { json: input })),
  publishModule: (id) => data(request('POST', `/v1/skills/my-courses/${encodeURIComponent(id)}/publish`, { json: {} })),
  listing: (id, input) => data(request('PUT', `/v1/skills/my-courses/${encodeURIComponent(id)}/listing`, { json: input })),
  submit: (id) => data(request('POST', `/v1/skills/my-courses/${encodeURIComponent(id)}/submit`, { json: {} })),
  sales: (signal) => get('/v1/skills/sales', {}, signal),
  connectStatus: (signal) => data(get('/v1/skills/connect', {}, signal)),
  connect: () => data(request('POST', '/v1/skills/connect', { json: {} })),
};

/* ---------- Portabilidad y derechos RGPD (LEG-017, §8.8) ---------- */
export const privacy = {
  /** ZIP con todos los datos de la empresa (gerencia) */
  exportCompany: () => download('/v1/company/export'),
  /** JSON con mis datos (acceso y portabilidad) */
  myData: () => download('/v1/me/data-export', 'mis-datos-pymehub.json'),
  /** Supresión de una persona ya dada de baja */
  erase: (id) => request('POST', `/v1/employees/${encodeURIComponent(id)}/erase`, { json: { confirmacion: 'SUPRIMIR' } }),
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

/* ---------- Bienestar (§8.6) ---------- */
export const wellbeing = {
  /** Check-in del día (RF-050). input: { animo, energia, estres, nota?, fecha? } → { checkin, actualizado, apoyo } */
  checkin: (input) => data(request('POST', '/v1/me/checkins', { json: input })),
  /** Historial propio → { data: [...], meta: { hoy, hecho_hoy, medias, racha } } (RF-052) */
  mine: (days = 30, signal) => get('/v1/me/checkins', { days }, signal),
  /** Agregado anónimo de la empresa o de un equipo (RF-053) → { data, meta } */
  summary: (query, signal) => get('/v1/wellbeing/summary', query, signal),
};

/* ---------- Alertas (§8.4) ---------- */
export const alerts = {
  /** query: { status: open|managed|dismissed|all, tipo, page, per_page } → { data, meta } */
  list: (query, signal) => get('/v1/alerts', query, signal),
  update: (id, input) => data(request('PATCH', `/v1/alerts/${encodeURIComponent(id)}`, { json: input })),
};

/* ---------- Formación · gestión (§8.5, GERENTE y RRHH) ---------- */
export const training = {
  /** Indicadores de la empresa → { data, meta } */
  summary: (signal) => get('/v1/training/summary', {}, signal),
  /** query: { category, level, status, puesto, q } → { data: [módulo + uso], meta } */
  modules: (query, signal) => get('/v1/training/modules', query, signal),
  module: (id, signal) => data(get(`/v1/training/modules/${encodeURIComponent(id)}`, {}, signal)),
  createModule: (input) => data(request('POST', '/v1/training/modules', { json: input })),
  updateModule: (id, input) => data(request('PATCH', `/v1/training/modules/${encodeURIComponent(id)}`, { json: input })),
  publishModule: (id) => data(request('POST', `/v1/training/modules/${encodeURIComponent(id)}/publish`, { json: {} })),
  /** query: { modulo_id, equipo_id, employee_id, estado, origen, q, page, per_page } → { data, meta } */
  assignments: (query, signal) => get('/v1/training/assignments', query, signal),
  /** input: { modulo_id, usuario_ids?, equipo_id?, fecha_limite? } (RF-042) */
  assign: (input) => data(request('POST', '/v1/training/assignments', { json: input })),
  unassign: (id) => request('DELETE', `/v1/training/assignments/${encodeURIComponent(id)}`),
  /** Recomendaciones por reglas (RF-043) → { data, meta } */
  recommendations: (query, signal) => get('/v1/training/recommendations', query, signal),
  /** Demanda formativa agregada de la plantilla (IA-021) → { data, meta } */
  demand: (signal) => get('/v1/training/demand', {}, signal),
};

/* ---------- Asesor de formación con IA (§8.7, empleado) ---------- */
export const advisor = {
  /** → { data: preferencias | null, meta: { opciones } } */
  preferences: (signal) => get('/v1/me/training/preferences', {}, signal),
  savePreferences: (input) => request('PUT', '/v1/me/training/preferences', { json: input }),
  deletePreferences: () => request('DELETE', '/v1/me/training/preferences'),
  /** → { data: { solicitud_id, servido_desde, generado_con_ia, recomendaciones, plan_semanal }, meta: { aviso? } } */
  ask: () => request('POST', '/v1/me/training/advisor', { json: {} }),
  feedback: (solicitudId, util) => data(request('POST', '/v1/me/training/advisor/feedback', { json: { solicitud_id: solicitudId, util } })),
  enroll: (moduloId, solicitudId) => data(request('POST', '/v1/me/training/enroll', { json: { modulo_id: moduloId, solicitud_id: solicitudId } })),
};

/* ---------- Formación · empleado ---------- */
export const myTraining = {
  /** → { data: asignaciones, meta: { pendientes, en_curso, completadas, vencidas, minutos_completados } } */
  list: (signal) => get('/v1/me/training', {}, signal),
  catalog: (query, signal) => get('/v1/me/training/catalog', query, signal),
  enroll: (moduloId) => data(request('POST', '/v1/me/training/enroll', { json: { modulo_id: moduloId } })),
  get: (id, signal) => get(`/v1/me/training/${encodeURIComponent(id)}`, {}, signal),
  progressPath: (id) => `/v1/me/training/${encodeURIComponent(id)}/progress`,
  submitPath: (id) => `/v1/me/training/${encodeURIComponent(id)}/submit`,
  progress: (id, input) => data(request('POST', `/v1/me/training/${encodeURIComponent(id)}/progress`, { json: input })),
  submit: (id, input) => data(request('POST', `/v1/me/training/${encodeURIComponent(id)}/submit`, { json: input })),
};

/* ---------- IA de RR. HH. (§9, GERENTE y RRHH) ---------- */
export const dashboard = {
  /** Indicadores de la empresa (RF-030). El bloque `riesgo` solo llega con el plan Completo → { data, meta } */
  overview: (signal) => get('/v1/dashboard/overview', {}, signal),
  /** Serie mensual: altas, bajas, rotación, ausencias y riesgo medio → { data, meta } */
  trends: (months, signal) => get('/v1/dashboard/trends', { months }, signal),
};

export const risk = {
  /** Ranking por puntuación (RF-031). query: { team_id, level, q } → { data, meta } */
  list: (query, signal) => get('/v1/risk', query, signal),
  /** Ficha de riesgo explicada (RF-034). Cada consulta queda auditada (LEG-004) → { data, meta } */
  employee: (id, signal) => get(`/v1/employees/${encodeURIComponent(id)}/risk`, {}, signal),
  /** Recálculo bajo demanda: una vez cada 10 minutos por empresa */
  recalculate: () => data(request('POST', '/v1/risk/recalculate', { json: {} })),
  methodology: (signal) => data(get('/v1/risk/methodology', {}, signal)),
  /** Revisión de sesgos por grupos (LEG-015) */
  bias: (signal) => data(get('/v1/risk/bias', {}, signal)),
};

/* ---------- Línea base de impacto (RF-037) ---------- */
export const baseline = {
  /** → { data: { linea_base, actual, comparacion }, meta: { sugerencia } } */
  get: (signal) => get('/v1/baseline', {}, signal),
  save: (input) => request('PUT', '/v1/baseline', { json: input }),
};
