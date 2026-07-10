const STORAGE_KEY = 'trakt_app_lang';

const TRANSLATIONS = {
    fr: {
        title: "Trakt & TV Time Integration Fix",
        introText: "Cette application expérimentale permet de combler les manques des outils de synchronisation officiels. Elle vous permet d'importer l'intégralité de vos notes d'épisodes de séries depuis un export TV Time (obtenu via l'extension Chrome <b>Tv Time Liberator</b>) vers votre compte Trakt, tout en fournissant un rapport détaillé des correspondances. Elle inclut également un module de correction des dates de visionnage de votre historique de films (certains outils d'import ont, un temps, corrompu ces dates).",
        btnSwitchLang: "🇬🇧 Switch to English",
        sessionStatus: "Statut de la session",
        checking: "Vérification...",
        connected: "✅ Connecté à Trakt.",
        disconnected: "❌ Non connecté.",
        login: "Se connecter",
        logout: "Déconnexion",
        generatingCode: "Génération du code...",
        linking: "Liaison en cours...",
        actionRequired: "Action requise",
        instructions: "Ouvrez : {url} et saisissez :",
        
        // Section Ratings
        ratingsTitle: "Importateur de notes d'épisodes TV Time",
        ratingsDesc: "Sélectionnez votre fichier JSON exporté pour envoyer vos notes d'épisodes vers Trakt (fichier <i>shows.json</i> de l'export TV Time Liberator).",
        btnImport: "Lancer l'importation",
        btnCancel: "Annuler l'import",
        btnCancelling: "Arrêt demandé...",
        statusReading: "Lecture du fichier...",
        statusParsing: "Analyse complète du fichier TV Time...",
        statusSyncing: "Démarrage de la synchronisation avec Trakt...",
        statusProgress: "🔄 Trakt : {current} / {total} épisodes traités...",
        statusAborted: "⚠️ Importation interrompue par l'utilisateur. {added} notes appliquées.",
        statusSuccess: "🎉 Traitement terminé ! {added} notes ajoutées à Trakt.",
        statusNotFoundWarning: " Attention : {count} épisodes notés sont introuvables sur Trakt (voir le rapport ci-dessous).",
        selectFileAlert: "Sélectionnez un fichier JSON.",
        
        // Rapport Ratings
        reportSummary: "📊 Consulter le rapport détaillé des épisodes",
        filterLabel: "Filtrer par statut :",
        filterAll: "Tout",
        filterSuccess: "✅ Notés & Trouvés",
        filterNotFound: "⚠️ Notés & Inconnus",
        filterUnrated: "🛑 Non notés dans TV Time",
        thShow: "Série",
        thEpisode: "Épisode",
        thTvdb: "ID TVDB",
        thTvTimeRating: "Note TV Time",
        thTraktRating: "Note Trakt",
        thStatus: "Statut Synchro",
        badgeUnrated: "🛑 Non noté",
        badgeOk: "✅ OK",
        badgeNotFound: "⚠️ Inconnu Trakt",
        badgeAborted: "⏳ Non traité (Annulé)",
        noMatch: "Aucun épisode ne correspond à ce filtre.",

        // Section Movies
        moviesTitle: "Historique des visionnages ({count})",
        btnRefresh: "Charger l'historique",
        statusLoadingMovies: "Chargement des films...",
        noMovies: "Aucun film trouvé.",
        thTraktId: "ID Trakt",
        thImdbId: "ID IMDb",
        thTmdbId: "ID TMDb",
        thTitle: "Titre",
        thWatchedAt: "Date de visionnage",
        thAction: "Action",
        btnUpdate: "Mettre à jour",
        btnUpdating: "En cours...",
        statusUpdatingMovie: "Modification de \"{title}\"...",
        statusUpdatedMovie: "✅ \"{title}\" mis à jour !",
        invalidDate: "Date invalide."
    },
    en: {
        title: "Trakt & TV Time Integration Fix",
        introText: "This experimental app fills the gaps left by official synchronization tools. It allows you to import all your TV series episode notes from a TV Time export (obtained via the <b>Tv Time Liberator</b> Chrome extension) to your Trakt account, while providing a detailed matching report. It also includes a module to correct viewing dates in your movie history (some import tools corrupted these dates for a time).",
        btnSwitchLang: "🇫🇷 Passer en français",
        sessionStatus: "Session Status",
        checking: "Checking...",
        connected: "✅ Connected to Trakt.",
        disconnected: "❌ Not connected.",
        login: "Connect",
        logout: "Disconnect",
        generatingCode: "Generating code...",
        linking: "Linking in progress...",
        actionRequired: "Action Required",
        instructions: "Open: {url} and enter:",
        
        // Ratings Section
        ratingsTitle: "TV Time Episode Ratings Importer",
        ratingsDesc: "Select your exported JSON file to sync your episode ratings to Trakt (<i>shows.json</i> from the TV Time Liberator export).",
        btnImport: "Start Import",
        btnCancel: "Cancel Import",
        btnCancelling: "Stopping...",
        statusReading: "Reading file...",
        statusParsing: "Parsing TV Time file data...",
        statusSyncing: "Starting synchronization with Trakt...",
        statusProgress: "🔄 Trakt: {current} / {total} episodes processed...",
        statusAborted: "⚠️ Import cancelled by user. {added} ratings applied.",
        statusSuccess: "🎉 Done! {added} ratings added to Trakt.",
        statusNotFoundWarning: " Warning: {count} rated episodes were not found on Trakt (see report below).",
        selectFileAlert: "Please select a JSON file.",
        
        // Ratings Report
        reportSummary: "📊 View detailed episode report",
        filterLabel: "Filter by status:",
        filterAll: "All",
        filterSuccess: "✅ Rated & Found",
        filterNotFound: "⚠️ Rated & Unknown",
        filterUnrated: "🛑 Unrated in TV Time",
        thShow: "Show",
        thEpisode: "Episode",
        thTvdb: "TVDB ID",
        thTvTimeRating: "TV Time Rating",
        thTraktRating: "Trakt Rating",
        thStatus: "Sync Status",
        badgeUnrated: "🛑 Unrated",
        badgeOk: "✅ OK",
        badgeNotFound: "⚠️ Unknown to Trakt",
        badgeAborted: "⏳ Skipped (Cancelled)",
        noMatch: "No episodes match this filter.",

        // Movies Section
        moviesTitle: "Watch History ({count})",
        btnRefresh: "Load History",
        statusLoadingMovies: "Loading movies...",
        noMovies: "No movies found.",
        thTraktId: "Trakt ID",
        thImdbId: "IMDb ID",
        thTmdbId: "TMDb ID",
        thTitle: "Title",
        thWatchedAt: "Watched Date",
        thAction: "Action",
        btnUpdate: "Update",
        btnUpdating: "Updating...",
        statusUpdatingMovie: "Updating \"{title}\"...",
        statusUpdatedMovie: "✅ \"{title}\" updated!",
        invalidDate: "Invalid date."
    }
};

let currentLang = localStorage.getItem(STORAGE_KEY) || 
                  (navigator.language.startsWith('fr') ? 'fr' : 'en');

export function getLang() { return currentLang; }

export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
}

// Fonction de traduction avec remplacement de variables dynamiques {var}
export function t(key, params = {}) {
    let text = TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key;
    Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p]);
    });
    return text;
}