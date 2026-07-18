/**
 * Énumération des statuts possibles pour un épisode lors du processus d'import.
 * @enum {string}
 */
export const ImportStatus = Object.freeze({
    PENDING: 'pending',               // Prêt à être synchronisé (note et/ou date de visionnage présente)
    SUCCESS: 'success',               // Entièrement synchronisé avec succès
    NOT_FOUND: 'not_found',           // Échec : introuvable sur Trakt
    INCONSISTENT: 'inconsistent'     // Rejeté : incohérence logique (ex: noté mais sans date de visionnage)
});