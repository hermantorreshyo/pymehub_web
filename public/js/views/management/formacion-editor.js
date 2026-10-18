import { ApiError, skills, training } from '../../services/api.js';
import { session } from '../../lib/store.js';
import { h, uniqueId } from '../../lib/dom.js';
import { LABELS } from '../../lib/format.js';
import { href, navigate } from '../../lib/router.js';
import { CATEGORIAS, NIVELES } from '../../lib/training.js';
import { page } from '../../components/layout/Page.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox, clearFieldErrors, selectField, showFieldErrors, textField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { errorState, loadingState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

const TIPOS = { texto: 'Texto', lista: 'Lista de puntos', consejo: 'Consejo clave', imagen: 'Ilustración' };
const LIMITS = { objetivos: 5, bloques: 8, preguntasMin: 2, preguntasMax: 4, opcionesMin: 2, opcionesMax: 4 };

/**
 * Crear o editar un módulo propio (RF-046), sin IA: lo escribe la empresa con su conocimiento.
 * Se guarda como borrador y se publica desde la ficha del módulo.
 */
/**
 * El mismo editor sirve a los formadores de Pyme Hub Skills (fase 9d) para escribir sus cursos:
 * cambian la API, las rutas y los textos.
 */
function modo() {
  const formador = session.grupo === 'formador';
  return formador
    ? { api: skills, ficha: (id) => `/cursos/${id}`, lista: () => href('/inicio'), listaTexto: 'Volver a mis cursos', nombre: 'curso',
      subtitulo: 'Escribe un micro-curso de hasta 15 minutos con su cuestionario. Después fijarás el precio y lo enviarás a revisión.' }
    : { api: training, ficha: (id) => `/formacion/modulos/${id}`, lista: () => href('/formacion', { tab: 'catalogo' }), listaTexto: 'Volver al catálogo', nombre: 'módulo',
      subtitulo: 'Crea un micro-módulo con el conocimiento de tu empresa: normas del centro, procedimientos, acogida…' };
}

export default async function moduleEditorView({ params }) {
  const editing = Boolean(params.id);
  const M = modo();
  if (!editing) return { title: `Nuevo ${M.nombre}`, node: editorPage(null) };

  const root = h('div', {}, loadingState({ label: 'Cargando el módulo…', lines: 6 }));
  try {
    const m = await M.api.module(params.id);
    if (!m.propio) {
      root.replaceChildren(errorState({ error: new ApiError({ code: 'PH-PERM-001' }), title: 'El catálogo de Pyme Hub no se puede editar.' }));
    } else {
      return { title: 'Editar módulo', node: editorPage(m) };
    }
  } catch (error) {
    root.replaceChildren(errorState({ error, onRetry: () => navigate(`${M.ficha(params.id)}/editar`) }));
  }
  return { title: 'Editar módulo', node: page({ title: 'Editar módulo', children: [root] }).node };
}

function editorPage(m) {
  const notice = h('div', { 'aria-live': 'polite' });
  const objetivos = listEditor({
    title: 'Qué aprenderán',
    hint: 'De 1 a 5 objetivos, en una frase cada uno.',
    min: 1,
    max: LIMITS.objetivos,
    items: m?.contenido.objetivos ?? [''],
    addLabel: 'Añadir objetivo',
    render: (value, i) => textField({ name: `objetivo_${i}`, label: `Objetivo ${i + 1}`, value, attrs: { maxlength: 200 } }),
    read: (node) => node.querySelector('input').value.trim(),
  });
  const bloques = listEditor({
    title: 'Bloques',
    hint: 'De 1 a 8 bloques breves. El módulo completo debe leerse en 3 a 5 minutos.',
    min: 1,
    max: LIMITS.bloques,
    items: m?.contenido.bloques ?? [{ tipo: 'texto', titulo: '', texto: '' }],
    addLabel: 'Añadir bloque',
    render: blockEditor,
    read: readBlock,
  });
  const preguntas = listEditor({
    title: 'Cuestionario',
    hint: 'De 2 a 4 preguntas con 2 a 4 opciones. Marca la correcta. Se aprueba con el 70 % de aciertos.',
    min: LIMITS.preguntasMin,
    max: LIMITS.preguntasMax,
    items: m?.preguntas ?? [{ enunciado: '', opciones: ['', ''], correcta: 0 }, { enunciado: '', opciones: ['', ''], correcta: 0 }],
    addLabel: 'Añadir pregunta',
    render: questionEditor,
    read: readQuestion,
  });

  const puestos = h('fieldset', { class: 'field field--wide checks', dataset: { field: 'puestos_destino' } },
    h('legend', { class: 'field__label', text: 'Puestos a los que va dirigido' }),
    h('div', { class: 'checks__grid' }, Object.entries(LABELS.puesto).map(([value, text]) => {
      const id = uniqueId('puesto');
      return h('label', { class: 'checkbox', for: id },
        h('input', { type: 'checkbox', id, name: 'puestos_destino', value, checked: m?.puestos_destino.includes(value) ?? false }), h('span', { text }));
    })),
    h('p', { class: 'field__hint', text: 'Si no marcas ninguno, se muestra para todos los puestos.' }),
    h('p', { class: 'field__error', hidden: true }));

  const submit = button({ text: m ? 'Guardar cambios' : 'Guardar borrador', type: 'submit', iconName: 'circle-check' });
  const form = h('form', { class: 'form stack', novalidate: true },
    card({
      title: 'Datos del módulo',
      iconName: 'file-text',
      body: h('div', { class: 'form__grid' },
        textField({ name: 'titulo', label: 'Título', required: true, value: m?.titulo ?? '', wide: true, attrs: { maxlength: 150 } }),
        textField({ name: 'resumen', label: 'Resumen', required: true, value: m?.resumen ?? '', wide: true, hint: 'Una frase que explique para qué sirve (10 a 300 caracteres).', attrs: { maxlength: 300 } }),
        selectField({ name: 'categoria', label: 'Categoría', required: true, value: m?.categoria ?? '', placeholder: 'Elige una categoría', options: Object.entries(CATEGORIAS).map(([value, c]) => ({ value, label: c.label })) }),
        selectField({ name: 'nivel', label: 'Nivel', value: m?.nivel ?? 'BASICO', options: Object.entries(NIVELES).map(([value, text]) => ({ value, label: text })) }),
        textField({ name: 'duracion_min', label: 'Duración (minutos)', type: 'number', required: true, value: m?.duracion_min ?? 4, attrs: { min: 1, max: 15, inputmode: 'numeric' } }),
        textField({ name: 'etiquetas', label: 'Etiquetas', value: (m?.etiquetas ?? []).join(', '), hint: 'Separadas por comas (hasta 8).', attrs: { maxlength: 250 } }),
        puestos),
    }),
    card({ title: 'Qué aprenderán', iconName: 'target', body: objetivos.node }),
    card({ title: 'Bloques de contenido', iconName: 'book-open', body: bloques.node }),
    card({ title: 'Cuestionario', iconName: 'list-checks', body: preguntas.node }),
    notice,
    h('div', { class: 'form__actions' },
      linkButton({ text: 'Cancelar', href: m ? href(modo().ficha(m.id)) : modo().lista(), variant: 'tertiary' }),
      submit));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const v = (name) => form.elements[name].value.trim();
    const input = {
      titulo: v('titulo'),
      resumen: v('resumen'),
      categoria: v('categoria'),
      nivel: v('nivel'),
      duracion_min: Number(v('duracion_min')),
      etiquetas: v('etiquetas').split(',').map((t) => t.trim()).filter(Boolean),
      puestos_destino: [...form.querySelectorAll('input[name="puestos_destino"]:checked')].map((c) => c.value),
      contenido: { objetivos: objetivos.read(), bloques: bloques.read() },
      preguntas: preguntas.read(),
    };
    const errors = {};
    if (input.titulo.length < 3) errors.titulo = 'Escribe un título (al menos 3 caracteres).';
    if (input.resumen.length < 10) errors.resumen = 'Escribe un resumen (al menos 10 caracteres).';
    if (!input.categoria) errors.categoria = 'Elige una categoría.';
    if (!(input.duracion_min >= 1 && input.duracion_min <= 15)) errors.duracion_min = 'Entre 1 y 15 minutos.';
    if (Object.keys(errors).length) { showFieldErrors(form, errors); return; }

    setLoading(submit, true, 'Guardando…');
    try {
      const { api } = modo();
      const saved = m ? await api.updateModule(m.id, input) : await api.createModule(input);
      toast(m ? 'Cambios guardados.' : 'Borrador guardado. Revísalo y publícalo cuando esté listo.');
      navigate(modo().ficha(saved.id));
    } catch (error) {
      setLoading(submit, false);
      const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
      const orphan = showFieldErrors(form, fieldErrors);
      const items = Object.entries(orphan).map(([k, msg]) => `${fieldName(k)}: ${msg}`);
      notice.append(alertBox({ tone: 'danger', title: error.message, items }));
      notice.scrollIntoView({ block: 'center' });
    }
  });

  return page({
    title: m ? `Editar ${modo().nombre}` : `Nuevo ${modo().nombre}`,
    subtitle: m ? m.titulo : modo().subtitulo,
    back: { href: m ? href(modo().ficha(m.id)) : modo().lista(), label: m ? `Volver al ${modo().nombre}` : modo().listaTexto },
    children: [h('div', { class: 'cq' }, form)],
  }).node;
}

/** Traduce rutas de error de la API (contenido.bloques.2) a texto. */
function fieldName(key) {
  const p = key.split('.');
  if (p[0] === 'preguntas') return p[1] !== undefined ? `Pregunta ${Number(p[1]) + 1}` : 'Cuestionario';
  if (p[1] === 'bloques') return p[2] !== undefined ? `Bloque ${Number(p[2]) + 1}` : 'Bloques';
  if (p[1] === 'objetivos') return p[2] !== undefined ? `Objetivo ${Number(p[2]) + 1}` : 'Objetivos';
  return key;
}

/* ---------- Lista editable genérica (añadir, quitar, reordenar) ---------- */

function listEditor({ hint, min, max, items, addLabel, render, read }) {
  const list = h('ol', { class: 'edit-list', role: 'list' });
  const add = button({ text: addLabel, variant: 'secondary', iconName: 'plus', onClick: () => { push(null); list.lastElementChild?.querySelector('input, select, textarea')?.focus(); } });
  const values = () => [...list.children].map((li) => read(li.firstElementChild));

  function push(value) {
    const li = h('li', { class: 'edit-list__item' });
    paintItem(li, value);
    list.append(li);
    sync();
  }
  function paintItem(li, value) {
    const index = [...list.children].indexOf(li) === -1 ? list.children.length : [...list.children].indexOf(li);
    const content = render(value ?? undefined, index);
    const remove = button({ text: 'Quitar', variant: 'tertiary', iconName: 'trash-2', onClick: () => { li.remove(); sync(); add.focus(); } });
    remove.classList.add('edit-list__remove');
    li.replaceChildren(content, remove);
  }
  function sync() {
    const n = list.children.length;
    add.disabled = n >= max;
    [...list.children].forEach((li) => { li.querySelector('.edit-list__remove').disabled = n <= min; });
  }
  items.forEach((v) => push(v));
  return {
    node: h('div', { class: 'stack' }, h('p', { class: 'small muted', text: hint }), list, h('div', {}, add)),
    read: values,
  };
}

function blockEditor(b = { tipo: 'texto', titulo: '', texto: '' }, i) {
  const wrap = h('div', { class: 'block-edit', dataset: { field: `contenido.bloques.${i}` } });
  const fields = h('div', { class: 'block-edit__fields' });
  const tipo = selectField({ name: `tipo_${i}`, label: `Bloque ${i + 1}: tipo`, value: b.tipo, options: Object.entries(TIPOS).map(([value, text]) => ({ value, label: text })) });
  const select = tipo.querySelector('select');
  select.classList.add('block-edit__type');
  function paint(t, data = {}) {
    if (t === 'texto') {
      fields.replaceChildren(
        textField({ name: `titulo_${i}`, label: 'Título', value: data.titulo ?? '', attrs: { maxlength: 80, 'data-k': 'titulo' } }),
        textarea(`texto_${i}`, 'Texto', data.texto ?? '', 1200, 'texto'));
    } else if (t === 'lista') {
      fields.replaceChildren(
        textField({ name: `titulo_${i}`, label: 'Título', value: data.titulo ?? '', attrs: { maxlength: 80, 'data-k': 'titulo' } }),
        textarea(`items_${i}`, 'Puntos (uno por línea, hasta 8)', (data.items ?? []).join('\n'), 1600, 'items'));
    } else if (t === 'consejo') {
      fields.replaceChildren(textarea(`texto_${i}`, 'Consejo', data.texto ?? '', 300, 'texto'));
    } else {
      fields.replaceChildren(
        selectField({ name: `ilustracion_${i}`, label: 'Ilustración', value: data.ilustracion ?? '', placeholder: 'La de la categoría del módulo', options: Object.entries(CATEGORIAS).map(([value, c]) => ({ value, label: c.short })) }),
        textField({ name: `alt_${i}`, label: 'Descripción de la imagen', value: data.alt ?? '', hint: 'Para lectores de pantalla (hasta 150 caracteres).', attrs: { maxlength: 150, 'data-k': 'alt' } }));
      fields.querySelector('select').dataset.k = 'ilustracion';
    }
  }
  select.addEventListener('change', () => paint(select.value));
  paint(b.tipo, b);
  wrap.append(tipo, fields);
  return wrap;
}

function textarea(name, labelText, value, max, key) {
  const id = uniqueId(name);
  return h('div', { class: 'field field--wide' },
    h('label', { class: 'field__label', for: id, text: labelText }),
    h('textarea', { id, name, class: 'textarea', rows: 3, maxlength: max, 'data-k': key, text: value }));
}

function readBlock(node) {
  const tipo = node.querySelector('.block-edit__type').value;
  const k = (key) => node.querySelector(`[data-k="${key}"]`)?.value.trim() ?? '';
  if (tipo === 'texto') return { tipo, titulo: k('titulo'), texto: k('texto') };
  if (tipo === 'lista') return { tipo, titulo: k('titulo'), items: k('items').split('\n').map((t) => t.trim()).filter(Boolean) };
  if (tipo === 'consejo') return { tipo, texto: k('texto') };
  const out = { tipo, alt: k('alt') };
  if (k('ilustracion')) out.ilustracion = k('ilustracion');
  return out;
}

function questionEditor(p = { enunciado: '', opciones: ['', ''], correcta: 0 }, i) {
  const group = uniqueId(`correcta${i}`);
  const opts = h('ol', { class: 'q-edit__opts', role: 'list' });
  const addOpt = button({ text: 'Añadir opción', variant: 'tertiary', iconName: 'plus', onClick: () => { pushOpt(''); } });
  function pushOpt(text, correct = false) {
    const n = opts.children.length;
    const id = uniqueId('op');
    const li = h('li', { class: 'q-edit__opt' },
      h('input', { type: 'radio', name: group, value: n, checked: correct, 'aria-label': `Marcar la opción ${n + 1} como correcta` }),
      h('label', { class: 'visually-hidden', for: id, text: `Opción ${n + 1}` }),
      h('input', { id, class: 'input', type: 'text', maxlength: 150, value: text, placeholder: `Opción ${n + 1}`, 'data-op': '' }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': `Quitar la opción ${n + 1}`, onclick: () => { li.remove(); syncOpts(); } }, icon('x')));
    opts.append(li);
    syncOpts();
  }
  function syncOpts() {
    const n = opts.children.length;
    addOpt.disabled = n >= LIMITS.opcionesMax;
    [...opts.children].forEach((li, k) => {
      li.querySelector('input[type="radio"]').value = k;
      li.querySelector('button').disabled = n <= LIMITS.opcionesMin;
    });
    if (!opts.querySelector('input[type="radio"]:checked')) opts.querySelector('input[type="radio"]')?.click();
  }
  p.opciones.forEach((o, k) => pushOpt(o, k === p.correcta));
  return h('div', { class: 'q-edit', dataset: { field: `preguntas.${i}` } },
    textField({ name: `enunciado_${i}`, label: `Pregunta ${i + 1}`, value: p.enunciado, wide: true, attrs: { maxlength: 300, 'data-k': 'enunciado' } }),
    h('p', { class: 'small muted hint-inline' }, icon('circle-check', { size: 'sm' }), 'Marca la opción correcta.'),
    opts,
    addOpt);
}

function readQuestion(node) {
  const opciones = [...node.querySelectorAll('[data-op]')].map((i) => i.value.trim());
  const checked = node.querySelector('input[type="radio"]:checked');
  return { enunciado: node.querySelector('[data-k="enunciado"]').value.trim(), opciones, correcta: checked ? Number(checked.value) : 0 };
}
