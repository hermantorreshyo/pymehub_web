# Pyme Hub — Manual de Maquetación HTML/CSS

**Versión:** 1.0  
**Documento:** Guía de implementación visual para desarrolladores

## 1. Objetivo

Este documento define las reglas de maquetación para implementar Pyme
Hub a partir del mockup visual aprobado.

El mockup es una **referencia visual del resultado esperado**, no una
imagen que deba reproducirse mediante posiciones absolutas.

La implementación debe ser responsive, semántica, reutilizable y basada
en CSS Grid/Flexbox. Los gráficos y datos deben ser componentes
dinámicos.

## 2. Arquitectura visual

``` text
<AppShell>
├── <Sidebar />
└── <MainArea>
    ├── <Topbar />
    ├── <WelcomeHeader />
    ├── <KPIGrid>
    │   ├── <KPICard />
    │   ├── <KPICard />
    │   ├── <KPICard />
    │   └── <KPICard />
    └── <DashboardGrid>
        ├── <WellbeingChart />
        ├── <TrainingProgress />
        └── <RotationRisk />
```

En móvil, el sidebar se transforma en navegación inferior y los módulos
se apilan.

## 3. Reglas principales

- No usar el mockup como imagen de fondo.
- No usar `position: absolute` para construir el layout principal.
- Utilizar CSS Grid para estructuras de columnas.
- Utilizar Flexbox para agrupaciones.
- Utilizar unidades relativas.
- Usar media queries para cambios de layout.
- Usar container queries en componentes reutilizables cuando sea
  conveniente.
- Los gráficos deben ser dinámicos.
- Los KPI deben ser componentes reutilizables.
- El contenido debe soportar textos y valores diferentes sin romper el
  diseño.

## 4. Sistema de diseño

``` css
:root {
  --primary: #22C55E;
  --secondary: #3B82F6;
  --navy: #08263B;
  --text: #1F2937;
  --muted: #64748B;
  --background: #F6F8FA;
  --surface: #FFFFFF;
  --border: #E2E8F0;
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-card: 0 2px 8px rgba(15, 23, 42, 0.06);
}
```

### Tipografía

Jerarquía aproximada:

``` text
H1       28–32 px
H2       20–24 px
H3       16–18 px
Body     14–16 px
Small    12–13 px
KPI      28–36 px
```

Puede utilizarse `clamp()` para títulos:

``` css
h1 {
  font-size: clamp(24px, 2vw, 32px);
}
```

### Espaciado

Escala recomendada:

``` text
4px  8px  12px  16px  24px  32px  40px  48px
```

## 5. Layout desktop

El sidebar debe medir aproximadamente 240 px.

``` css
.app-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
}
```

Los KPI:

``` css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
```

Dashboard:

``` css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 16px;
}
```

## 6. Responsive

Breakpoints de referencia:

| Rango         | Dispositivo    | Comportamiento      |
|---------------|----------------|---------------------|
| `< 480px`     | móvil pequeño  | una columna         |
| `480–767px`   | móvil          | una columna         |
| `768–1023px`  | tablet         | dos columnas        |
| `1024–1439px` | desktop        | sidebar + dashboard |
| `>= 1440px`   | desktop grande | mayor espacio       |

Se recomienda Mobile First:

``` css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1.5fr 1fr 1fr;
  }
}
```

## 7. Sidebar y navegación móvil

Desktop:

``` text
┌───────────────┬───────────────────────────────┐
│    SIDEBAR    │          CONTENIDO            │
│               │                               │
│ Inicio        │                               │
│ Equipo        │                               │
│ Bienestar     │                               │
│ Formación     │                               │
│ IA RR. HH.    │                               │
└───────────────┴───────────────────────────────┘
```

Móvil:

``` text
┌─────────────────────────┐
│        CONTENIDO        │
│                         │
├─────────────────────────┤
│ Inicio │ Equipo │ Más  │
└─────────────────────────┘
```

``` css
@media (max-width: 767px) {
  .sidebar {
    display: none;
  }

  .mobile-navigation {
    display: flex;
  }

  .main-area {
    padding-bottom: 80px;
  }
}
```

## 8. KPI Cards

Los cuatro indicadores del mockup son:

- 48 Colaboradores
- 92% Bienestar promedio
- 76% Avance en formación
- 3 Alertas de rotación

Componente:

``` text
<KPICard
  title="Colaboradores"
  value="48"
  variation="+8%"
  icon="users"
/>
```

CSS:

``` css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 20px;
}
```

## 9. Módulos analíticos

### Estado de bienestar

Debe ser un gráfico dinámico y responsive.

``` js
const wellbeingData = [
  { month: "Ene", value: 78 },
  { month: "Feb", value: 82 },
  { month: "Mar", value: 87 },
  { month: "Abr", value: 92 }
];
```

Debe soportar loading, datos, vacío, error y tooltip.

### Formación en curso

Debe mostrar nombre, avance y estado:

``` text
Liderazgo       ███████████████░░░ 78%
Comunicación    ████████████░░░░░ 62%
Seguridad       █████████████████░ 91%
```

### Riesgo de rotación

Debe comunicar bajo, medio o alto mediante texto y/o icono además del
color. No depender únicamente del color.

## 10. Container Queries

Son útiles para componentes reutilizables:

``` css
.card-container {
  container-type: inline-size;
}

.card {
  display: grid;
  gap: 16px;
}

@container (min-width: 500px) {
  .card {
    grid-template-columns: 1fr auto;
  }
}
```

## 11. HTML semántico

``` html
<aside class="sidebar">
  <nav aria-label="Navegación principal">
    ...
  </nav>
</aside>

<main class="main-area">
  <header class="topbar">
    ...
  </header>

  <section aria-labelledby="dashboard-title">
    <h1 id="dashboard-title">Hola, Ana</h1>
    ...
  </section>
</main>
```

## 12. Accesibilidad

Como mínimo:

- contraste suficiente;
- navegación por teclado;
- foco visible;
- `alt` en imágenes informativas;
- labels en formularios;
- botones reales para acciones;
- enlaces reales para navegación;
- `aria-label` cuando sea necesario;
- no depender solamente del color.

## 13. Iconografía

Utilizar una única familia visual de iconos. Preferir SVG o una librería
consistente. No mezclar arbitrariamente emojis, Material Icons, Font
Awesome y SVG personalizados.

## 14. Gráficos

Los gráficos no deben ser imágenes del mockup.

Deben implementarse mediante SVG, Canvas o una librería de charts.

``` jsx
<WellbeingChart data={wellbeingData} />
```

No usar dimensiones rígidas como `width: 800px`. Preferir:

``` css
.chart {
  width: 100%;
  min-height: 240px;
}
```

## 15. Estados

Todo componente dependiente de datos debe contemplar:

``` text
Loading
Empty
Error
Success
```

Ejemplo:

``` text
No fue posible cargar la información.

[Reintentar]
```

## 16. Estructura de proyecto recomendada

``` text
src/
├── app/
├── components/
│   ├── layout/
│   │   ├── AppShell/
│   │   ├── Sidebar/
│   │   ├── Topbar/
│   │   └── MobileNavigation/
│   ├── dashboard/
│   │   ├── WelcomeHeader/
│   │   ├── KPIGrid/
│   │   ├── KPICard/
│   │   ├── WellbeingChart/
│   │   ├── TrainingProgress/
│   │   └── RotationRisk/
│   └── ui/
│       ├── Card/
│       ├── Button/
│       ├── Badge/
│       ├── Avatar/
│       ├── Progress/
│       └── Icon/
├── styles/
│   ├── globals.css
│   ├── tokens.css
│   └── responsive.css
├── lib/
├── hooks/
└── services/
```

## 17. Separación de datos y presentación

Preferir:

``` jsx
<KPICard
  title="Colaboradores"
  value={48}
  variation="+8%"
  icon="users"
/>
```

en lugar de introducir valores rígidos dentro del componente.

## 18. Base CSS

``` css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--text);
  font-family: Inter, system-ui, sans-serif;
}

img,
svg {
  max-width: 100%;
}

button,
input,
select,
textarea {
  font: inherit;
}

.main-area {
  min-width: 0;
  padding: 24px;
}

.dashboard-content {
  width: min(100%, 1600px);
  margin-inline: auto;
}
```

## 19. Evitar overflow

``` css
.main-area {
  min-width: 0;
}

img {
  max-width: 100%;
}

* {
  box-sizing: border-box;
}
```

En Grid:

``` css
grid-template-columns:
  minmax(0, 1fr)
  minmax(0, 1fr);
```

## 20. Botones

Deben existir variantes:

- Primary
- Secondary
- Tertiary

Y estados:

- normal;
- hover;
- focus;
- active;
- disabled;
- loading.

## 21. Responsive behavior matrix

| Componente | Desktop    | Tablet     | Móvil        |
|------------|------------|------------|--------------|
| Sidebar    | visible    | reducible  | oculto       |
| Mobile nav | oculta     | opcional   | visible      |
| Topbar     | completa   | reducida   | simplificada |
| KPI        | 4 columnas | 2 columnas | 1 columna    |
| Dashboard  | 3 columnas | 2 columnas | 1 columna    |
| Charts     | completos  | adaptados  | apilados     |
| Tablas     | completa   | adaptada   | scroll/card  |
| Buscador   | visible    | reducible  | icono/modal  |
| Acciones   | completas  | adaptadas  | priorizadas  |

## 22. Resoluciones de referencia

Desktop:

``` text
1440 × 900
```

Móvil:

``` text
390 × 844
```

Estas dimensiones sirven para validar visualmente, pero la
implementación no debe depender de ellas.

## 23. Animaciones

Las animaciones deben ser sutiles.

Respetar preferencias de reducción de movimiento:

``` css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    transition-duration: 0.01ms;
    scroll-behavior: auto;
  }
}
```

## 24. Reglas de implementación

1.  No convertir el mockup en una imagen.
2.  No usar posiciones absolutas para el layout principal.
3.  Los gráficos deben ser dinámicos.
4.  Los KPI deben ser reutilizables.
5.  El contenido debe poder cambiar sin romper el layout.
6.  Los textos largos no deben romper componentes.
7.  Los valores numéricos deben poder variar.
8.  Debe existir comportamiento específico para móvil.
9.  El CSS debe basarse en tokens y componentes.
10. El Home debe ser la primera pantalla de un Design System progresivo.

## 25. Criterios de aceptación

- [ ] Coincidencia visual general con el mockup.
- [ ] Funciona en desktop.
- [ ] Funciona en tablet.
- [ ] Funciona en móvil.
- [ ] No existe scroll horizontal accidental.
- [ ] Sidebar funcional.
- [ ] Navegación móvil funcional.
- [ ] KPI reutilizables.
- [ ] Gráficos dinámicos.
- [ ] Estados loading/empty/error.
- [ ] Botones con estados.
- [ ] Accesibilidad básica.
- [ ] Tokens de diseño centralizados.
- [ ] Logo mantiene proporciones.
- [ ] No se usa el mockup como imagen funcional.
- [ ] Componentes separados.
- [ ] Datos separados de presentación.

## 26. Resultado esperado

La interfaz debe transmitir:

- profesionalidad;
- simplicidad;
- confianza;
- cercanía;
- inteligencia;
- orden;
- orientación a personas;
- capacidad analítica;
- tecnología aplicada a la gestión humana.

Debe sentirse como una plataforma SaaS empresarial moderna, pero no
excesivamente técnica.

La información debe tener prioridad sobre la decoración visual.

## 27. Referencias técnicas

- [MDN — Media
  Queries](https://developer.mozilla.org/es/docs/Web/CSS/Guides/Media_queries)
- [MDN — Fundamentos de Media
  Queries](https://developer.mozilla.org/es/docs/Learn_web_development/Core/CSS_layout/Media_queries)
- [MDN — Diseño
  receptivo](https://developer.mozilla.org/es/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN — CSS Container
  Queries](https://developer.mozilla.org/es/docs/Web/CSS/Guides/Containment/Container_queries)
