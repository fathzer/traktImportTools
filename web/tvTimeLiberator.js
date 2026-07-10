export function parseTvTimeRatings(tvTimeJson) {
    const allEpisodes = [];

    tvTimeJson.forEach(show => {
        const showTitle = show.title || `Série (TVDB: ${show.id?.tvdb})`;
        if (!show.seasons) return;
        
        show.seasons.forEach(season => {
            if (!season.episodes) return;
            
            season.episodes.forEach(episode => {
                const hasTvdb = episode.id && episode.id.tvdb && episode.id.tvdb !== "-1";
                
                // L'export est déjà sur 10 : on s'assure juste que c'est bien borné
                const traktRating = episode.rating 
                    ? Math.min(Math.max(Math.round(episode.rating), 1), 10) 
                    : null;

                allEpisodes.push({
                    tvdbId: hasTvdb ? episode.id.tvdb : null,
                    showTitle: showTitle,
                    seasonNumber: season.number,
                    episodeNumber: episode.number,
                    originalRating: episode.rating || null, // Déjà sur 10
                    rating: traktRating,
                    watchedAt: episode.watched_at || null,
                    status: traktRating ? 'pending' : 'unrated'
                });
            });
        });
    });

    return allEpisodes;
}