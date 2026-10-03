# Pyme Hub Web · instrucciones para Claude Code

Frontend del MVP de Pyme Hub (TFM EUDE): PWA que **solo consume la API** de `pymehub_api`. No contiene código de servidor ni acceso a base de datos.

## Documentos que mandan
- Requisitos: `docs/requisitos/PYMEHUB_MVP_REQUERIMIENTOS_TECNICOS.md` (sobre todo §13: frontend, tokens, layout, estados, accesibilidad y diferencias entre mockups y MVP).
- `docs/diseno/PymeHub_Manual_Maquetacion_HTML_CSS_v1.0.md`: reglas de maquetación obligatorias.
- `docs/diseno/Manual_de_Imagen_Corporativa_Pyme_Hub.pdf` y los mockups: referencia visual. Si un mockup contradice los requisitos, mandan los requisitos.
- Contrato de la API: `pymehub_api/docs/openapi.yaml`.

## Reglas no negociables
- HTML, CSS y JavaScript nativo con módulos ES. Sin frameworks, sin Node, sin paso de compilación: Apache sirve `public/` tal cual.
- Todas las llamadas pasan por `public/js/services/api.js` con `credentials: 'include'` y cabecera `X-CSRF-Token`; traduce los códigos `PH-*` a mensajes claros.
- La URL de la API vive en `public/js/config.js` (no versionado); se versiona `config.example.js`.
- Nunca `innerHTML` con datos de la API: `textContent` o la función de escape única.
- Colores, radios, sombras y espacios solo desde `public/styles/tokens.css`.
- Mobile first; CSS Grid y Flexbox; sin `position: absolute` en el layout principal; sin scroll horizontal.
- Todo componente con datos tiene estados de carga, vacío, error (con "Reintentar") y éxito.
- El riesgo y el bienestar nunca se comunican solo con color: texto e icono.
- Iconos de una sola familia (sprite SVG local). Imágenes locales y optimizadas: la CSP no permite recursos remotos salvo Chart.js (cdnjs) y Google Fonts.
- Menús según `perfil` y `features` de `GET /v1/auth/me`; ocultar no sustituye al control de la API.
- Navegación por hash (`#/ruta`). Español en toda la interfaz, con la voz del manual de marca.

## Antes de cada commit
1. Revisar a 390 × 844, 768 × 1024 y 1440 × 900, con teclado y con `prefers-reduced-motion`.
2. Consola del navegador sin errores contra la API local.
3. `CHANGELOG.md` actualizado.

## Mensajes de commit
En español, formato convencional: `tipo: resumen (vX.Y.Z)` y un cuerpo por secciones (Estructura, Componentes, Vistas, PWA, Accesibilidad, Documentación) con los identificadores de requisitos implementados. Al terminar un avance, entrega también el mensaje de commit de `pymehub_api`, o indica que no tiene cambios.
