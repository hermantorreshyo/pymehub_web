# Pyme Hub Web

Frontend del MVP de **Pyme Hub** (TFM EUDE Business School): una PWA en HTML, CSS y JavaScript nativo (módulos ES) que **solo consume la API** de [`pymehub_api`](https://github.com/hermantorreshyo/pymehub_api). No tiene código de servidor, ni dependencias de Node, ni paso de compilación: Apache sirve `public/` tal cual.

- Requisitos: [`docs/requisitos/PYMEHUB_MVP_REQUERIMIENTOS_TECNICOS.md`](docs/requisitos/PYMEHUB_MVP_REQUERIMIENTOS_TECNICOS.md) (§13: frontend).
- Reglas de maquetación: [`docs/diseno/PymeHub_Manual_Maquetacion_HTML_CSS_v1.0.md`](docs/diseno/PymeHub_Manual_Maquetacion_HTML_CSS_v1.0.md).
- Contrato de la API: `pymehub_api/docs/openapi.yaml`.
- Cambios: [`CHANGELOG.md`](CHANGELOG.md).

## Estructura

```
public/                      ← DocumentRoot
├── index.html               ← única página; navegación por hash (#/ruta)
├── manifest.webmanifest     ← PWA instalable (RF-060)
├── sw.js                    ← service worker (RF-061)
├── .htaccess                ← CSP, cabeceras de seguridad y caché
├── assets/
│   ├── brand/               ← logotipo, símbolo, favicons e iconos de la app (RF-064)
│   └── icons/sprite.svg     ← iconos: subconjunto de Lucide, una sola familia (RNF-046)
├── styles/
│   ├── tokens.css           ← único sitio con colores, radios, sombras y espacios (RNF-034)
│   ├── globals.css          ← base, tipografía y componentes de interfaz
│   └── responsive.css       ← AppShell, rejillas y breakpoints (mobile first)
└── js/
    ├── config.example.js    ← se copia como config.js (no versionado)
    ├── app.js               ← arranque, sesión y pintado de rutas
    ├── routes.js            ← tabla de rutas por perfil y funcionalidad
    ├── services/api.js      ← único punto de acceso a la API (RNF-032)
    ├── lib/                 ← dom (sin innerHTML), escape, formato, router, store, cola offline
    ├── components/          ← layout/, dashboard/, ui/
    └── views/               ← public/, admin/, management/, employee/, shared/
tools/
├── servidor_demo.py         ← web + API simulada para ver la app sin instalar la API
└── generar_kit_marca.ps1    ← regenera el kit de iconos a partir del logotipo PNG
docs/manuales/               ← ejecución y despliegue
```

## Puesta en marcha

Guía completa (demostración, entorno local con la API real y producción): [`docs/manuales/01_MANUAL_DESPLIEGUE_WEB.md`](docs/manuales/01_MANUAL_DESPLIEGUE_WEB.md).

### Verla ya: modo demostración

Solo necesita Python 3.9 o superior. Sirve `public/` y simula la API con datos ficticios de dos empresas:

```bash
python tools/servidor_demo.py
```

Abre **http://localhost:8090** y entra con `gerente@castilla.demo` y la contraseña `demo1234`. Las demás cuentas (RR. HH., plan Entrada, empleado y administración) aparecen en la consola al arrancar y en el apartado 2 del manual. El servidor de demostración es una herramienta de desarrollo: no se despliega.

### Con la API real

La API necesita **PHP 8.3 o superior y MySQL 8.4 LTS**. El XAMPP actual trae PHP 8.2 y MariaDB 10.4, que el instalador de la API rechaza, así que hay que instalar ambos aparte (manual, apartado 3). Después:

1. `cp public/js/config.example.js public/js/config.js` y pon la URL de la API.
2. Sirve `public/` como DocumentRoot de un host propio (en local, `pymehub.localhost` con `AllowOverride All`).
3. La web y la API deben estar en **el mismo sitio** (mismo dominio registrable) para que la cookie de sesión `SameSite=Strict` viaje con las peticiones: `pymehub.localhost` y `api.pymehub.localhost` en local; `pymehub.hermantorres.com` y `api.pymehub.hermantorres.com` en producción.

La CSP de `public/.htaccess` detecta los hosts `*.localhost` y permite conectar con la API local por HTTP; en cualquier otro host solo permite `https://api.pymehub.hermantorres.com`. En producción las mismas reglas van en el vhost (manual, apartado 4.2).

## Reglas de desarrollo

- Todas las llamadas pasan por `js/services/api.js` (`credentials: 'include'`, `X-CSRF-Token`, códigos `PH-*` traducidos).
- La interfaz se construye con `lib/dom.js` (`h()` y `textContent`); nunca `innerHTML` con datos de la API.
- Todo componente con datos usa `dataView()` de `components/ui/StateView.js`: cargando, vacío, error con "Reintentar" y éxito.
- El riesgo y el bienestar se muestran con texto e icono (`levelBadge()`), nunca solo con color.
- Los menús salen de `perfil` y `features` de `/v1/auth/me` (`lib/navigation.js`); la API es quien controla el acceso.
- Antes de cada commit: revisar a 390 × 844, 768 × 1024 y 1440 × 900, con teclado y con `prefers-reduced-motion`; consola sin errores contra la API local; `CHANGELOG.md` actualizado.
- Al publicar una versión, sube `VERSION` en `public/sw.js` para renovar la caché de la PWA.
