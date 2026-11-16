/**
 * Persistent Photo Vault for Backlog & Add Activity documentation photos.
 * Combines a synchronous in-memory cache with IndexedDB persistence so photos:
 * 1. Never vanish when browser localStorage approaches its ~5MB quota
 * 2. Never get wiped by Google Sheets pull/sync (when cells exceed Sheets' 50k char limit)
 * 3. Always appear immediately when opening Edit Data across page reloads
 */

export type PhotoEntityType = 'BACKLOG' | 'ACTIVITY';

interface VaultPhotoRecord {
  key: string;
  photos: string[];
  cleared: boolean;
  updatedAt: number;
}

const DB_NAME = 'plant2_photo_vault_v1';
const STORE_NAME = 'item_photos';
const DB_VERSION = 1;
const CLEARED_FLAGS_STORAGE_KEY = 'plant2_photo_cleared_flags_v1';
const PHOTO_BACKUP_STORAGE_KEY = 'plant2_photo_backup_v1';

const vaultMemory = new Map<string, VaultPhotoRecord>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let initPromise: Promise<void> | null = null;

const makeKey = (type: PhotoEntityType, id: string): string =>
  `${type}:${String(id || '').trim()}`;

const isUsablePhoto = (val: unknown): val is string => {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
};

const normalizePhotoList = (photos?: string[], single?: string): string[] => {
  const raw = Array.isArray(photos) && photos.length > 0 ? photos : single ? [single] : [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const p of raw) {
    if (isUsablePhoto(p)) {
      const trimmed = p.trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        clean.push(trimmed);
      }
    }
  }
  return clean;
};

const readClearedFlags = (): Record<string, boolean> => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(CLEARED_FLAGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeClearedFlag = (key: string, cleared: boolean) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const flags = readClearedFlags();
    if (cleared) {
      flags[key] = true;
    } else {
      delete flags[key];
    }
    localStorage.setItem(CLEARED_FLAGS_STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // Ignore storage error
  }
};

const readLocalBackup = (): Record<string, string[]> => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(PHOTO_BACKUP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeLocalBackupEntry = (key: string, photos: string[] | null) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const backup = readLocalBackup();
    if (!photos || photos.length === 0) {
      delete backup[key];
    } else {
      backup[key] = photos;
    }
    localStorage.setItem(PHOTO_BACKUP_STORAGE_KEY, JSON.stringify(backup));
  } catch {
    // Expected when total photo payloads approach 5MB localStorage limit; IndexedDB remains authoritative
  }
};

const openPhotoDb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('IndexedDB unavailable for photo vault, using fallback.');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
};

/**
 * Loads all persisted photo records from IndexedDB & localStorage backup into memory.
 * Safe to call multiple times; deduplicates concurrent initializations.
 */
export const initPhotoVault = async (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Seed from localStorage backup synchronously first
    const clearedFlags = readClearedFlags();
    const localBackup = readLocalBackup();

    for (const [key, photos] of Object.entries(localBackup)) {
      if (!vaultMemory.has(key) && Array.isArray(photos) && photos.length > 0) {
        vaultMemory.set(key, {
          key,
          photos: normalizePhotoList(photos),
          cleared: Boolean(clearedFlags[key]),
          updatedAt: 0,
        });
      }
    }

    for (const [key, isCleared] of Object.entries(clearedFlags)) {
      if (isCleared && !vaultMemory.has(key)) {
        vaultMemory.set(key, {
          key,
          photos: [],
          cleared: true,
          updatedAt: 0,
        });
      }
    }

    const db = await openPhotoDb();
    if (!db) return;

    await new Promise<void>(resolve => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = Array.isArray(req.result) ? (req.result as VaultPhotoRecord[]) : [];
          for (const row of rows) {
            if (!row || !row.key) continue;
            const existing = vaultMemory.get(row.key);
            // Keep newer in-memory mutation if user edited during startup
            if (!existing || existing.updatedAt <= (row.updatedAt || 0)) {
              vaultMemory.set(row.key, {
                key: row.key,
                photos: normalizePhotoList(row.photos),
                cleared: Boolean(row.cleared),
                updatedAt: row.updatedAt || Date.now(),
              });
            }
          }
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  })();

  return initPromise;
};

export const getVaultPhotos = (type: PhotoEntityType, id: string): string[] | undefined => {
  if (!id) return undefined;
  const key = makeKey(type, id);
  const entry = vaultMemory.get(key);
  if (entry) {
    if (entry.cleared) return [];
    if (entry.photos.length > 0) return [...entry.photos];
  }
  const backup = readLocalBackup()[key];
  if (Array.isArray(backup) && backup.length > 0) {
    return normalizePhotoList(backup);
  }
  return undefined;
};

export const isVaultPhotosCleared = (type: PhotoEntityType, id: string): boolean => {
  if (!id) return false;
  const key = makeKey(type, id);
  const entry = vaultMemory.get(key);
  if (entry) return Boolean(entry.cleared);
  return Boolean(readClearedFlags()[key]);
};

export const saveVaultPhotos = async (
  type: PhotoEntityType,
  id: string,
  photos: string[]
): Promise<void> => {
  if (!id) return;
  const key = makeKey(type, id);
  const cleanPhotos = normalizePhotoList(photos);
  const isCleared = cleanPhotos.length === 0;

  const record: VaultPhotoRecord = {
    key,
    photos: cleanPhotos,
    cleared: isCleared,
    updatedAt: Date.now(),
  };

  vaultMemory.set(key, record);
  writeClearedFlag(key, isCleared);
  writeLocalBackupEntry(key, cleanPhotos);

  const db = await openPhotoDb();
  if (!db) return;

  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

export const deleteVaultPhotos = async (type: PhotoEntityType, id: string): Promise<void> => {
  if (!id) return;
  const key = makeKey(type, id);
  vaultMemory.delete(key);
  writeClearedFlag(key, false);
  writeLocalBackupEntry(key, null);

  const db = await openPhotoDb();
  if (!db) return;

  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

export const readVaultPhotosAsync = async (
  type: PhotoEntityType,
  id: string
): Promise<string[] | undefined> => {
  await initPhotoVault();
  return getVaultPhotos(type, id);
};

/**
 * Ensures any item in memory or pulled from Google Sheets retains its saved photos.
 * If an item already carries valid photos and the vault does not yet store them,
 * caches them into memory + IndexedDB automatically.
 */
export const hydrateItemsWithVaultPhotos = <
  T extends { id: string; photoUrl?: string; photoUrls?: string[] }
>(
  type: PhotoEntityType,
  items: T[],
  options: { preserveCleared?: boolean } = {}
): T[] => {
  return items.map(item => {
    if (!item || !item.id) return item;
    const itemPhotos = normalizePhotoList(item.photoUrls, item.photoUrl);
    const key = makeKey(type, item.id);
    const entry = vaultMemory.get(key);
    const cleared = entry ? entry.cleared : Boolean(readClearedFlags()[key]);

    if (options.preserveCleared && cleared && itemPhotos.length === 0) {
      return {
        ...item,
        photoUrls: [],
        photoUrl: undefined,
      };
    }

    const vaultPhotos =
      entry && !entry.cleared && entry.photos.length > 0
        ? entry.photos
        : getVaultPhotos(type, item.id) || [];

    if (itemPhotos.length > 0 && vaultPhotos.length === 0 && !cleared) {
      // Seed vault lazily with photos found on the item
      void saveVaultPhotos(type, item.id, itemPhotos);
      return {
        ...item,
        photoUrls: itemPhotos,
        photoUrl: itemPhotos[0],
      };
    }

    if (vaultPhotos.length > 0) {
      // Merge while respecting vault order; append any additional remote URLs if not already present
      const merged = [...vaultPhotos];
      for (const p of itemPhotos) {
        if (!merged.includes(p)) {
          merged.push(p);
        }
      }
      return {
        ...item,
        photoUrls: merged,
        photoUrl: merged[0],
      };
    }

    return itemPhotos.length > 0
      ? {
          ...item,
          photoUrls: itemPhotos,
          photoUrl: itemPhotos[0],
        }
      : item;
  });
};
