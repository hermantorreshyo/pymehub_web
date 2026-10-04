# Manual 01 · Ejecutar y desplegar Pyme Hub Web

**Aplica a:** `pymehub_web` 0.1.0 con `pymehub_api` 0.2.0
**Producción:** VPS Hostinger · Debian 13 · Apache 2.4 · `https://pymehub.hermantorres.com`
**Complementa a:** `pymehub_api/docs/manuales/01_MANUAL_DESPLIEGUE.md` (servidor, base de datos, API y certificados)
**Última revisión:** 03/10/2026

---

## 1. Qué cubre este manual

La web es una PWA de archivos estáticos (HTML, CSS y JavaScript con módulos ES): no tiene código de servidor, ni dependencias, ni paso de compilación. Para ejecutarla basta con servir la carpeta `public/` y decirle dónde está la API en `public/js/config.js`.

Hay tres formas de ponerla en marcha:

| Modo | Para qué | Necesita | Apartado |
|---|---|---|---|
| **Demostración** | Ver y probar la interfaz hoy, sin instalar nada más | Python 3.9 o superior | 2 |
| **Local con la API real** | Desarrollar y probar contra `pymehub_api` antes de cada commit | PHP 8.4, MySQL 8.4 y Apache (o el servidor de PHP) | 3 |
| **Producción** | Publicar en `pymehub.hermantorres.com` | El VPS preparado según el manual de la API | 4 |

---

## 2. Modo demostración

`tools/servidor_demo.py` sirve `public/` y simula la API v0.2.0 con datos ficticios (§18 de los requisitos): sesión por cookie, token CSRF, códigos `PH-*`, aislamiento entre empresas, permisos por perfil, límite de empleados del plan y contrato de encargado del tratamiento. Es una herramienta de desarrollo: **no se despliega y no sustituye a la API real**.

```bash
cd pymehub_web
python tools/servidor_demo.py
```

Abre **http://localhost:8090** y entra con cualquiera de estas cuentas (contraseña `demo1234`):

| Email | Perfil | Qué se ve |
|---|---|---|
| `gerente@castilla.demo` | Gerencia, plan Completo | Inicio, Plantilla (48 personas, 4 equipos), Configuración con cuentas de RR. HH. |
| `rrhh@castilla.demo` | RR. HH., plan Completo | Lo mismo sin la gestión de cuentas |
| `gerente@tajo.demo` | Gerencia, plan Entrada | 15 personas; "IA de RR. HH." como vista informativa del plan Completo |
| `conductor@castilla.demo` | Empleado | Experiencia móvil con navegación inferior |
| `admin@pymehub.demo` | Administración de la plataforma | Métricas y empresas cliente |

Enlaces de invitación de prueba:

- Válida: `http://localhost:8090/#/invitacion/demo-invitacion-valida-000000000000`
- Caducada: `http://localhost:8090/#/invitacion/caducada-000000000000000000000`

Opciones:

| Opción | Efecto |
|---|---|
| `--latencia 800` | Retrasa cada respuesta 800 ms para ver los estados de carga |
| `--puerto 8090` | Puerto de la web |
| `--puerto-api 8091` | Puerto de la API simulada |

Notas:

- El servidor entrega su propio `js/config.js` apuntando a la API simulada: no hace falta crear ese archivo y, si existe, no se toca.
- Los datos viven en memoria. Las altas, ediciones y bajas funcionan, y se pierden al parar el servidor (Ctrl+C).
- La importación CSV no está simulada (responde con error).
- `localhost` cuenta como contexto seguro: el service worker se registra y la PWA se puede instalar desde el navegador. Si tras cambiar el código ves una versión antigua, recarga con Ctrl+Mayús+R o, en las herramientas de desarrollo, Application → Service workers → *Unregister*.

---

## 3. Entorno local con la API real (Windows)

### 3.1 Por qué no basta con XAMPP

La API exige **PHP 8.3 o superior** (recomendado 8.4) y **MySQL 8.4 LTS**. El instalador rechaza MariaDB (`RF-091`). XAMPP trae PHP 8.2 y MariaDB 10.4, así que **la API no se puede instalar con el XAMPP tal cual**. El Apache de XAMPP sí sirve para la web.

Opciones, de la más ligera a la más fiel a producción:

| Opción | Qué instalas | Ventaja |
|---|---|---|
| **A** · PHP 8.4 y MySQL 8.4 para Windows | Un ZIP de PHP y el instalador MSI de MySQL | Rápida; convive con XAMPP |
| **B** · WSL 2 con Debian | Una distribución Linux dentro de Windows | Mismo sistema que el VPS: se sigue el manual de la API tal cual |

### 3.2 Opción A · PHP 8.4 y MySQL 8.4 para Windows

1. **MySQL 8.4 LTS.** Descarga *MySQL Installer* o el MSI de *MySQL Community Server 8.4* desde dev.mysql.com. Instálalo como servicio en el **puerto 3307**, para que no choque con el MariaDB de XAMPP (3306). Crea la base y el usuario como indica el apartado 6 del manual de la API.
2. **PHP 8.4.** Descarga el ZIP *Thread Safe x64* de windows.php.net y descomprímelo en `C:\php84`. Copia `php.ini-development` como `php.ini` y activa estas extensiones: `pdo_mysql`, `mbstring`, `openssl`, `sodium`, `fileinfo`, `intl` y `curl` (quitando el `;` de sus líneas `extension=`).
3. **API con el servidor integrado de PHP**, en el host `api.pymehub.localhost`:

   ```bash
   cd C:\xampp2026\htdocs\eude\pymehub_api
   C:\php84\php.exe -S api.pymehub.localhost:8091 -t public public/index.php
   ```

   Abre `http://api.pymehub.localhost:8091/install` y sigue el asistente (apartado 12 del manual de la API). Usa el puerto 3307 para MySQL. Al terminar, ajusta en `config/config.php`:

   ```php
   'app'     => ['env' => 'local', 'api_url' => 'http://api.pymehub.localhost:8091', 'frontend_url' => 'http://pymehub.localhost'],
   'session' => ['cookie_domain' => '', 'cookie_secure' => false],
   'cors'    => ['allowed_origins' => ['http://pymehub.localhost']],
   ```

4. **Web con el Apache de XAMPP**, en el host `pymehub.localhost`. En `C:\xampp2026\apache\conf\extra\httpd-vhosts.conf`:

   ```apache
   <VirtualHost *:80>
       ServerName pymehub.localhost
       DocumentRoot "C:/xampp2026/htdocs/eude/pymehub_web/public"
       <Directory "C:/xampp2026/htdocs/eude/pymehub_web/public">
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

   Reinicia Apache desde el panel de XAMPP. `AllowOverride All` hace que se aplique `public/.htaccess`: en hosts `*.localhost` su CSP permite conectar con la API local por HTTP.

5. **Configuración de la web:**

   ```bash
   copy public\js\config.example.js public\js\config.js
   ```

   y cambia `apiUrl` por `'http://api.pymehub.localhost:8091'`.

6. Abre **http://pymehub.localhost**.

Los hosts `*.localhost` resuelven a tu equipo sin tocar el archivo `hosts` en Chrome, Edge y Firefox. `pymehub.localhost` y `api.pymehub.localhost` son el mismo sitio, así que la cookie de sesión `SameSite=Strict` viaja con las peticiones aunque cambie el puerto.

> La opción A no se ha probado todavía de principio a fin con la API. Si el servidor integrado de PHP diera problemas con alguna ruta, sirve la API con un vhost de Apache que use PHP 8.4, o pasa a la opción B.

### 3.3 Opción B · WSL 2 con Debian

```powershell
wsl --install -d Debian
```

Dentro de Debian, sigue el manual de la API (apartados 4 a 12) usando `pymehub.localhost` y `api.pymehub.localhost` en lugar de los dominios reales, sin certificados y con `cookie_secure` a `false`. Para la web, usa el vhost del apartado 4.2 de este manual, cambiando `ServerName` y la CSP por las de local (las de `public/.htaccess`).

### 3.4 Comprobación antes de cada commit (CLAUDE.md)

1. Revisa la app a **390 × 844**, **768 × 1024** y **1440 × 900** (herramientas de desarrollo → modo dispositivo), con teclado (Tab, Mayús+Tab, Intro) y con *Emular prefers-reduced-motion: reduce* (Rendering).
2. Consola sin errores ni avisos de CSP con la API local.
3. `CHANGELOG.md` actualizado.

---

## 4. Producción

Requisitos previos, del manual de la API: DNS de `pymehub.hermantorres.com` apuntando al VPS (apartado 8), usuario `pymehub` y repositorio clonado en `/var/www/pymehub-web` (apartado 9) y la API ya instalada y respondiendo en `https://api.pymehub.hermantorres.com/v1/health` (apartados 10 a 13).

### 4.1 Código y configuración

```bash
cd /var/www/pymehub-web
sudo -u pymehub git fetch --tags
sudo -u pymehub git checkout v0.1.0          # versión publicada (etiqueta)

# Configuración del entorno (no versionada)
sudo -u pymehub cp public/js/config.example.js public/js/config.js
# El ejemplo ya apunta a https://api.pymehub.hermantorres.com; revísalo:
cat public/js/config.js

# Permisos: Apache solo lee
sudo chown -R pymehub:www-data .
sudo find . -type d -exec chmod 750 {} \;
sudo find . -type f -exec chmod 640 {} \;
```

### 4.2 Host virtual · `/etc/apache2/sites-available/pymehub-web.conf`

En producción la configuración va en el vhost (`AllowOverride None`), así que este bloque **replica todo lo que hace `public/.htaccess`**: cabeceras de seguridad, CSP, tipos MIME y caché. Si cambias uno, cambia el otro.

```apache
<VirtualHost *:80>
    ServerName pymehub.hermantorres.com
    DocumentRoot /var/www/pymehub-web/public
    DirectoryIndex index.html

    <Directory /var/www/pymehub-web>
        Require all denied
    </Directory>
    <Directory /var/www/pymehub-web/public>
        AllowOverride None
        Require all granted
        Options -Indexes -MultiViews
    </Directory>
    # Archivos ocultos (.git, .htaccess) y PHP: nunca
    <FilesMatch "^\.">
        Require all denied
    </FilesMatch>
    <DirectoryMatch "/\.git">
        Require all denied
    </DirectoryMatch>
    <FilesMatch "\.php$">
        Require all denied
    </FilesMatch>

    AddType application/manifest+json .webmanifest
    AddType text/javascript .js
    AddCharset utf-8 .js .css .html .webmanifest .svg

    <IfModule mod_headers.c>
        Header always unset X-Powered-By
        Header always set X-Content-Type-Options "nosniff"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
        Header always set X-Frame-Options "DENY"
        Header always set Content-Security-Policy "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.pymehub.hermantorres.com; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"

        # Los nombres de archivo no llevan hash: HTML, JS, CSS, manifest y service worker
        # se revalidan siempre (ETag) para no mezclar módulos de versiones distintas.
        <FilesMatch "\.(html|js|css|webmanifest)$">
            Header set Cache-Control "no-cache"
        </FilesMatch>
        <FilesMatch "\.(svg|png|webp|jpg)$">
            Header set Cache-Control "public, max-age=86400"
        </FilesMatch>
    </IfModule>

    ErrorLog ${APACHE_LOG_DIR}/pymehub-web-error.log
    CustomLog ${APACHE_LOG_DIR}/pymehub-web-access.log combined
</VirtualHost>
```

```bash
sudo a2enmod headers
sudo a2ensite pymehub-web
sudo apache2ctl configtest      # "Syntax OK"
sudo systemctl reload apache2
```

**HTTPS:** si el certificado no se emitió junto con el de la API (apartado 11 de su manual):

```bash
sudo certbot --apache -d pymehub.hermantorres.com
```

Elige redirigir HTTP a HTTPS. Después añade HSTS en el vhost `pymehub-web-le-ssl.conf` que crea Certbot:

```apache
Header always set Strict-Transport-Security "max-age=31536000"
```

### 4.3 Comprobaciones

```bash
# La página y sus cabeceras
curl -sI https://pymehub.hermantorres.com/ | grep -iE "^HTTP|content-security|x-frame|strict-transport|cache-control"
# Esperado: HTTP/2 200, la CSP con connect-src a la API, X-Frame-Options DENY, HSTS y Cache-Control no-cache

# Tipos MIME de los módulos y del manifest
curl -sI https://pymehub.hermantorres.com/js/app.js | grep -i content-type                 # text/javascript
curl -sI https://pymehub.hermantorres.com/manifest.webmanifest | grep -i content-type      # application/manifest+json

# Lo que no debe servirse
curl -s -o /dev/null -w "%{http_code}\n" https://pymehub.hermantorres.com/.git/config      # 403 o 404
```

En el navegador:

1. `https://pymehub.hermantorres.com` muestra la pantalla de acceso, sin errores en la consola.
2. Entra con el gerente de la empresa de demostración: se ve el inicio con el número real de colaboradores.
3. Herramientas de desarrollo → Application: el manifest no tiene errores y el service worker está *activated*.
4. Criterio 12: nota **A** en [securityheaders.com](https://securityheaders.com) para `pymehub.hermantorres.com`.
5. Criterio 18 (independencia de repositorios): la misma carpeta `public/` servida desde otro servidor estático, con su `config.js`, funciona igual. La API debe incluir ese origen en `cors.allowed_origins` y estar en el mismo sitio para la cookie.

### 4.4 Publicar una versión nueva

Orden obligatorio: **primero la API, después la web** (`RNF-067`, apartado 16 del manual de la API).

Antes de etiquetar la versión de la web:

1. Sube `VERSION` en `public/sw.js` (por ejemplo, `v0.2.0`): así los navegadores descartan la caché de la versión anterior.
2. Si añades módulos imprescindibles para arrancar, inclúyelos en la lista `SHELL` de `public/sw.js`.
3. Actualiza `CHANGELOG.md` y crea la etiqueta (`git tag v0.2.0 && git push --tags`).

En el servidor:

```bash
cd /var/www/pymehub-web
sudo -u pymehub git fetch --tags
sudo -u pymehub git checkout v0.2.0
```

No hace falta recargar Apache. `config.js` no está versionado, así que se conserva.

**Volver atrás:** `sudo -u pymehub git checkout vVERSION_ANTERIOR`. Si la versión anterior necesita una API anterior, revierte primero la API.

---

## 5. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Falta la configuración de Pyme Hub" | No existe `public/js/config.js` | Cópialo de `config.example.js` (apartado 4.1) |
| "No hemos podido conectar con Pyme Hub" al abrir la app | La API no responde o la CSP bloquea su URL | Comprueba `/v1/health` de la API y que `apiUrl` coincide con el `connect-src` de la CSP |
| `Refused to connect … Content Security Policy` en la consola | `apiUrl` apunta a un host que la CSP no permite | En producción, `https://api.pymehub.hermantorres.com`; en local, un host `*.localhost` |
| Error de CORS en la consola | El origen de la web no está en `cors.allowed_origins` de la API | Añádelo exacto, sin barra final |
| Se entra pero al recargar se pierde la sesión | La cookie no viaja: web y API en sitios distintos, o `cookie_secure` a `true` sobre HTTP | Usa dominios del mismo sitio; en local, `cookie_secure` a `false` |
| `Failed to load module script … MIME type` | El servidor sirve `.js` con un tipo incorrecto | `AddType text/javascript .js` (apartado 4.2) |
| Tras publicar se sigue viendo la versión anterior | Service worker de la versión previa | Comprueba que se subió `VERSION` en `sw.js`; el usuario puede recargar con Ctrl+Mayús+R |
| El servidor de demostración dice que el puerto está en uso | Otro proceso usa el 8090 o el 8091 | `python tools/servidor_demo.py --puerto 8095 --puerto-api 8096` |

---

## 6. Lista de comprobación final (producción)

- [ ] La API responde `"estado":"ok"` en `/v1/health`.
- [ ] `public/js/config.js` existe y apunta a `https://api.pymehub.hermantorres.com`.
- [ ] El vhost replica las reglas de `public/.htaccess` y `apache2ctl configtest` dice `Syntax OK`.
- [ ] HTTPS con redirección y HSTS; nota A en securityheaders.com.
- [ ] La pantalla de acceso carga sin errores de consola ni de CSP.
- [ ] Login, navegación y cierre de sesión funcionan con los usuarios de demostración.
- [ ] El manifest y el service worker aparecen sin errores en las herramientas de desarrollo.
- [ ] `VERSION` de `sw.js` coincide con la etiqueta desplegada.
