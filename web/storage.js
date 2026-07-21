/**
 * Storage module using IndexedDB with automatic migration from localStorage
 * Optimized to store only tree structure and reconstruct flat list on load
 */

const DB_NAME = 'TraktImportDB';
const DB_VERSION = 1;
const STORE_EPISODES = 'episodes';
const STORE_METADATA = 'metadata';

const STORAGE_EPISODES_KEY = 'trakt_import_episodes';
const STORAGE_TREE_KEY = 'trakt_import_tree';
const STORAGE_FILE_NAME_KEY = 'trakt_import_file_name';
const STORAGE_ADDED_HISTORY_KEY = 'trakt_import_added_history';
const STORAGE_ADDED_RATINGS_KEY = 'trakt_import_added_ratings';

let db = null;
let migrationCompleted = false;

/**
 * Initialize IndexedDB and perform migration if needed
 */
async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create episodes store
            if (!database.objectStoreNames.contains(STORE_EPISODES)) {
                const episodesStore = database.createObjectStore(STORE_EPISODES, { keyPath: 'id' });
                episodesStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Create metadata store for file name and counters
            if (!database.objectStoreNames.contains(STORE_METADATA)) {
                database.createObjectStore(STORE_METADATA, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Migrate data from localStorage to IndexedDB (one-time operation)
 */
async function migrateFromLocalStorage() {
    if (migrationCompleted) return;

    try {
        const storedTree = localStorage.getItem(STORAGE_TREE_KEY);
        const storedFileName = localStorage.getItem(STORAGE_FILE_NAME_KEY);
        const storedHistory = localStorage.getItem(STORAGE_ADDED_HISTORY_KEY);
        const storedRatings = localStorage.getItem(STORAGE_ADDED_RATINGS_KEY);

        if (storedTree) {
            console.log('[Storage] Migrating data from localStorage to IndexedDB...');
            
            await initDB();
            
            const transaction = db.transaction([STORE_EPISODES, STORE_METADATA], 'readwrite');
            const episodesStore = transaction.objectStore(STORE_EPISODES);
            const metadataStore = transaction.objectStore(STORE_METADATA);

            // Store tree structure only (optimized storage)
            episodesStore.put({
                id: 'tree',
                data: JSON.parse(storedTree),
                timestamp: Date.now()
            });

            // Store metadata
            if (storedFileName) {
                metadataStore.put({ key: 'fileName', value: storedFileName });
            }
            if (storedHistory) {
                metadataStore.put({ key: 'addedHistory', value: Number.parseInt(storedHistory, 10) });
            }
            if (storedRatings) {
                metadataStore.put({ key: 'addedRatings', value: Number.parseInt(storedRatings, 10) });
            }

            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });

            // Clear localStorage after successful migration
            localStorage.removeItem(STORAGE_EPISODES_KEY);
            localStorage.removeItem(STORAGE_TREE_KEY);
            localStorage.removeItem(STORAGE_FILE_NAME_KEY);
            localStorage.removeItem(STORAGE_ADDED_HISTORY_KEY);
            localStorage.removeItem(STORAGE_ADDED_RATINGS_KEY);

            console.log('[Storage] Migration completed successfully');
        }

        migrationCompleted = true;
    } catch (error) {
        console.error('[Storage] Migration failed:', error);
        // Don't set migrationCompleted to true to allow retry
    }
}

/**
 * Reconstruct flat list from tree structure
 */
function reconstructFlatList(treeStore) {
    const flatList = [];

    treeStore.forEach(show => {
        show.seasons.forEach(season => {
            season.episodes.forEach(episode => {
                const hasActivity = (episode.rating !== null || episode.watched_at !== null);
                const hasStatus = episode.status !== null;

                if (hasActivity || hasStatus) {
                    flatList.push({
                        showTitle: show.title,
                        showId: show.id,
                        seasonNumber: season.number,
                        episodeNumber: episode.number,
                        tvdbId: episode.id.tvdb,
                        imdbId: episode.id.imdb,
                        originalRating: episode.originalRating,
                        rating: episode.rating,
                        watchedAt: episode.watched_at,
                        special: episode.special,
                        ignore: episode.ignore,
                        status: episode.status,
                        _ref: episode
                    });
                }
            });
        });
    });

    return flatList;
}

/**
 * Save episode data to IndexedDB (stores only tree structure)
 */
export async function saveEpisodes(treeStore) {
    await migrateFromLocalStorage();
    await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_EPISODES], 'readwrite');
        const store = transaction.objectStore(STORE_EPISODES);

        store.put({
            id: 'tree',
            data: treeStore,
            timestamp: Date.now()
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Load episode data from IndexedDB (returns both tree and reconstructed flat list)
 */
export async function loadEpisodes() {
    await migrateFromLocalStorage();
    await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_EPISODES], 'readonly');
        const store = transaction.objectStore(STORE_EPISODES);
        const request = store.get('tree');

        request.onsuccess = () => {
            if (request.result) {
                const treeStore = request.result.data;
                const flatList = reconstructFlatList(treeStore);
                resolve({ tree: treeStore, flat: flatList });
            } else {
                resolve({ tree: [], flat: [] });
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Save metadata (file name, counters) to IndexedDB
 */
export async function saveMetadata(key, value) {
    await migrateFromLocalStorage();
    await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_METADATA], 'readwrite');
        const store = transaction.objectStore(STORE_METADATA);

        store.put({ key, value });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Load metadata from IndexedDB
 */
export async function loadMetadata(key) {
    await migrateFromLocalStorage();
    await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_METADATA], 'readonly');
        const store = transaction.objectStore(STORE_METADATA);
        const request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear all episode data from IndexedDB
 */
export async function clearEpisodes() {
    await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_EPISODES, STORE_METADATA], 'readwrite');
        const episodesStore = transaction.objectStore(STORE_EPISODES);
        const metadataStore = transaction.objectStore(STORE_METADATA);

        episodesStore.clear();
        metadataStore.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats() {
    await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_EPISODES, STORE_METADATA], 'readonly');
        const episodesStore = transaction.objectStore(STORE_EPISODES);
        const metadataStore = transaction.objectStore(STORE_METADATA);

        let episodeSize = 0;
        let metadataSize = 0;

        const episodeRequest = episodesStore.get('tree');
        episodeRequest.onsuccess = () => {
            if (episodeRequest.result) {
                episodeSize = JSON.stringify(episodeRequest.result.data).length;
            }
        };

        const metadataCountRequest = metadataStore.count();
        metadataCountRequest.onsuccess = () => {
            metadataSize = metadataCountRequest.result;
        };

        transaction.oncomplete = () => {
            resolve({
                episodeSizeBytes: episodeSize,
                episodeSizeKB: (episodeSize / 1024).toFixed(2),
                metadataCount: metadataSize,
                storageType: 'IndexedDB'
            });
        };

        transaction.onerror = () => reject(transaction.error);
    });
}
