
const DB_NAME = "bingka61-pos-db";
const DB_VERSION = 2;
const STORE_NAME = "transactions";
const CACHE_STORE_NAME = "cache";

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: "key" });
      }
    };
  });
};

export const saveTransactionLocal = async (transaction) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(transaction);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
};

export const getPendingTransactions = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result;
      // Filter only those NOT synced yet
      resolve(all.filter((t) => !t.synced));
    };
    request.onerror = (event) => reject(event.target.error);
  });
};

export const markTransactionSynced = async (localId, serverData) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(localId);

    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        data.synced = true;
        data.invoiceNumber = serverData.invoiceNumber;
        data.timestamp = serverData.timestamp;
        store.put(data);
      }
      resolve();
    };
    request.onerror = (event) => reject(event.target.error);
  });
};

export const removeSyncedTransactions = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
  
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = (event) => reject(event.target.error);
    });
  };

export const setCacheItem = async (key, value) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE_NAME, "readwrite");
    const store = tx.objectStore(CACHE_STORE_NAME);
    const request = store.put({ key, value, updatedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
};

export const getCacheItem = async (key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE_NAME, "readonly");
    const store = tx.objectStore(CACHE_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? request.result.value : null);
    };
    request.onerror = (event) => reject(event.target.error);
  });
};
