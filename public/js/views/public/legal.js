import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { euros, holder, loadParams } from '../../lib/params.js';
import { icon } from '../../components/ui/Icon.js';
import { alertBox } from '../../components/ui/Field.js';
import { loadingState } from '../../components/ui/StateView.js';

/**
 * Textos legales (fase 9a): aviso legal, privacidad, términos de contratación, cookies y
 * términos de Pyme Hub Skills. Públicos, con y sin sesión (#/legal/:doc).
 *
 * Los datos del titular y los importes salen de los parámetros de la plataforma: mientras la
 * sociedad no esté constituida, se indica en lugar de inventar datos. Son borradores que deben
 * revisarse jurídicamente antes de la comercialización.
 */

const DOCS = {
  aviso: { title: 'Aviso legal', build: aviso },
  privacidad: { title: 'Política de privacidad', build: privacidad },
  terminos: { title: 'Términos y condiciones de contratación', build: terminos },
  cookies: { title: 'Cookies y almacenamiento local', build: cookies },
  skills: { title: 'Condiciones de Pyme Hub Skills', build: skills },
};

export default function legalView({ params }) {
  const doc = DOCS[params.doc] ? params.doc : 'aviso';
  const body = h('div', { class: 'legal__body' }, loadingState({ label: 'Cargando el texto…', lines: 6 }));
  loadParams().then((p) => body.replaceChildren(...DOCS[doc].build(p), footerNote(p)));

  const back = session.isAuthenticated ? '#/inicio' : '#/';
  const node = h('div', { class: 'site legal' },
    h('header', { class: 'site__header' },
      h('div', { class: 'site__bar' },
        h('a', { class: 'site__brand', href: '#/', 'aria-label': 'Pyme Hub, inicio' },
          h('img', { src: 'assets/brand/logo.png', alt: '', width: 150, height: 40 })),
        h('a', { class: 'btn btn--secondary', href: back }, icon('arrow-left'), h('span', { text: session.isAuthenticated ? 'Volver a mi panel' : 'Volver al inicio' })))),
    h('main', { id: 'contenido', tabindex: '-1', class: 'site__wrap legal__main' },
      h('nav', { class: 'tabs legal__nav', 'aria-label': 'Textos legales' },
        Object.entries(DOCS).map(([id, d]) => h('a', { class: 'tabs__link', href: `#/legal/${id}`, 'aria-current': id === doc ? 'page' : null, text: d.title }))),
      h('article', { class: 'legal__doc' },
        h('h1', { tabindex: '-1', text: DOCS[doc].title }),
        body)));
  return { title: DOCS[doc].title, node };
}

/* ---------- Piezas ---------- */

function sec(title, ...content) {
  return h('section', { class: 'legal__sec' }, h('h2', { text: title }), ...content);
}
const p = (text) => h('p', { text });
const ul = (items) => h('ul', {}, items.map((t) => h('li', { text: t })));

/** Datos del titular, o el aviso de constitución pendiente. */
function titular(prm) {
  const name = holder(prm);
  if (!name) {
    return alertBox({
      tone: 'info',
      title: 'Sociedad en constitución',
      text: `Pyme Hub está en fase de lanzamiento y la sociedad titular todavía no está constituida. Sus datos (razón social, NIF, domicilio y datos registrales) se publicarán aquí en cuanto lo esté. Mientras tanto, para cualquier consulta: ${prm['titular.email']}.`,
    });
  }
  return h('dl', { class: 'data-list legal__holder' },
    [['Titular', name], ['NIF', prm['titular.nif']], ['Domicilio', prm['titular.domicilio']], ['Datos registrales', prm['titular.registro_mercantil']],
      ['Correo', prm['titular.email']], ['Teléfono', prm['titular.telefono']]]
      .filter(([, v]) => v)
      .map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))));
}

function who(prm) {
  return holder(prm) ?? 'el titular de Pyme Hub (sociedad en constitución)';
}

function footerNote(prm) {
  return h('p', { class: 'small muted legal__version' }, icon('file-text', { size: 'sm' }),
    ` Versión ${prm['legal.version']}. Texto pendiente de revisión jurídica antes de la comercialización.`);
}

/* ---------- Aviso legal (LSSI, art. 10) ---------- */

function aviso(prm) {
  return [
    sec('Titular del sitio', titular(prm)),
    sec('Objeto', p('Este sitio y la aplicación Pyme Hub (pymehub.hermantorres.com y su API) ofrecen a pequeñas y medianas empresas una plataforma de bienestar, formación e inteligencia artificial para la gestión de personas. El acceso a la aplicación está reservado a las empresas cliente y a las personas que estas invitan.')),
    sec('Condiciones de uso', ul([
      'Quien usa el sitio se compromete a hacerlo de forma lícita y a no comprometer su seguridad ni su funcionamiento.',
      'Las credenciales son personales; la empresa cliente responde del uso que hagan las cuentas que invita.',
      'La demostración pública usa datos 100 % ficticios y se restaura cada noche.',
    ])),
    sec('Propiedad intelectual', p('El software, la marca Pyme Hub, el diseño y los contenidos del catálogo de formación pertenecen a su titular o se usan con licencia. Los contenidos que cada empresa crea (módulos propios, datos de su plantilla) son suyos y puede exportarlos en cualquier momento.')),
    sec('Responsabilidad', p('Pyme Hub orienta decisiones de gestión de personas, pero no las toma: las puntuaciones de riesgo y las recomendaciones de la inteligencia artificial son apoyo a una decisión que siempre corresponde a una persona.')),
    sec('Legislación aplicable', p('Este aviso se rige por la legislación española, en particular la Ley 34/2002 de servicios de la sociedad de la información (LSSI).')),
  ];
}

/* ---------- Privacidad (RGPD y LOPDGDD) ---------- */

function privacidad(prm) {
  const contacto = prm['titular.email_privacidad'] || prm['titular.email'];
  return [
    p('Esta política explica qué datos trata Pyme Hub, para qué, con qué base legal, durante cuánto tiempo y cómo ejercer tus derechos. Pyme Hub trata datos con dos papeles distintos, según de quién sean.'),
    sec('1. Quién es responsable', titular(prm), ul([
      `Datos de las empresas cliente y de sus cuentas de gestión (gerencia y RR. HH.), facturación y contacto comercial: el responsable es ${who(prm)}.`,
      'Datos de las personas empleadas de cada empresa (plantilla, incidencias, formación, bienestar y riesgo de rotación): la responsable es la empresa cliente que contrata Pyme Hub, que actúa como empleadora. Pyme Hub los trata por su cuenta como encargado del tratamiento (art. 28 RGPD), con un contrato de encargo que la empresa firma antes de invitar a su plantilla.',
    ]), p(`Contacto para protección de datos: ${contacto}.`)),
    sec('2. Qué datos tratamos y para qué', ul([
      'Cuenta: nombre, apellidos, correo, perfil y accesos, para identificarte y proteger tu cuenta.',
      'Ficha laboral: puesto, equipo, turno, tipo de contrato, fechas de alta y baja, y motivo de la baja, para que tu empresa organice su plantilla y mida su rotación.',
      'Incidencias laborales: ausencias injustificadas, retrasos, siniestros, quejas de clientes y reconocimientos. Nunca bajas médicas ni su causa.',
      'Formación: módulos asignados o elegidos, avance y resultados de los cuestionarios.',
      'Check-in de bienestar (voluntario): ánimo, energía y estrés, y una nota opcional que se guarda cifrada y que solo puedes leer tú. Tu empresa solo ve medias de grupos de 5 personas o más; nunca tus respuestas.',
      'Riesgo de rotación (plan Completo): una puntuación calculada con reglas documentadas a partir de la ficha, las incidencias y la formación. No usa datos de salud ni del check-in. Orienta una conversación; ninguna decisión sobre ti se toma de forma automatizada (art. 22 RGPD).',
      'Asesor de formación: tus preferencias de aprendizaje. Al proveedor de IA solo se envían el puesto, el tramo de antigüedad, el turno, las preferencias y el catálogo; nunca tu nombre, tu empresa ni datos de salud.',
      'Empresas cliente: datos de contacto, plan, empleados facturables, facturas y pagos.',
      'Visitas del sitio por los códigos QR: solo recuentos (campaña y tipo de dispositivo), sin IP, sin identificadores y sin cookies.',
    ])),
    sec('3. Base legal', ul([
      'Contrato de servicio con la empresa cliente y, para sus cuentas, la ejecución de ese contrato (art. 6.1.b RGPD).',
      'Para los datos de la plantilla, la base que corresponde a la empresa empleadora: la gestión de la relación laboral y su interés legítimo en organizar y formar a su equipo (art. 6.1.b y 6.1.f).',
      'El check-in de bienestar es siempre voluntario: no responder no tiene ninguna consecuencia ni interviene en ningún cálculo.',
      'Obligaciones legales de facturación y contabilidad (art. 6.1.c).',
    ])),
    sec('4. Destinatarios y encargados', ul([
      'Proveedor de alojamiento del servidor (Hostinger). La ubicación de los servidores se confirmará en el contrato de encargo.',
      'Mistral AI (Francia, Unión Europea), solo para el asesor de formación y sin datos identificativos.',
      'Stripe Payments Europe (Irlanda, Unión Europea), para los pagos con tarjeta o domiciliación. Pyme Hub nunca ve ni guarda los datos completos de la tarjeta.',
      'No se ceden datos a terceros salvo obligación legal.',
    ])),
    sec('5. Cuánto tiempo los conservamos', ul([
      'Check-ins de bienestar y consultas al asesor: 12 meses.',
      `Datos de una empresa que se da de baja: se pueden exportar y se borran definitivamente a los ${prm['operacion.dias_borrado_tras_baja']} días.`,
      'Datos de una persona que deja la empresa: hasta que la empresa los suprima o se dé de baja. Para los indicadores de rotación solo se conservan, anonimizados, fechas, motivo, puesto y equipo.',
      'Facturas y datos de facturación: los plazos que exigen las normas mercantiles y fiscales.',
    ])),
    sec('6. Tus derechos', p('Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad:'), ul([
      'Desde la aplicación: «Más» → «Descargar mis datos» te da una copia completa en un archivo.',
      'Si eres empleado o empleada, dirígete primero a tu empresa, que es la responsable; Pyme Hub la ayudará a atenderte.',
      `En cualquier caso, escribiendo a ${contacto}.`,
      'Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
    ])),
    sec('7. Seguridad', p('Conexiones cifradas (HTTPS), contraseñas con Argon2id, notas del check-in cifradas, aislamiento estricto de los datos de cada empresa, registro de accesos a la información sensible, copias de seguridad diarias y revisión trimestral de sesgos del modelo de riesgo.')),
  ];
}

/* ---------- Términos de contratación (B2B) ---------- */

function terminos(prm) {
  const iva = prm['precios.iva_pct'];
  const desc = prm['precios.descuento_anual_pct'];
  return [
    sec('1. Partes y objeto', titular(prm), p(`Estos términos regulan la contratación de Pyme Hub, un servicio de software en la nube para empresas (no para consumidores), entre ${who(prm)} y la empresa cliente.`)),
    sec('2. Planes y precios', ul([
      `Plan Entrada: ${euros(prm['precios.entrada_mes'])} + IVA por empleado activo y mes.`,
      `Plan Completo: ${euros(prm['precios.completo_mes'])} + IVA por empleado activo y mes.`,
      desc > 0 ? `Pago anual: 12 meses con un ${desc} % de descuento.` : 'Pago anual: 12 meses al mismo precio mensual.',
      `Precios para empresas. IVA (${iva} %) no incluido; en cada pedido y factura se desglosan la base, el IVA y el total.`,
      'Se factura por los empleados de alta en la plataforma; el importe se ajusta cuando cambia la plantilla.',
    ])),
    sec('3. Prueba gratuita y duración', ul([
      `Las empresas nuevas disponen de ${prm['suscripcion.dias_prueba']} días de prueba gratuita, sin compromiso.`,
      'El plan mensual no tiene permanencia y se renueva cada mes; el anual se renueva cada año. Se puede cancelar en cualquier momento con efecto al final del periodo pagado.',
    ])),
    sec('4. Pago e impago', ul([
      'El pago se realiza por adelantado mediante tarjeta o domiciliación SEPA, a través de Stripe.',
      'Si un pago falla o la suscripción vence, se abre un periodo de gracia con avisos. Al terminar, la cuenta pasa a solo lectura hasta regularizar el pago: los datos no se pierden y se pueden exportar.',
    ])),
    sec('5. Datos y encargo del tratamiento', ul([
      'La empresa cliente es responsable de los datos de su plantilla y Pyme Hub actúa como encargado del tratamiento, conforme al contrato de encargo que se firma antes de invitar a la plantilla.',
      'La empresa puede exportar todos sus datos en cualquier momento (Configuración → Tus datos).',
      `Tras la baja, la cuenta queda en solo lectura y los datos se borran definitivamente a los ${prm['operacion.dias_borrado_tras_baja']} días.`,
    ])),
    sec('6. Nivel de servicio', ul([
      'Disponibilidad objetivo del 99,5 % mensual, medida por monitorización externa.',
      'Soporte en menos de 4 horas laborables.',
      'Los mantenimientos programados se anuncian en la aplicación con al menos 48 horas de antelación.',
    ])),
    sec('7. Inteligencia artificial y decisiones', p('El riesgo de rotación y las recomendaciones de formación orientan, pero no deciden. La empresa se compromete a no adoptar decisiones sobre las personas basadas únicamente en ellas y a mantener siempre la supervisión humana.')),
    sec('8. Responsabilidad, cambios y ley aplicable', ul([
      'La responsabilidad de Pyme Hub se limita al importe pagado en los últimos 12 meses, salvo dolo o culpa grave.',
      'Los cambios de estos términos se comunican con 30 días de antelación; la empresa puede cancelar si no los acepta.',
      'Se rigen por la legislación española; para cualquier controversia, los juzgados del domicilio del titular.',
    ])),
  ];
}

/* ---------- Cookies (LSSI, art. 22.2) ---------- */

function cookies() {
  return [
    p('Pyme Hub no usa cookies de publicidad, analítica de terceros ni seguimiento. Solo utiliza elementos técnicos imprescindibles para prestar el servicio, que no requieren consentimiento (art. 22.2 LSSI):'),
    ul([
      'Cookie de sesión de la API (HttpOnly, segura): mantiene tu sesión iniciada. Se borra al cerrar la sesión o tras el tiempo de inactividad.',
      'Almacenamiento local del navegador: la caché de la aplicación para que funcione sin cobertura, los registros pendientes de enviar y tu último perfil para abrirla sin conexión. Se borran al cerrar la sesión.',
    ]),
    p('Las visitas que llegan por los códigos QR se cuentan sin cookies ni identificadores. Puedes borrar estos datos en cualquier momento desde la configuración de tu navegador.'),
  ];
}

/* ---------- Pyme Hub Skills (marketplace) ---------- */

function skills(prm) {
  const exenta = prm['marketplace.formacion_exenta_iva'];
  return [
    sec('1. Qué es Pyme Hub Skills', titular(prm), p('Un catálogo de cursos creados por formadores externos verificados, que las empresas cliente pueden comprar para su plantilla y que las personas empleadas pueden comprar por su cuenta.')),
    sec('2. Precios e IVA', ul([
      'Compras de empresas: el precio se muestra sin IVA (+ IVA) y la factura desglosa la base, el IVA y el total.',
      'Compras de una persona por su cuenta (consumidor): el precio se muestra con el IVA incluido.',
      exenta
        ? 'La formación de Skills se trata como exenta de IVA según el criterio de la gestoría.'
        : 'La posible exención de IVA de la formación está pendiente de confirmar por la gestoría; mientras tanto se aplica el IVA general.',
    ])),
    sec('3. Formadores', ul([
      'Cada formador se da de alta y verifica su identidad y sus datos de cobro con Stripe.',
      'Pyme Hub revisa cada curso antes de publicarlo.',
      `Por cada venta, Pyme Hub retiene una comisión del ${prm['marketplace.comision_pct']} % y el resto se liquida al formador a través de Stripe.`,
    ])),
    sec('4. Desistimiento (consumidores)', p('Las personas que compran como consumidores disponen de 14 días para desistir. Al tratarse de contenido digital, el derecho se pierde cuando, con su consentimiento expreso, empiezan a cursarlo (art. 103.m del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios).')),
    sec('5. Fase de lanzamiento', p('Skills funciona actualmente en modo de prueba: los pagos se realizan con tarjetas de prueba de Stripe y no se cobra ningún importe real.')),
  ];
}
