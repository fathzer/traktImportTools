import { runTraktAuth, clearToken } from '../traktApi.js';
import { syncUiState } from './mainUi.js';
import { t } from './i18n.js';

export function renderAuthUi() {
    document.getElementById('auth-container').innerHTML = `
        <div class="card">
            <h3>${t('sessionStatus')}</h3>
            <p id="session-status">${t('checking')}</p>
            <div id="logged-out-actions" class="hidden"><button id="btn-login">${t('login')}</button></div>
            <div id="loggedInActions" class="hidden"><button id="btn-logout" class="secondary">${t('logout')}</button></div>
        </div>
    `;

    document.getElementById('instructions-container').innerHTML = `
        <div id="instructions-card" class="card hidden">
            <h3>${t('actionRequired')}</h3>
            <p>${t('instructions', {url: '<a id="device-url" target="_blank"></a>'})} <strong id="device-code" style="color:#e11d48; font-size:20px; font-family:monospace;"></strong></p>
        </div>
    `;
}

export function updateAuthElement(isConnected) {
    const statusEl = document.getElementById('session-status');
    const loggedOutActions = document.getElementById('logged-out-actions');
    const loggedInActions = document.getElementById('loggedInActions');

    if (isConnected) {
        statusEl.innerHTML = t('connected');
        loggedOutActions.classList.add('hidden');
        loggedInActions.classList.remove('hidden');
    } else {
        statusEl.innerHTML = t('disconnected');
        loggedOutActions.classList.remove('hidden');
        loggedInActions.classList.add('hidden');
    }
}

export function setupAuthListeners() {
    const instructionsCard = document.getElementById('instructions-card');
    const statusEl = document.getElementById('session-status');

    document.getElementById('btn-login').addEventListener('click', () => {
        statusEl.innerText = t('generatingCode');
        runTraktAuth(
            (url, code) => {
                document.getElementById('device-url').href = url;
                document.getElementById('device-url').innerText = url;
                document.getElementById('device-code').innerText = code;
                instructionsCard.classList.remove('hidden');
                statusEl.innerText = t('linking');
            },
            () => { syncUiState(); },
            (err) => { alert(t('errorPrefix') + " " + err.message); syncUiState(); }
        );
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        clearToken();
        syncUiState();
    });
}