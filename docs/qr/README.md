# Códigos QR de Pyme Hub

Para imprimir. Color carbón `#1F2937` sobre blanco, margen de 4 módulos y corrección de errores M. Se han verificado decodificándolos.

| Archivo | Destino | Para qué |
|---|---|---|
| `qr_demo.svg` | `https://pymehub.hermantorres.com/demo` | Folleto comercial y diapositiva de cierre: landing con el panel «Pruebe Pyme Hub» (`REQ_QR_DEMO_COMERCIAL`) |
| `qr_instalar_app.svg` | `https://pymehub.hermantorres.com/app` | Instalar la app en el móvil a voluntad: página «Instala Pyme Hub» (`#/instalar`) |

Las dos URL son **estables**: `public/.htaccess` las redirige con un 302 sin caché. Si cambia el destino o el dominio, se cambia la redirección, no el QR impreso.

Uso:
- Tamaño mínimo impreso de 2 × 2 cm; para escanear a más de 1 m, 3 × 3 cm o más.
- El SVG se puede escalar sin pérdida. No le cambies los colores a tonos claros ni lo pongas sobre fondos oscuros.

Las visitas de cada QR y las instalaciones completadas aparecen en Administración → Resumen → «Códigos QR». Se cuentan sin cookies ni datos personales.
