import { getStoredToken } from '../traktApi.js';
import { renderAuthUi, updateAuthElement, setupAuthListeners } from './authUi.js';
import { renderMoviesUi, toggleMoviesVisibility, setupMoviesListeners } from './moviesUi.js';
import { renderRatingsUi, toggleRatingsVisibility, setupRatingsListeners } from './ratingsUi.js';
import { getLang, setLang, t } from './i18n.js';

export function initApplication() {
    // 1. Avant toute chose, on génère la structure HTML globale de l'IHM dans le root
    buildGlobalStructure();
    
    // 2. On rend le contenu de chaque composant
    renderAll();
    
    // 3. On branche les écouteurs
    setupAllListeners();
    
    // 4. On ajuste la visibilité selon la session
    syncUiState();
}

function buildGlobalStructure() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <div id="lang-container" style="min-height: 40px;"></div>
        <header id="app-header"></header>
        <div id="auth-container"></div>
        <div id="instructions-container"></div>
        <div id="ratings-container"></div>
        <div id="movies-container"></div>
    `;
}

function renderAll() {
    // Rend le bouton de langue (utilise le conteneur créé juste au-dessus)
    renderLangSwitcher();
    
    // Rend l'en-tête (Titre + Intro)
    document.getElementById('app-header').innerHTML = `
        <h1>${t('title')}</h1>
        <p style="line-height: 1.6; color: #4b5563; font-size: 15px; margin-bottom: 30px; max-width: 800px;">
            ${t('introText')}
        </p>
    `;

    // Rend les sous-modules
    renderAuthUi();
    renderRatingsUi();
    renderMoviesUi();
}

function setupAllListeners() {
    setupAuthListeners();
    setupRatingsListeners();
    setupMoviesListeners();
    setupLangListener();
}

function renderLangSwitcher() {
    const current = getLang();
    document.getElementById('lang-container').innerHTML = `
        <button id="btn-toggle-lang" class="secondary" style="float: right; font-size:12px; padding:6px 10px;">
            ${t('btnSwitchLang')}
        </button>
    `;
}

function setupLangListener() {
    const btn = document.getElementById('btn-toggle-lang');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const nextLang = getLang() === 'fr' ? 'en' : 'fr';
        setLang(nextLang);
        
        // On re-rend uniquement le contenu, pas besoin de reconstruire la structure squelette !
        renderAll();
        setupAllListeners();
        syncUiState();
    });
}

export function syncUiState() {
    const isConnected = !!getStoredToken();
    updateAuthElement(isConnected);
    toggleRatingsVisibility(isConnected);
    toggleMoviesVisibility(isConnected);

    if (isConnected) {
        const instructionsCard = document.getElementById('instructions-card');
        if (instructionsCard) instructionsCard.classList.add('hidden');
    }
}