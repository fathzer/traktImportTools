import { CONFIG } from './config.js';
import { initDeviceFlow, startPolling } from './oauth.js';

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
export async function importRatings(allEpisodes, onProgress, getIsAborted) {
    const chunkSize = 100;
    let totalAddedHistory = 0;
    let totalAddedRatings = 0;

    // --- PHASE 0 : TRAITEMENT INITIAL ET FILTRAGE DES INCOHÉRENCES ---
    allEpisodes.forEach(ep => {
        if (ep.rating && !ep.watchedAt) {
            ep.status = 'incoherent';
        } else if (ep.watchedAt) {
            ep.status = 'pending';
        } else {
            ep.status = 'unrated';
        }
    });

    const episodesToHistory = allEpisodes.filter(ep => ep.status === 'pending' && ep.tvdbId);
    const totalHistory = episodesToHistory.length;

    // --- PHASE 1 : ENVOI DE L'HISTORIQUE (WATCH HISTORY) ---
    for (let i = 0; i < totalHistory; i += chunkSize) {
        if (getIsAborted && getIsAborted()) {
            return { 
                addedHistory: totalAddedHistory, 
                addedRatings: totalAddedRatings, 
                updatedEpisodes: allEpisodes, 
                aborted: true 
            };
        }

        const chunk = episodesToHistory.slice(i, i + chunkSize);
        
        const historyPayload = {
            episodes: chunk.map(item => ({
                watched_at: item.watchedAt,
                ids: { tvdb: item.tvdbId }
            }))
        };

        if (onProgress) onProgress(i, totalHistory, 'history');

        const responseData = await sendSyncBatch('history', historyPayload);
        
        // Extraction des IDs refusés/inconnus par Trakt dans ce lot
        const missingIds = new Set(
            responseData.not_found?.episodes?.map(ep => String(ep.ids.tvdb)) || []
        );

        // 🛠 CORRECTION COHÉRENCE : On compte tous les épisodes envoyés qui n'ont pas échoué (not_found)
        const successfulInChunk = chunk.filter(item => !missingIds.has(String(item.tvdbId))).length;
        totalAddedHistory += successfulInChunk;

        chunk.forEach(item => {
            if (missingIds.has(String(item.tvdbId))) {
                item.status = 'not_found';
            } else {
                item.status = 'history_synced';
            }
        });
    }

    if (onProgress) onProgress(totalHistory, totalHistory, 'history');

    const episodesToRate = allEpisodes.filter(ep => ep.status === 'history_synced' && ep.rating);
    const totalRatings = episodesToRate.length;

    // --- PHASE 2 : ENVOI DES NOTES (RATINGS) ---
    for (let i = 0; i < totalRatings; i += chunkSize) {
        if (getIsAborted && getIsAborted()) {
            allEpisodes.forEach(ep => { if (ep.status === 'history_synced') ep.status = 'pending'; });
            return { 
                addedHistory: totalAddedHistory, 
                addedRatings: totalAddedRatings, 
                updatedEpisodes: allEpisodes, 
                aborted: true 
            };
        }

        const chunk = episodesToRate.slice(i, i + chunkSize);

        const ratingsPayload = {
            episodes: chunk.map(item => ({
                rating: item.rating,
                rated_at: item.watchedAt,
                ids: { tvdb: item.tvdbId }
            }))
        };

        if (onProgress) onProgress(i, totalRatings, 'ratings');

        const responseData = await sendSyncBatch('ratings', ratingsPayload);

        const missingIds = new Set(
            responseData.not_found?.episodes?.map(ep => String(ep.ids.tvdb)) || []
        );

        // 🛠 CORRECTION COHÉRENCE : Même logique pour les notes
        const successfulInChunk = chunk.filter(item => !missingIds.has(String(item.tvdbId))).length;
        totalAddedRatings += successfulInChunk;

        chunk.forEach(item => {
            if (missingIds.has(String(item.tvdbId))) {
                item.status = 'not_found';
            } else {
                item.status = 'success';
            }
        });
    }

    if (onProgress) onProgress(totalRatings, totalRatings, 'ratings');

    // Nettoyage final pour les épisodes vus mais sans note
    allEpisodes.forEach(ep => {
        if (ep.status === 'history_synced') {
            ep.status = 'success'; 
        }
    });

    return { 
        addedHistory: totalAddedHistory, 
        addedRatings: totalAddedRatings, 
        updatedEpisodes: allEpisodes, 
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
