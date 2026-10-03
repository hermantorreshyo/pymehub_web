import { tabs } from '../../components/layout/Page.js';

/** Subsecciones de Plantilla (§13.6: empleados, equipos e incidencias). */
export function plantillaTabs(active) {
  return tabs('Secciones de la plantilla', [
    { id: 'empleados', label: 'Empleados', href: '#/plantilla', iconName: 'users' },
    { id: 'equipos', label: 'Equipos', href: '#/plantilla/equipos', iconName: 'map-pin' },
  ], active);
}
