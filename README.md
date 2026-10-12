# Pyme Hub Web

Frontend del MVP de **Pyme Hub** (TFM EUDE Business School): una PWA en HTML, CSS y JavaScript nativo (módulos ES) que **solo consume la API** de [`pymehub_api`](https://github.com/hermantorreshyo/pymehub_api). No tiene código de servidor, ni dependencias de Node, ni paso de compilación: Apache sirve `public/` tal cual.

- Requisitos: [`docs/requisitos/PYMEHUB_MVP_REQUERIMIENTOS_TECNICOS.md`](docs/requisitos/PYMEHUB_MVP_REQUERIMIENTOS_TECNICOS.md) (§13: frontend).
- Reglas de maquetación: [`docs/diseno/PymeHub_Manual_Maquetacion_HTML_CSS_v1.0.md`](docs/diseno/PymeHub_Manual_Maquetacion_HTML_CSS_v1.0.md).
- Contrato de la API: `pymehub_api/docs/openapi.yaml`.
- Prompt maestro para continuar el desarrollo con IA: [`docs/PROMPT_MAESTRO.md`](docs/PROMPT_MAESTRO.md).
- Índice de la documentación: [`docs/README.md`](docs/README.md).
- Cambios: [`CHANGELOG.md`](CHANGELOG.md).

## Qué ve cada visitante

| Dirección | Pantalla |
|---|---|
| `https://pymehub.hermantorres.com/` (`#/`) | **Sitio web público** con la línea de la *landing*: presentación, módulos, privacidad, planes y el botón **Acceso usuarios** |
| `#/acceso` | Acceso en pantalla partida: panel de marca con el logotipo animado y formulario |
| `#/invitacion/{token}` | Activación de la cuenta desde el enlace de invitación |
| `#/inicio` y resto | Aplicación (AppShell) según el perfil y el plan; la PWA instalada arranca aquí |

## Estructura

```
public/                      ← DocumentRoot
├── index.html               ← única página; navegación por hash (#/ruta)
├── manifest.webmanifest     ← PWA instalable (RF-060)
├── sw.js                    ← service worker (RF-061)
├── .htaccess                ← CSP, cabeceras de seguridad y caché
├── assets/
│   ├── brand/               ← logotipo, símbolo, favicons e iconos de la app (RF-064)
│   │   └── logo-anim/       ← piezas del logotipo para la animación (y variantes claras)
│   └── icons/sprite.svg     ← iconos: subconjunto de Lucide, una sola familia (RNF-046)
├── styles/
│   ├── tokens.css           ← único sitio con colores, radios, sombras y espacios (RNF-034)
│   ├── globals.css          ← base, tipografía y componentes de interfaz
│   ├── responsive.css       ← AppShell, rejillas y breakpoints (mobile first)
│   ├── brand.css            ← lenguaje visual de la landing: logo animado, fondo, sitio, acceso, movimiento
│   └── modules.css          ← módulos funcionales (Bienestar; después Formación e IA de RR. HH.)
├── vendor/chartjs/          ← Chart.js 4.4.1 (MIT), servido desde el propio dominio y cargado bajo demanda
└── js/
    ├── config.example.js    ← se copia como config.js (no versionado)
    ├── app.js               ← arranque, sesión y pintado de rutas
    ├── routes.js            ← tabla de rutas por perfil y funcionalidad
    ├── services/api.js      ← único punto de acceso a la API (RNF-032)
    ├── lib/                 ← dom (sin innerHTML), escape, formato, router, store, cola offline, charts, wellbeing
    ├── components/          ← brand/ (AnimatedLogo, BrandBackground), layout/, dashboard/, ui/
    └── views/               ← public/ (sitio, acceso, invitación), admin/, management/, employee/, shared/
docs/                        ← requisitos, diseño (manuales, mockups, landing), anexos y prompt maestro
tools/generar_kit_marca.ps1  ← regenera el kit de iconos a partir del logotipo PNG
```

## Puesta en marcha

1. Copia la configuración y pon la URL de la API:

   ```bash
   cp public/js/config.example.js public/js/config.js
   ```

2. Publica `public/` como DocumentRoot de un host propio. El frontend y la API deben estar en **el mismo sitio** (mismo dominio registrable) para que la cookie de sesión `SameSite=Strict` viaje con las peticiones: en producción, `pymehub.hermantorres.com` y `api.pymehub.hermantorres.com`.

### Entorno local (XAMPP)

La API resuelve las rutas desde la raíz del host, así que cada repositorio necesita su propio host virtual. Con `*.localhost` no hace falta tocar el archivo `hosts` en Chrome, Edge ni Firefox, y el navegador lo trata como contexto seguro (el service worker funciona sin HTTPS).

`apache/conf/extra/httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    ServerName pymehub.localhost
    DocumentRoot "C:/xampp2026/htdocs/eude/pymehub_web/public"
    <Directory "C:/xampp2026/htdocs/eude/pymehub_web/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName api.pymehub.localhost
    DocumentRoot "C:/xampp2026/htdocs/eude/pymehub_api/public"
    <Directory "C:/xampp2026/htdocs/eude/pymehub_api/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

- Frontend, `public/js/config.js`: `apiUrl: 'http://api.pymehub.localhost'`.
- API, `config/config.php` (lo genera su instalador): `app.frontend_url` = `http://pymehub.localhost`, `cors.allowed_origins` = `['http://pymehub.localhost']` y `session.cookie_secure` = `false`.
- Abre `http://pymehub.localhost`.

La CSP de `.htaccess` detecta los hosts `*.localhost` y permite conectar con la API local por HTTP; en cualquier otro host solo permite `https://api.pymehub.hermantorres.com`.

## Reglas de desarrollo

- Todas las llamadas pasan por `js/services/api.js` (`credentials: 'include'`, `X-CSRF-Token`, códigos `PH-*` traducidos).
- La interfaz se construye con `lib/dom.js` (`h()` y `textContent`); nunca `innerHTML` con datos de la API.
- Todo componente con datos usa `dataView()` de `components/ui/StateView.js`: cargando, vacío, error con "Reintentar" y éxito.
- El riesgo y el bienestar se muestran con texto e icono (`levelBadge()`), nunca solo con color.
- Los menús salen de `perfil` y `features` de `/v1/auth/me` (`lib/navigation.js`); la API es quien controla el acceso.
- Antes de cada commit: revisar a 390 × 844, 768 × 1024 y 1440 × 900, con teclado y con `prefers-reduced-motion`; consola sin errores contra la API local; `CHANGELOG.md` actualizado.
- Las animaciones de marca (logotipo, fondo, entradas) viven en `styles/brand.css` y se desactivan con `prefers-reduced-motion` (RNF-047).
- Al publicar una versión, sube `VERSION` en `public/sw.js` para renovar la caché de la PWA.
