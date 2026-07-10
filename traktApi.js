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

export async function sendRatingsBatch(episodesBatch) {
    const response = await fetch(`${CONFIG.BASE_URL}/sync/ratings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ episodes: episodesBatch })
    });
    if (!response.ok) throw new Error(`Erreur lot Trakt (${response.status})`);
    return await response.json();
}

// Reçoit le tableau standardisé produit en amont
export async function importRatings(cleanRatings, onProgress) {
    const total = cleanRatings.length;
    if (total === 0) return { added: 0 };

    const chunkSize = 100;
    let processed = 0;

    for (let i = 0; i < total; i += chunkSize) {
        const chunk = cleanRatings.slice(i, i + chunkSize);
        
        // Mapping du format interne vers la structure attendue par l'API de Trakt
        const traktPayload = chunk.map(item => ({
            rating: item.rating,
            rated_at: item.ratedAt || undefined,
            ids: { tvdb: item.tvdbId }
        }));

        if (onProgress) onProgress(processed, total);
        
        await sendRatingsBatch(traktPayload);
        processed += chunk.length;
    }

    if (onProgress) onProgress(processed, total);
    return { added: total };
}