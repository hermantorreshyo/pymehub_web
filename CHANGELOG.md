# Changelog · pymehub_web

Formato basado en *Keep a Changelog*; versiones SemVer.

## [0.7.0] · 2026-10-13

**Demo comercial y QR del folleto** (`docs/requerimientos/REQ_QR_DEMO_COMERCIAL.md`). Requiere `pymehub_api` 0.7.0.

### Añadido
- **Ruta `/demo`** en `public/.htaccess` (`DMO-001` a `DMO-003`): 302 temporal y sin caché a `/?modo=demo&utm_source=qr&utm_medium=folleto&utm_campaign=folleto_comercial`. Por HTTP, el 301 a HTTPS y después el 302. No se toca el vhost.
- **Landing en modo demo** (solo al llegar por `/demo`, `DMO-010` a `DMO-018`):
  - franja «Pruebe Pyme Hub con una empresa de ejemplo: 48 empleados, 4 equipos y datos ficticios»;
  - tarjetas de Gerente, RR. HH. y Conductor, y una secundaria del plan Entrada, cada una con correo y contraseña con botón Copiar (`aria-label` y aviso `aria-live`), qué ver y «Entrar como …» con el correo precargado (la contraseña nunca viaja en la URL);
  - aviso «Datos 100 % ficticios. La demostración se restaura cada noche» y, si la demo está desactivada, «La demostración no está disponible en este momento»;
  - condiciones del folleto (piloto gratuito de 30 días, desde 15 €/empleado/mes, mensual sin permanencia, soporte en menos de 4 h laborables, 99,5 % de disponibilidad, datos exportables) y «Solicitar un piloto gratuito» (`mailto:` con `contactEmail` de `config.js`);
  - con sesión abierta, «Ir a mi panel»;
  - la visita se cuenta una vez con `POST /v1/public/visits`, sin cookies ni almacenamiento, y la URL se limpia con `history.replaceState`;
  - el pie no menciona el TFM en modo demo.
- `#/login` como alias de `#/acceso` (`DMO-012`).
- Aviso permanente en la aplicación para las cuentas demo: «Estás en la demostración de Pyme Hub: datos 100 % ficticios que se restauran cada noche».
- Mensajes de `PH-DEMO-001` y `PH-DEMO-002`.
- **Administración** → Resumen: tarjeta **«QR del folleto»** (`DMO-036`) con visitas, porcentaje desde el móvil, entradas en la demo por perfil, visitas por día y por hora, rango «Hoy / 7 días / Desde el inicio» y botón «Actualizar».
- Icono `copy` en el sprite.

### Cambiado
- `config.example.js`: `contactEmail` (`info@hyo.company`).
- Service worker v0.7.0.

### Documentación
- `docs/requerimientos/REQ_QR_DEMO_COMERCIAL.md` con las notas de implementación, requisitos v0.9.5 y prompt maestro, iguales que en `pymehub_api`.

## [0.6.0] · 2026-10-12

Avance 5 · **IA de RR. HH.** (fase 7, §9). Requiere `pymehub_api` 0.6.0.

### Añadido
- **IA de RR. HH.** (plan Completo, `#/ia-rrhh`), con cuatro pestañas:
  - **Panel** (`RF-030`):
    - indicadores: personas en riesgo alto, rotación a 12 meses, antigüedad media y alertas de rotación abiertas;
    - alertas de rotación gestionables (marcar como gestionada o descartar, `LEG-005`);
    - distribución por nivel con «Recalcular ahora»;
    - tendencias de 6 meses con Chart.js y tabla accesible;
    - impacto frente a la línea base (`RF-037`) y comprobación retrospectiva de las bajas voluntarias.
  - **Por persona** (`RF-031`): ranking con puntuación, nivel en texto e icono (`RNF-044`), factores principales y filtros por nivel, equipo y nombre.
  - **Sesgos** (`LEG-015`): niveles por equipo, puesto, turno y contrato, con los grupos que hay que revisar.
  - **Metodología** (`#/ia-rrhh/metodologia`, `RF-034`): niveles, factores con condición, puntos, evidencia y fuentes, lo que no se usa y por qué, limitaciones y referencias.
- **Ficha del empleado**: tarjeta «Riesgo de rotación» con puntuación, factores en lenguaje llano con evidencia y fuentes, alerta abierta, evolución y «¿De dónde sale esto?». Siempre con el aviso de supervisión humana.
- **Configuración**: formulario de la **línea base de impacto** con el periodo sugerido (los 12 meses anteriores al alta) y la comparación. En el plan Entrada se indica que es del plan Completo.
- **Inicio de gestión**: el indicador «Alertas de rotación» muestra datos reales en lugar de «Sin datos aún».
- `lib/risk.js`: piezas comunes del riesgo (medidor, factores, chips, aviso de supervisión y comparación con la línea base).
- Iconos `scale`, `list-ordered` y `history` en el sprite.

### Cambiado
- El plan Entrada conserva la vista informativa del plan Completo en IA de RR. HH. (`RF-012`).
- La tabla accesible de cada gráfico queda contenida en su bloque: evita el scroll horizontal en móvil.
- Service worker v0.6.0 con los módulos nuevos.

### Documentación
- Requisitos técnicos v0.9.4 y prompt maestro, iguales que en `pymehub_api`.

## [0.5.0] · 2026-10-12

Avance 4 · **Asesor de formación con IA** (fase 6, §12). Requiere `pymehub_api` 0.5.0.

### Añadido
- **Pestaña «Asesor»** en la formación del empleado (`#/formacion?tab=asesor`):
  - preferencias en menos de 30 segundos: objetivo, temas, minutos a la semana, formato y un comentario opcional con el aviso «No incluyas datos personales ni de salud» (§12.2); si el comentario los lleva, el error aparece en el propio campo (`PH-AI-004`);
  - 3 a 5 recomendaciones numeradas con su motivo, plan semanal e **inscripción en un toque** (origen `ASESOR_IA`);
  - etiqueta «Recomendación generada con IA» o «Recomendación automática sin IA» y «¿Cómo funciona?» con los datos que usa y los que no (`IA-018`); los avisos del proveedor se muestran como información, nunca como error (`IA-002`);
  - valoración útil / no útil; cambiar o borrar las preferencias (`LEG-014`);
  - sin conexión, muestra las últimas recomendaciones guardadas en el dispositivo.
- «Mi formación» enlaza al asesor en lugar del aviso de «próximamente».
- **Gestión** → Formación → Recomendaciones: «Lo que pide tu equipo», demanda formativa agregada con umbral de 5 personas (`IA-021`).
- **Administración** → Resumen: uso del asesor en 30 días (proveedor, modo, consultas por origen, valoraciones y avisos), sin contenido.

### Cambiado
- Pestañas más compactas en móvil para que quepan tres secciones.
- Service worker v0.5.0.

### Documentación
- Requisitos técnicos v0.9.3, igual que en `pymehub_api`.

## [0.4.0] · 2026-10-12

Avance 3 · **Formación adaptativa** (fase 5, §10). Requiere `pymehub_api` 0.4.0.

### Añadido
- **Formación del empleado** (`#/formacion`):
  - «Mi formación»: lo pendiente ordenado por urgencia, con fecha límite, avance y acceso directo; lo completado con su nota; resumen de módulos y minutos.
  - «Catálogo»: filtros por categoría y búsqueda, «Para tu puesto», módulos propios de la empresa e **inscripción en un toque** (`RF-047`).
  - Tarjeta del Asesor de formación con IA, que llega en el avance 4.
- **Reproductor del módulo** (`#/formacion/curso/:id`, mockup 09 adaptado):
  - objetivos, bloques de uno en uno (texto, lista, consejo clave, ilustración), anillo de progreso y contenido del módulo;
  - cuestionario final con resultado, repaso de las respuestas y reintentos ilimitados (`RF-041`, `RF-044`).
- **Formación sin conexión** (`RF-045`, `RF-061`, `RF-062`): la lista y los módulos abiertos se guardan en el dispositivo; el avance y las respuestas van a la cola y se envían al recuperar la señal, sin contar intentos dobles. La copia se borra al cerrar sesión.
- **Formación para la gestión** (`#/formacion`):
  - indicadores (formación en marcha, tasa de finalización, vencidas y nota media), avance por equipo y módulos más asignados;
  - «Seguimiento» por persona con filtros por estado, equipo, módulo y búsqueda;
  - «Catálogo» con el uso de cada módulo y **diálogo de asignación** a un equipo o a personas concretas con fecha límite (`RF-042`);
  - «Recomendaciones» por reglas con su motivo y asignación en un clic (`RF-043`).
- **Ficha de módulo** (`#/formacion/modulos/:id`): contenido, cuestionario con la solución, quién lo cursa; asignar, editar, publicar o archivar los módulos propios.
- **Editor de módulos propios** (`#/formacion/modulos/nuevo`, `RF-046`): objetivos, bloques y 2–4 preguntas, con los errores de la API en su sitio.
- La ficha del empleado muestra su formación y lo que recomiendan las reglas.
- Inicio: indicador «Avance en formación» y tarjeta de formación por equipos (gestión); «Tu formación» con el siguiente módulo (empleado).
- Ilustraciones de marca por categoría (composición local, sin fotos de stock, `RNF-048`) y 18 iconos más del sprite (Lucide).

### Cambiado
- Sin sesión previa en el navegador, el sitio público y el acceso ya no consultan `GET /v1/auth/me`: desaparece el 401 de la consola. Las rutas privadas la consultan siempre.
- Las rejillas de formación se adaptan al ancho del contenedor (*container queries*), porque el AppShell del empleado es más estrecho que el de la gestión.
- Service worker v0.4.0 con todos los módulos nuevos.

### Documentación
- Requisitos técnicos v0.9.2, igual que en `pymehub_api`.

## [0.3.1] · 2026-10-12

Solo documentación. No hay cambios en la aplicación.

### Documentación
- Requisitos técnicos v0.9.1, igual que en `pymehub_api`:
  - compatibilidad con MariaDB 11.8 en producción (`DEC-05`);
  - rutas reales del VPS: `/var/www/hermantorres/eude/pymehub/pymehub_web`, con DocumentRoot en `public/`.

## [0.3.0] · 2026-10-11

### Añadido
- **Check-in del empleado** (`#/checkin`, mockup 07 adaptado):
  - Tres escalas 1–5 con icono y texto (ánimo, energía, estrés) en zonas táctiles grandes y una nota personal cifrada. Se responde en menos de 15 segundos (RF-050, RNF-031, RNF-044).
  - Si ya respondió hoy, muestra el resumen y deja cambiar la respuesta (RF-051).
  - Tras enviar, confirmación animada. Con valores bajos aparecen recursos de apoyo, como la Línea 024 con llamada directa (RF-055).
- **Check-in sin conexión de extremo a extremo** (RF-062, RF-063):
  - La app abre sin cobertura con el último perfil conocido, que guarda en el dispositivo una copia mínima sin email ni token.
  - El check-in se guarda en la cola del dispositivo. Al recuperar la señal se verifica la sesión, se envía y se avisa con un mensaje.
  - Verificado recargando la app sin conexión.
- **Tu evolución**: índice medio de 30 días con su nivel, medias de ánimo, energía y estrés, racha, gráfico diario y notas recientes (RF-052).
- **Inicio del empleado**: tarjeta del check-in de hoy, con acceso directo o resumen.
- **Panel de Bienestar de gestión** (`#/bienestar`, mockups 06 y 08 adaptados a §13.6):
  - Indicadores de índice, participación, estrés y alertas, y gráficos semanales del índice y de las tres dimensiones.
  - Comparación de equipos con barra, nivel en texto e icono y filtro por equipo y periodo.
  - Alertas de equipo que se marcan como gestionadas o descartadas.
  - Estado propio de anonimato cuando no hay 5 personas (RF-053, RF-054, LEG-002, PH-WB-001).
- **Inicio de gestión**: el indicador "Índice de bienestar" y la tarjeta "Bienestar de los equipos" con las alertas abiertas usan ya datos reales.
- `lib/charts.js`: gráficos con Chart.js cargados bajo demanda, colores desde los tokens, tabla accesible alternativa y sin animación si se reduce el movimiento (RNF-043, RNF-045, RNF-047).
- `lib/wellbeing.js`: escalas, niveles (Bueno, Atención, Bajo) y formato de fechas, compartidos.
- `styles/modules.css`: estilos de los módulos funcionales.
- Tokens de gráficos `--chart-1..3`. Su orden fijo está validado para daltonismo (ánimo, energía, estrés).
- Iconos Lucide nuevos para las escalas, el apoyo y las alertas.

### Cambiado
- **Chart.js 4.4.1 servido desde el propio dominio** (`vendor/chartjs`, licencia MIT) en lugar de cdnjs. No pesa en la primera carga, funciona sin conexión y la CSP no necesita orígenes externos para scripts (DEC-08, RNF-051, RF-061).
- **Service worker v0.3.0**: precachea todos los módulos de la app, los estilos, Chart.js y `config.js` si existe, así que cualquier vista abre sin conexión.

### Corregido
- El service worker no llegaba a registrarse: se esperaba el evento `load`, que ya había pasado cuando termina el arranque asíncrono. Ahora se registra en cuanto la app arranca (RF-061).

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
