/**
 * Parámetros públicos de la plataforma (GET /v1/public/params): precios sin IVA, IVA, descuento
 * anual, días de prueba, titular y versión de los textos legales. Se piden una vez por carga.
 * Si la API no responde, se usan los valores por defecto para que la web nunca quede en blanco.
 */
import { publicApi } from '../services/api.js';
import { formatNumber } from './format.js';

export const DEFAULTS = {
  'titular.constituida': false,
  'titular.razon_social': '',
  'titular.nif': '',
  'titular.domicilio': '',
  'titular.registro_mercantil': '',
  'titular.email': 'info@hyo.company',
  'titular.telefono': '',
  'titular.email_privacidad': 'info@hyo.company',
  'precios.entrada_mes': 15,
  'precios.completo_mes': 29,
  'precios.iva_pct': 21,
  'precios.descuento_anual_pct': 0,
  'suscripcion.dias_prueba': 30,
  'operacion.dias_borrado_tras_baja': 30,
  'marketplace.comision_pct': 20,
  'marketplace.formacion_exenta_iva': false,
  'legal.version': '2026-10-17',
};

let pending = null;

export function loadParams() {
  pending ??= publicApi.params()
    .then((p) => ({ ...DEFAULTS, ...(p ?? {}) }))
    .catch(() => { pending = null; return { ...DEFAULTS }; });
  return pending;
}

/** 15 → «15 €»; 12,5 → «12,50 €». */
export function euros(n) {
  const v = Number(n) || 0;
  return `${formatNumber(v, { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })} €`;
}

/** Precio anual por empleado sin IVA, con el descuento anual parametrizado. */
export function annualPerEmployee(p, plan) {
  const mes = plan === 'COMPLETO' ? p['precios.completo_mes'] : p['precios.entrada_mes'];
  return Math.round(mes * 12 * (100 - (p['precios.descuento_anual_pct'] || 0))) / 100;
}

/** Texto del titular, o el aviso de que la sociedad aún no está constituida. */
export function holder(p) {
  return p['titular.constituida'] && p['titular.razon_social'] ? p['titular.razon_social'] : null;
}
