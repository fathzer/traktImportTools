export function parseTvTimeRatings(tvTimeJson) {
    const formattedRatings = [];

    tvTimeJson.forEach(show => {
        if (!show.seasons) return;
        
        show.seasons.forEach(season => {
            if (!season.episodes) return;
            
            season.episodes.forEach(episode => {
                // Filtrage : uniquement les épisodes notés avec un ID TVDB valide
                if (episode.rating && episode.id && episode.id.tvdb && episode.id.tvdb !== "-1") {
                    
                    // Conversion mathématique stricte de la note (de 1-5 vers 1-10)
                    const traktRating = Math.min(Math.max(Math.round(episode.rating * 2), 1), 10);
                    
                    const item = {
                        tvdbId: episode.id.tvdb,
                        rating: traktRating
                    };
                    
                    if (episode.watched_at) {
                        item.ratedAt = episode.watched_at;
                    }
                    
                    formattedRatings.push(item);
                }
            });
        });
    });

    return formattedRatings;
}