import { ImportStatus } from './constants.js';

/**
 * Parse le fichier JSON (qu'il soit brut de TV Time ou un export d'état de notre outil)
 * et retourne un objet contenant :
 * - tree : la structure hiérarchique complète (Series -> Seasons -> Episodes)
 * - flat : la liste à plat d'épisodes (référençant les mêmes objets que l'arbre)
 */
export function parseTvTimeRatings(tvTimeJson) {
    const allEpisodesFlat = [];
    const treeStore = [];

    tvTimeJson.forEach(show => {
        const showTitle = show.title || `Série (TVDB: ${show.id?.tvdb})`;
        if (!show.seasons) return;

        // Structure de la série à conserver
        const showNode = {
            title: showTitle,
            id: {
                tvdb: show.id?.tvdb || null,
                imdb: show.id?.imdb || null
            },
            seasons: []
        };

        show.seasons.forEach(season => {
            if (!season.episodes) return;

            const seasonNode = {
                number: season.number,
                episodes: []
            };

            season.episodes.forEach(episode => {
                const hasTvdb = episode.id && episode.id.tvdb && episode.id.tvdb !== "-1";
                
                const traktRating = episode.rating 
                    ? Math.min(Math.max(Math.round(episode.rating), 1), 10) 
                    : null;

                const watchedAt = episode.watched_at || null;

                // 🛠 REGLE DE COHÉRENCE :
                // Si l'épisode a une note (traktRating) mais pas de date de visionnage (watchedAt)
                const isInconsistent = (traktRating !== null && watchedAt === null);

                // Détermination propre du statut initial
                let initialStatus = episode.status; // Si le statut est déjà présent (ré-import d'un état)
                
                if (!initialStatus) {
                    if (isInconsistent) {
                        initialStatus = ImportStatus.INCONSISTENT;
                    } else {
                        const hasActivity = (traktRating !== null || watchedAt !== null);
                        initialStatus = hasActivity ? ImportStatus.PENDING : null;
                    }
                }

                const episodeNode = {
                    number: episode.number,
                    id: {
                        tvdb: hasTvdb ? String(episode.id.tvdb) : null,
                        imdb: episode.id?.imdb || null
                    },
                    rating: traktRating,
                    originalRating: episode.rating || null,
                    watched_at: watchedAt,
                    special: episode.special || false,
                    ignore: episode.ignore || false,
                    status: initialStatus // Applique le statut calculé ou conservé
                };

                seasonNode.episodes.push(episodeNode);

                // Si l'épisode n'a aucune activité et aucun statut, on peut choisir de ne pas l'ajouter au flatStore
                if (initialStatus === null) return;

                allEpisodesFlat.push({
                    showTitle: showTitle,
                    showId: showNode.id,
                    seasonNumber: season.number,
                    episodeNumber: episode.number,
                    tvdbId: episodeNode.id.tvdb,
                    imdbId: episodeNode.id.imdb,
                    originalRating: episodeNode.originalRating,
                    rating: episodeNode.rating,
                    watchedAt: episodeNode.watched_at,
                    special: episodeNode.special,
                    ignore: episodeNode.ignore,
                    status: episodeNode.status,
                    _ref: episodeNode 
                });
            });

            if (seasonNode.episodes.length > 0) {
                showNode.seasons.push(seasonNode);
            }
        });

        if (showNode.seasons.length > 0) {
            treeStore.push(showNode);
        }
    });

    return { tree: treeStore, flat: allEpisodesFlat };
}