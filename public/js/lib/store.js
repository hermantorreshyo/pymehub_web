/**
 * Estado de la sesión en memoria: respuesta de GET /v1/auth/me (RF-011).
 * No se guarda nada en localStorage: la sesión vive en la cookie HttpOnly de la API (DEC-06).
 */
const listeners = new Set();
let me = null;

/** Grupo de experiencia según el perfil (RNF-031). */
const GRUPOS = { ADMIN: 'admin', GERENTE: 'gestion', RRHH: 'gestion', EMPLEADO: 'empleado' };

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

  set(value) {
    me = value ?? null;
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
