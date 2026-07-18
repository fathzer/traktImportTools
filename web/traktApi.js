import { CONFIG } from './config.js';
import { initDeviceFlow, startPolling } from './oauth.js';
import { ImportStatus } from './constants.js';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': CONFIG.CLIENT_ID,
        'Authorization': `Bearer ${getStoredToken()}`
    };
}

export function getStoredToken() { return localStorage.getItem('trakt_access_token'); }
export function saveToken(token) { localStorage.setItem('trakt_access_token', token); }
export function clearToken() { localStorage.removeItem('trakt_access_token'); }

export async function runTraktAuth(onCodeReceived, onAuthSuccess, onError) {
    try {
        const { deviceData, codeVerifier } = await initDeviceFlow(
            `${CONFIG.BASE_URL}/oauth/device/code`,
            CONFIG.CLIENT_ID
        );
        onCodeReceived(deviceData.verification_url, deviceData.user_code);

        startPolling(
            `${CONFIG.BASE_URL}/oauth/device/token`,
            CONFIG.CLIENT_ID,
            deviceData.device_code,
            codeVerifier,
            deviceData.interval * 1000,
            (token) => {
                saveToken(token);
                onAuthSuccess(token);
            },
            onError
        );
    } catch (err) {
        onError(err);
    }
}

// Fonction générique pour poster un lot vers un endpoint de synchronisation Trakt
async function sendSyncBatch(endpoint, payload) {
    const res = await fetch(`${CONFIG.BASE_URL}/sync/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Trakt Sync [${endpoint}] Error: ${res.status}`);
    return await res.json();
}

/**
 * Importateur sécurisé en deux passes : Historique puis Notes.
 */
export async function importRatings(flatEpisodes, onProgress, getIsAborted) {
    // 1. On ne traite UNIQUEMENT que les épisodes au statut 'pending' et non ignorés
    const episodesToSync = flatEpisodes.filter(ep => ep.status === ImportStatus.PENDING && !ep.ignore);

    const totalToSync = episodesToSync.length;
    if (totalToSync === 0) {
        return { addedHistory: 0, addedRatings: 0, updatedEpisodes: flatEpisodes, aborted: false };
    }

    // Répartition théorique initiale
    const episodesToHistory = episodesToSync.filter(ep => ep.watchedAt !== null);
    const episodesToRate = episodesToSync.filter(ep => ep.rating !== null);

    let totalAddedHistory = 0;
    let totalAddedRatings = 0;
    const chunkSize = 100;

    const getEpisodeIdsPayload = (item) => {
        if (item.imdbId && item.imdbId !== "-1" && item.imdbId.trim() !== "") {
            return { imdb: item.imdbId.trim() };
        }
        return item.tvdbId ? { tvdb: item.tvdbId } : null;
    };

    // --- PHASE 1 : ENVOI DE L'HISTORIQUE ---
    const totalHistory = episodesToHistory.length;
    for (let i = 0; i < totalHistory; i += chunkSize) {
        if (getIsAborted && getIsAborted()) {
            return { addedHistory: totalAddedHistory, addedRatings: totalAddedRatings, updatedEpisodes: flatEpisodes, aborted: true };
        }

        const chunk = episodesToHistory.slice(i, i + chunkSize);
        
        const historyPayload = {
            episodes: chunk.map(item => {
                const ids = getEpisodeIdsPayload(item);
                return ids ? { watched_at: item.watchedAt, ids } : null;
            }).filter(Boolean)
        };

        if (onProgress) onProgress(i, totalHistory, 'history');

        if (historyPayload.episodes.length > 0) {
            const responseData = await sendSyncBatch('history', historyPayload);
            
            const missingImdb = new Set(responseData.not_found?.episodes?.map(ep => ep.ids.imdb).filter(Boolean) || []);
            const missingTvdb = new Set(responseData.not_found?.episodes?.map(ep => String(ep.ids.tvdb)).filter(Boolean) || []);

            const successfulInChunk = chunk.filter(item => {
                const usesImdb = item.imdbId && item.imdbId !== "-1";
                return usesImdb ? !missingImdb.has(item.imdbId) : !missingTvdb.has(String(item.tvdbId));
            }).length;

            totalAddedHistory += successfulInChunk;

            chunk.forEach(item => {
                const usesImdb = item.imdbId && item.imdbId !== "-1";
                const isMissing = usesImdb ? missingImdb.has(item.imdbId) : missingTvdb.has(String(item.tvdbId));
                
                if (isMissing) {
                    item.status = ImportStatus.NOT_FOUND;
                    if (item._ref) item._ref.status = ImportStatus.NOT_FOUND;
                } else {
                    // 💡 VOTRE LOGIQUE : 
                    // S'il y a une note à envoyer après, on le laisse en PENDING.
                    // Sinon, le travail est fini -> SUCCESS !
                    const needsRating = item.rating !== null;
                    const nextStatus = needsRating ? ImportStatus.PENDING : ImportStatus.SUCCESS;
                    
                    item.status = nextStatus;
                    if (item._ref) item._ref.status = nextStatus;
                }
            });
        }
    }

    // --- PHASE 2 : ENVOI DES NOTES ---
    // 💡 FILTRE DE SÉCURITÉ : On ne traite que ceux qui sont toujours PENDING 
    // (on élimine ceux qui ont échoué en Phase 1 et sont passés en NOT_FOUND)
    const activeEpisodesToRate = episodesToRate.filter(ep => ep.status === ImportStatus.PENDING);
    const totalRatings = activeEpisodesToRate.length;
    
    for (let i = 0; i < totalRatings; i += chunkSize) {
        if (getIsAborted && getIsAborted()) {
            return { addedHistory: totalAddedHistory, addedRatings: totalAddedRatings, updatedEpisodes: flatEpisodes, aborted: true };
        }

        const chunk = activeEpisodesToRate.slice(i, i + chunkSize);

        const ratingsPayload = {
            episodes: chunk.map(item => {
                const ids = getEpisodeIdsPayload(item);
                return ids ? { rating: item.rating, rated_at: item.watchedAt, ids } : null;
            }).filter(Boolean)
        };

        if (onProgress) onProgress(i, totalRatings, 'ratings');

        if (ratingsPayload.episodes.length > 0) {
            const responseData = await sendSyncBatch('ratings', ratingsPayload);

            const missingImdb = new Set(responseData.not_found?.episodes?.map(ep => ep.ids.imdb).filter(Boolean) || []);
            const missingTvdb = new Set(responseData.not_found?.episodes?.map(ep => String(ep.ids.tvdb)).filter(Boolean) || []);

            const successfulInChunk = chunk.filter(item => {
                const usesImdb = item.imdbId && item.imdbId !== "-1";
                return usesImdb ? !missingImdb.has(item.imdbId) : !missingTvdb.has(String(item.tvdbId));
            }).length;

            totalAddedRatings += successfulInChunk;

            chunk.forEach(item => {
                const usesImdb = item.imdbId && item.imdbId !== "-1";
                const isMissing = usesImdb ? missingImdb.has(item.imdbId) : missingTvdb.has(String(item.tvdbId));

                const newStatus = isMissing ? ImportStatus.NOT_FOUND : ImportStatus.SUCCESS;
                item.status = newStatus;
                if (item._ref) item._ref.status = newStatus;
            });
        }
    }

    return {
        addedHistory: totalAddedHistory,
        addedRatings: totalAddedRatings,
        updatedEpisodes: flatEpisodes,
        aborted: false
    };
}

export async function fetchMoviesHistory() {
    let page = 1; let fullHistory = []; let hasMore = true;
    while (hasMore) {
        const response = await fetch(`${CONFIG.BASE_URL}/sync/history/movies?page=${page}&limit=50`, {
            method: 'GET',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
        const data = await response.json();
        if (data.length === 0) break;
        fullHistory = fullHistory.concat(data);
        const totalPages = response.headers.get('x-pagination-page-count');
        if (totalPages && page >= parseInt(totalPages)) hasMore = false;
        else page++;
    }
    return fullHistory;
}

export async function updateMovieWatchedDate(historyId, movieIds, newDateString) {
    const headers = getHeaders();
    /*
    await fetch(`${CONFIG.BASE_URL}/sync/history/remove`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ ids: [historyId] })
    });
    */
    
    const isoDate = new Date(newDateString).toISOString();
    const addResponse = await fetch(`${CONFIG.BASE_URL}/sync/history`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ movies: [{ watched_at: isoDate, ids: movieIds }] })
    });
    if (!addResponse.ok) throw new Error(`Erreur réinscription: ${addResponse.status}`);
}
