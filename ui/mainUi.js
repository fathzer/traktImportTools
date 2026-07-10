import { getStoredToken } from '../traktApi.js';
import { renderAuthUi, updateAuthElement, setupAuthListeners } from './authUi.js';
import { renderMoviesUi, toggleMoviesVisibility, setupMoviesListeners } from './moviesUi.js';
import { renderRatingsUi, toggleRatingsVisibility, setupRatingsListeners } from './ratingsUi.js';

// Fonction maîtresse lancée depuis index.html au boot
export function initApplication() {
    // 1. On fabrique l'IHM en injectant les templates
    renderAuthUi();
    renderRatingsUi();
    renderMoviesUi();

    // 2. On branche les écouteurs d'événements maintenant que les boutons existent
    setupAuthListeners();
    setupRatingsListeners();
    setupMoviesListeners();

    // 3. On ajuste la visibilité selon l'état actuel de la session
    syncUiState();
}

export function syncUiState() {
    const isConnected = !!getStoredToken();

    // Distribution des ordres aux modules enfants
    updateAuthElement(isConnected);
    toggleRatingsVisibility(isConnected);
    toggleMoviesVisibility(isConnected);

    // Sécurité : On cache le panneau de code si connecté
    if (isConnected) {
        const instructionsCard = document.getElementById('instructions-card');
        if (instructionsCard) instructionsCard.classList.add('hidden');
    }
}