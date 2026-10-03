# Changelog · pymehub_web

Formato basado en *Keep a Changelog*; versiones SemVer.

## [0.1.0] · 2026-10-03

### Añadido
- **Estructura** de `public/` según §4.3, servida tal cual por Apache; `.htaccess` con CSP (producción y `*.localhost`), cabeceras de seguridad y caché (SEC-004).
- **Tokens de diseño** únicos en `styles/tokens.css` (RNF-034); base y componentes en `globals.css`; AppShell y breakpoints mobile first en `responsive.css` (RNF-030, §13.3).
- **Kit de marca** provisional desde el PNG (`tools/generar_kit_marca.ps1`): logotipo, símbolo, favicons 16/32/48, iconos PWA 192/512 y *maskable*, `apple-touch-icon` (RF-064, P-13).
- **Sprite SVG** local con un subconjunto de Lucide (ISC), una sola familia (RNF-046).
- `services/api.js`: único acceso a la API con `credentials: 'include'`, `X-CSRF-Token` renovado ante PH-AUTH-003, traducción de códigos `PH-*` y eventos de sesión caducada y mantenimiento (RNF-032, RF-004).
- Enrutado por hash con vistas bajo demanda, menús según `perfil` y `features` (RNF-037) y foco en el título al navegar (RNF-045).
- Componentes: Button (3 variantes, 6 estados), Card, Badge (texto + icono, RNF-044), Avatar, Progress, Field, Table (tarjetas en móvil y tableta), Toast y `dataView()` con cargando, vacío, error con "Reintentar" y éxito (RNF-041).
- **Vistas**: acceso, activación por invitación con aviso de privacidad (RF-005, LEG-001), inicio de gestión, empleado y administración, Plantilla (listado con búsqueda, filtros y paginación; ficha con incidencias; alta de empleado, RF-021; equipos), Configuración (empresa y cuentas de gestión), "Más", vista informativa del plan Completo (RF-012) y estados "en preparación" para Bienestar, Formación, IA de RR. HH. y Check-in, sin cifras inventadas (§13.6).
- **PWA**: manifest (RF-060), service worker red primero con caché de lo abierto (RF-061), cola IndexedDB (RF-062) y banda "sin conexión" (RF-063).

### Cambiado
- Requisitos técnicos actualizados a v0.8; corregida la ruta del manual de maquetación en `CLAUDE.md`.

### Decisiones y pendientes
- Botón primario en `--primary-strong` (#15803D): el blanco sobre #22C55E da 2,3:1 y no cumple AA.
- Sidebar navy (propuesta de P-12). Marca en el sidebar con símbolo + texto hasta tener el SVG en negativo (P-13).
- Pendiente: acciones de ficha (editar, invitar, baja), incidencias, importación CSV y gestión de equipos y cuentas de RR. HH.; arranque sin conexión del empleado; módulos de las fases 4–7.
