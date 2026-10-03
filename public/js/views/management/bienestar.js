import { comingSoonPage } from '../shared/proximamente.js';

/** Bienestar agregado del equipo (§11). Pendiente de los endpoints de la fase 4. */
export default function bienestarView() {
  return comingSoonPage({
    title: 'Bienestar',
    subtitle: 'Conoce cómo se siente tu equipo y detecta a tiempo las situaciones que necesitan atención.',
    iconName: 'heart',
    heading: 'Estamos preparando el panel de bienestar.',
    text: 'Verás el índice de bienestar de cada equipo, siempre agregado y con un mínimo de 5 respuestas para que nadie quede identificado.',
  });
}
