// Tiny IndexedDB key-value store. Used for large values (base64 design images) that would
// blow past localStorage's ~5MB quota. Every call is a safe no-op on the server or when
// IndexedDB is unavailable (e.g. some private-browsing modes).

const DB_NAME = "yeulumin-design-lab";
const STORE_NAME = "kv";

const hasIdb = () => typeof indexedDB !== "undefined";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = op(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      })
  );
}

export async function idbGet<T = unknown>(key: string): Promise<T | null> {
  if (!hasIdb()) return null;
  try {
    return ((await run<T | undefined>("readonly", (s) => s.get(key))) ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  if (!hasIdb()) return false;
  try {
    await run("readwrite", (s) => s.put(value, key));
    return true;
  } catch (err) {
    console.warn("IndexedDB write failed", err);
    return false;
  }
}

export async function idbDel(key: string): Promise<void> {
  if (!hasIdb()) return;
  try {
    await run("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
}
