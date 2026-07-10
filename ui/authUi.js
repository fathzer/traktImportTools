import { runTraktAuth, clearToken } from '../traktApi.js';
import { syncUiState } from './mainUi.js';

export function renderAuthUi() {
    // Rendu de la carte de statut
    document.getElementById('auth-container').innerHTML = `
        <div class="card">
            <h3>Statut de la session</h3>
            <p id="session-status">Vérification...</p>
            <div id="logged-out-actions" class="hidden"><button id="btn-login">Se connecter</button></div>
            <div id="loggedInActions" class="hidden"><button id="btn-logout" class="secondary">Déconnexion</button></div>
        </div>
    `;

    // Rendu de la carte d'instructions (Device flow code)
    document.getElementById('instructions-container').innerHTML = `
        <div id="instructions-card" class="card hidden">
            <h3>Action requise</h3>
            <p>Ouvrez : <a id="device-url" target="_blank"></a> et saisissez : <strong id="device-code" style="color:#e11d48; font-size:20px; font-family:monospace;"></strong></p>
        </div>
    `;
}

export function updateAuthElement(isConnected) {
    const statusEl = document.getElementById('session-status');
    const loggedOutActions = document.getElementById('logged-out-actions');
    const loggedInActions = document.getElementById('loggedInActions');

    if (isConnected) {
        statusEl.innerHTML = "✅ Connecté à Trakt.";
        loggedOutActions.classList.add('hidden');
        loggedInActions.classList.remove('hidden');
    } else {
        statusEl.innerHTML = "❌ Non connecté.";
        loggedOutActions.classList.remove('hidden');
        loggedInActions.classList.add('hidden');
    }
}

export function setupAuthListeners() {
    const instructionsCard = document.getElementById('instructions-card');
    const statusEl = document.getElementById('session-status');

    document.getElementById('btn-login').addEventListener('click', () => {
        statusEl.innerText = "Génération du code...";
        runTraktAuth(
            (url, code) => {
                document.getElementById('device-url').href = url;
                document.getElementById('device-url').innerText = url;
                document.getElementById('device-code').innerText = code;
                instructionsCard.classList.remove('hidden');
                statusEl.innerText = "Liaison en cours...";
            },
            () => { syncUiState(); },
            (err) => { alert("Erreur Auth : " + err.message); syncUiState(); }
        );
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        clearToken();
        syncUiState();
    });
}
