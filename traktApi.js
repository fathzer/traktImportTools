import { CONFIG } from './config.js';
import { getStoredToken } from './auth.js';

// Génère les en-têtes requis pour chaque requête authentifiée
function getHeaders() {
    const token = getStoredToken();
    return {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': CONFIG.CLIENT_ID,
        'Authorization': `Bearer ${token}`
    };
}

// Récupère l'historique complet des films visionnés (gère la pagination)
export async function fetchMoviesHistory() {
    let page = 1;
    const limit = 50; // Limite par page raisonnable pour le prototype
    let hasMore = true;
    let fullHistory = [];

    while (hasMore) {
        const response = await fetch(`${CONFIG.BASE_URL}/sync/history/movies?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (!response.ok) throw new Error(`Erreur historique page ${page} (${response.status})`);

        const data = await response.json();
        if (data.length === 0) {
            hasMore = false;
            break;
        }

        fullHistory = fullHistory.concat(data);

        const totalPages = response.headers.get('x-pagination-page-count');
        if (totalPages && page >= parseInt(totalPages)) {
            hasMore = false;
        } else {
            page++;
        }
    }
    return fullHistory;
}

// Met à jour une date en supprimant l'ancien enregistrement historique et en recréant le nouveau
export async function updateMovieWatchedDate(historyId, movieIds, newDateString) {
    const headers = getHeaders();

    /**
    // 1. Suppression de l'ancienne entrée de l'historique via son identifiant unique d'action (historyId)
    const removeResponse = await fetch(`${CONFIG.BASE_URL}/sync/history/remove`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            ids: [historyId]
        })
    });

    if (!removeResponse.ok) {
        throw new Error(`Échec de la suppression de l'ancien historique (${removeResponse.status})`);
    }*/

    // Convertir la date locale AAAA-MM-JJ au format ISO attendu par Trakt (ex: 2026-07-09T00:00:00.000Z)
    const isoDate = new Date(newDateString).toISOString();

    // 2. Ajout du film avec sa nouvelle date de visionnage
    const addResponse = await fetch(`${CONFIG.BASE_URL}/sync/history`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            movies: [
                {
                    watched_at: isoDate,
                    ids: movieIds // On repasse l'objet d'ids complet (trakt, imdb, tmdb...)
                }
            ]
        })
    });

    if (!addResponse.ok) {
        throw new Error(`Échec de la réinscription du film à la nouvelle date (${addResponse.status})`);
    }

    const result = await addResponse.json();
    console.log(result);
    return result;
}