# Changelog · pymehub_web

Formato basado en *Keep a Changelog*; versiones SemVer.

## [0.2.0] · 2026-10-11

### Añadido
- **Sitio web público** (`#/`, `views/public/sitio.js`): primera pantalla de `pymehub.hermantorres.com` con la línea de la landing "Muy pronto": logotipo animado, consola de módulos rotativa, cómo funciona, módulos del MVP, privacidad, planes Entrada y Completo (§6.2) y botón **Acceso usuarios** en la cabecera, el hero, la llamada final y el pie. No llama a la API ni muestra cifras sin respaldo (§13.6). Con sesión abierta, el botón pasa a "Ir a mi panel".
- **Logotipo animado** (`components/brand/AnimatedLogo.js`): se arma con las piezas exactas del logotipo (núcleo, anillo con barrido, personas que "respiran", letras con destello y lema), con halo y pulso. Variante clara para fondos navy, solo para "Pyme" y el lema (P-13). Piezas en `assets/brand/logo-anim/` (WebP).
- **Fondo de marca** (`components/brand/BrandBackground.js`): retícula de plano en movimiento y manchas verde y azul, en versión arena y navy.
- `styles/brand.css`: lenguaje visual y de movimiento (entradas escalonadas, punto "vivo", barra indeterminada, chips, texto con degradado, aparición al hacer scroll) con `prefers-reduced-motion` (RNF-047).
- Tokens de marca y movimiento en `tokens.css` (degradados, retícula, manchas, navy profundo, duraciones y curvas) (RNF-034).
- Iconos Lucide nuevos en el sprite: `shield-check`, `truck`, `smartphone`, `log-in`, `leaf`, `trending-up`, `check`, `target`, `wifi` (RNF-046).
- **Documentación**: `docs/PROMPT_MAESTRO.md`, índice `docs/README.md`, mockups de la aplicación en WebP (`docs/diseno/mockups/`), landing de referencia (`docs/diseno/referencias/`) y anexo del prototipo de interfaz (`docs/anexos/`).

### Cambiado
- **Acceso en pantalla partida** (mockup 01, adaptado): panel de marca navy con el logotipo animado, el lema y los tres módulos; formulario sobre fondo arena con retícula. En móvil, el panel se reduce a una cabecera compacta. Sin fotografías de stock (RNF-048) ni acceso con Google (fuera del alcance).
- Acceso: ayuda "¿Has olvidado tu contraseña?" (enlace nuevo de la empresa, RF-007) y nota para quien aún no tiene cuenta. La activación por invitación usa el mismo diseño.
- **Pantalla de arranque** con el símbolo, ondas de halo y la barra indeterminada de marca.
- **Navegación**: sin hash se muestra el sitio público (antes redirigía al acceso); la PWA instalada sigue arrancando en `#/inicio`. El sitio se muestra aunque la API no responda.
- Las vistas de la aplicación entran con una transición sutil y los KPI y tarjetas del panel aparecen escalonados; la carga de sección muestra la barra de marca sobre el esqueleto.
- El título que recibe el foco al navegar (RNF-045) ya no dibuja el recuadro de foco: no es un control.
- Service worker `v0.2.0`: precachea `brand.css` y `BrandBackground.js`.

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
