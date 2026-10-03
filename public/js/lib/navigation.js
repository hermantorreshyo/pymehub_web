/**
 * Menús según el perfil y las funcionalidades del plan (RNF-037, §13.6).
 * Ocultar un menú es comodidad: la API rechaza igualmente lo no permitido (RF-010).
 */
import { session } from './store.js';

const MAS = { id: 'mas', label: 'Más', path: '/mas', icon: 'ellipsis' };

function gestion() {
  return [
    { id: 'inicio', label: 'Inicio', path: '/inicio', icon: 'house' },
    session.hasFeature('bienestar') && { id: 'bienestar', label: 'Bienestar', path: '/bienestar', icon: 'heart' },
    session.hasFeature('formacion') && { id: 'formacion', label: 'Formación', path: '/formacion', icon: 'graduation-cap' },
    // En plan Entrada se muestra como vista informativa del plan Completo (RF-012)
    {
      id: 'ia-rrhh',
      label: 'IA de RR. HH.',
      path: '/ia-rrhh',
      icon: 'sparkles',
      badge: session.hasFeature('riesgo_rotacion') ? null : 'Completo',
    },
    { id: 'plantilla', label: 'Plantilla', path: '/plantilla', icon: 'users' },
    { id: 'configuracion', label: 'Configuración', path: '/configuracion', icon: 'settings' },
  ].filter(Boolean);
}

function empleado() {
  return [
    { id: 'inicio', label: 'Inicio', path: '/inicio', icon: 'house' },
    session.hasFeature('bienestar') && { id: 'checkin', label: 'Check-in', path: '/checkin', icon: 'smile' },
    session.hasFeature('formacion') && { id: 'formacion', label: 'Formación', path: '/formacion', icon: 'graduation-cap' },
  ].filter(Boolean);
}

function admin() {
  return [
    { id: 'inicio', label: 'Resumen', path: '/inicio', icon: 'chart-line' },
    { id: 'empresas', label: 'Empresas', path: '/empresas', icon: 'building' },
  ];
}

/** Menú principal completo (sidebar y pantalla "Más"). */
export function navItems() {
  switch (session.grupo) {
    case 'gestion': return gestion();
    case 'empleado': return empleado();
    case 'admin': return admin();
    default: return [];
  }
}

/** Navegación inferior: hasta tres accesos y "Más" (Manual §7). */
export function bottomItems() {
  const items = navItems();
  const prefer = {
    gestion: ['inicio', 'plantilla', 'bienestar'],
    empleado: ['inicio', 'checkin', 'formacion'],
    admin: ['inicio', 'empresas'],
  }[session.grupo] ?? [];
  const chosen = prefer.map((id) => items.find((i) => i.id === id)).filter(Boolean);
  return [...chosen, MAS];
}

/** ¿Está activa esta entrada para la ruta actual? */
export function isActive(item, path) {
  return path === item.path || path.startsWith(`${item.path}/`);
}
