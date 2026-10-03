/**
 * Enrutado por hash (#/ruta). Cada ruta declara quién puede verla y qué vista
 * carga para cada grupo de perfil; las vistas se importan bajo demanda, así el
 * service worker solo cachea los módulos que se han abierto (RF-061).
 *
 * Ruta: {
 *   path: '/plantilla/:id',
 *   public: true,                      // accesible sin sesión (login, invitación)
 *   guestOnly: true,                   // con sesión redirige a /inicio
 *   views: { gestion: () => import(...), empleado: ..., admin: ... },
 *   view: () => import(...),           // misma vista para todos
 *   feature: 'bienestar',              // funcionalidad del plan necesaria (RNF-037)
 *   perfiles: ['GERENTE'],             // perfiles concretos dentro del grupo
 * }
 *
 * Una vista exporta por defecto: (ctx) => { title, node } | Promise<{ title, node }>
 * ctx = { params, query, route, navigate }
 */
import { session } from './store.js';

let routes = [];
let render = () => {};
let current = null;

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = '/' + pathPart.replace(/^\/+|\/+$/g, '');
  return { path, query: Object.fromEntries(new URLSearchParams(queryPart)) };
}

function compile(path) {
  const keys = [];
  const pattern = path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${pattern}$`), keys };
}

function match(path) {
  for (const route of routes) {
    const m = route._compiled.regex.exec(path);
    if (m) {
      const params = {};
      route._compiled.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

/** Construye un hash con consulta: href('/plantilla', { q: 'ana' }) → '#/plantilla?q=ana' */
export function href(path, query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ).toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export function navigate(path, query = {}, { replace = false } = {}) {
  const target = href(path, query);
  if (replace) {
    history.replaceState(null, '', target);
    resolve();
  } else if (location.hash === target) {
    resolve();
  } else {
    location.hash = target;
  }
}

/** Actualiza la consulta del hash sin volver a renderizar (filtros de un listado). */
export function updateQuery(query) {
  const { path } = parseHash();
  history.replaceState(null, '', href(path, query));
}

export function currentPath() {
  return parseHash().path;
}

/**
 * Decide qué hacer con una ruta: { redirect } o { loader, route, params, query } o { denied }.
 */
function decide({ path, query }) {
  const found = match(path);
  if (!found) return { notFound: true, path, query };
  const { route, params } = found;

  if (!session.isAuthenticated) {
    if (route.public) return { route, params, query, loader: route.view };
    return { redirect: '/acceso', query: { volver: path === '/' ? '' : path } };
  }
  if (route.guestOnly) return { redirect: '/inicio' };

  const loader = route.view ?? route.views?.[session.grupo];
  if (!loader) return { denied: 'perfil', route, params, query };
  if (route.perfiles && !route.perfiles.includes(session.perfil)) return { denied: 'perfil', route, params, query };
  if (route.feature && !session.hasFeature(route.feature)) {
    return { denied: 'plan', route, params, query };
  }
  return { route, params, query, loader };
}

export async function resolve() {
  const parsed = parseHash();
  const decision = decide(parsed);
  if (decision.redirect) {
    navigate(decision.redirect, decision.query ?? {}, { replace: true });
    return;
  }
  const token = Symbol('render');
  current = token;
  await render({ ...decision, isCurrent: () => current === token });
}

export function startRouter(routeTable, renderFn) {
  routes = routeTable.map((r) => ({ ...r, _compiled: compile(r.path) }));
  render = renderFn;
  window.addEventListener('hashchange', resolve);
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    history.replaceState(null, '', session.isAuthenticated ? '#/inicio' : '#/acceso');
  }
  return resolve();
}
