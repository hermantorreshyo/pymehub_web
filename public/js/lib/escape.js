/**
 * Función de escape única (RNF-033, SEC-013).
 * La interfaz se construye con lib/dom.js y textContent; esta función queda para el
 * caso excepcional de componer HTML como texto (por ejemplo, la alternativa textual
 * de un gráfico o un documento descargable). Nunca se usa innerHTML con datos sin pasar por aquí.
 */
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => MAP[c]);
}
