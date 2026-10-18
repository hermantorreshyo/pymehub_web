/**
 * Estado de la sesión en memoria: respuesta de GET /v1/auth/me (RF-011).
 * La sesión vive en la cookie HttpOnly de la API (DEC-06): aquí no se guarda ningún token.
 * Para poder abrir la app sin cobertura (RF-062) se recuerda en el dispositivo una copia
 * mínima del perfil (nombre, perfil, plan y funcionalidades), sin email ni token CSRF,
 * y los módulos de formación abiertos (lib/training.js); todo se borra al cerrar la sesión.
 */
import { trainingCache } from './training.js';

const OFFLINE_KEY = 'pymehub-perfil';

function remember(value) {
  try {
    if (!value) { localStorage.removeItem(OFFLINE_KEY); trainingCache.clear(); return; }
    if (value.offline) return;
    const minimal = {
      usuario: { id: value.usuario?.id, nombre: value.usuario?.nombre, apellidos: value.usuario?.apellidos, perfil: value.usuario?.perfil },
      interlocutor: { id: value.interlocutor?.id, tipo: value.interlocutor?.tipo, nombre: value.interlocutor?.nombre },
      plan: value.plan ?? null,
      features: value.features ?? [],
    };
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(minimal));
  } catch { /* almacenamiento no disponible: la app sigue funcionando con conexión */ }
}
const listeners = new Set();
let me = null;

/** Grupo de experiencia según el perfil (RNF-031). */
const GRUPOS = { ADMIN: 'admin', GERENTE: 'gestion', RRHH: 'gestion', EMPLEADO: 'empleado', FORMADOR: 'formador' };

export const session = {
  get me() {
    return me;
  },

  get isAuthenticated() {
    return me !== null;
  },

  get perfil() {
    return me?.usuario?.perfil ?? null;
  },

  /** 'admin' | 'gestion' | 'empleado' | null */
  get grupo() {
    return GRUPOS[me?.usuario?.perfil] ?? null;
  },

  get plan() {
    return me?.plan ?? null;
  },

  /** Comodidad para construir menús; el control real lo hace la API (RF-010). */
  hasFeature(feature) {
    return Array.isArray(me?.features) && me.features.includes(feature);
  },

  /** Copia mínima del último perfil, para arrancar sin conexión. */
  cached() {
    try {
      const raw = localStorage.getItem(OFFLINE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** true si la sesión se ha restaurado sin conexión (aún no verificada con la API). */
  get offline() {
    return Boolean(me?.offline);
  },

  set(value) {
    me = value ?? null;
    remember(me);
    listeners.forEach((fn) => fn(me));
  },

  clear() {
    this.set(null);
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
