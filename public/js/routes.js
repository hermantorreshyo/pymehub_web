/**
 * Tabla de rutas (navegación por hash). Las vistas se cargan bajo demanda.
 * Grupos: admin (ADMIN), gestion (GERENTE y RRHH), empleado (EMPLEADO).
 */
export const routes = [
  // Sin sesión
  { path: '/acceso', public: true, guestOnly: true, view: () => import('./views/public/login.js') },
  { path: '/invitacion/:token', public: true, guestOnly: true, view: () => import('./views/public/invitacion.js') },

  // Con sesión
  {
    path: '/inicio',
    views: {
      admin: () => import('./views/admin/inicio.js'),
      gestion: () => import('./views/management/inicio.js'),
      empleado: () => import('./views/employee/inicio.js'),
    },
  },
  { path: '/mas', view: () => import('./views/shared/mas.js') },

  // Plataforma
  { path: '/empresas', views: { admin: () => import('./views/admin/empresas.js') } },

  // Gestión
  { path: '/bienestar', feature: 'bienestar', views: { gestion: () => import('./views/management/bienestar.js') } },
  {
    path: '/formacion',
    feature: 'formacion',
    views: {
      gestion: () => import('./views/management/formacion.js'),
      empleado: () => import('./views/employee/formacion.js'),
    },
  },
  // Sin `feature`: en plan Entrada muestra la vista informativa del plan Completo (RF-012)
  { path: '/ia-rrhh', views: { gestion: () => import('./views/management/ia-rrhh.js') } },
  { path: '/plantilla', views: { gestion: () => import('./views/management/plantilla.js') } },
  { path: '/plantilla/nuevo', views: { gestion: () => import('./views/management/plantilla-nuevo.js') } },
  { path: '/plantilla/equipos', views: { gestion: () => import('./views/management/equipos.js') } },
  { path: '/plantilla/:id', views: { gestion: () => import('./views/management/plantilla-ficha.js') } },
  { path: '/configuracion', views: { gestion: () => import('./views/management/configuracion.js') } },

  // Empleado
  { path: '/checkin', feature: 'bienestar', views: { empleado: () => import('./views/employee/checkin.js') } },
];
