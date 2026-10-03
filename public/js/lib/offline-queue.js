/**
 * Cola sin conexión en IndexedDB (RF-062): guarda peticiones que modifican datos
 * (check-ins, avances de formación) y las reenvía al recuperar la red.
 * Cada elemento lleva una clave única para que el servidor pueda tratar el reenvío
 * como idempotente; el contrato de idempotencia llega con los endpoints de bienestar.
 */
import { request } from '../services/api.js';

const DB_NAME = 'pymehub';
const STORE = 'cola_offline';
const RETRY_LATER = /^PH-(NET-001|AUTH-002|AUTH-003|RATE-001|SYS-\d+)$/;
const listeners = new Set();

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'clave' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(result?.result ?? result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

function notify() {
  pending().then((n) => listeners.forEach((fn) => fn(n))).catch(() => {});
}

/** Encola una petición: { method, path, json }. Devuelve la clave asignada. */
export async function enqueue({ method, path, json }) {
  const item = { clave: crypto.randomUUID(), method, path, json, creadoEn: new Date().toISOString() };
  await tx('readwrite', (store) => store.add(item));
  notify();
  return item.clave;
}

export async function pending() {
  if (!('indexedDB' in window)) return 0;
  return tx('readonly', (store) => store.count());
}

/**
 * Reenvía en orden. Un error de red detiene el reenvío (se reintentará); un error de
 * la API descarta el elemento para no bloquear la cola y se informa al llamante.
 */
export async function flush() {
  if (!navigator.onLine || !('indexedDB' in window)) return { sent: 0, failed: [] };
  const items = await tx('readonly', (store) => store.getAll());
  items.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  let sent = 0;
  const failed = [];
  for (const item of items) {
    try {
      await request(item.method, item.path, { json: item.json });
      sent += 1;
    } catch (err) {
      // Sin red, sin sesión o servidor no disponible: se conserva y se reintenta después
      if (RETRY_LATER.test(err?.code ?? '')) break;
      failed.push({ item, error: err });
    }
    await tx('readwrite', (store) => store.delete(item.clave));
  }
  notify();
  return { sent, failed };
}

export function onPendingChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
