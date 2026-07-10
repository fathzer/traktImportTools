import { CONFIG } from './config.js';

const HEADERS_BASE = {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': CONFIG.CLIENT_ID
};

// Fonctions utilitaires pour le PKCE (Crypto natif du navigateur)
function generateCodeVerifier() {
    const array = new Uint8Array(44);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function getStoredToken() {
    return localStorage.getItem('trakt_access_token');
}

export function clearToken() {
    localStorage.removeItem('trakt_access_token');
}

// Lancement du Device Flow sécurisé par PKCE
export async function runDeviceFlow(onCodeReceived, onAuthSuccess, onError) {
    try {
        // 1. Génération des jetons PKCE uniques à cette tentative de connexion
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // 2. Demande du code à Trakt en y associant le Challenge
        const res = await fetch(`${CONFIG.BASE_URL}/oauth/device/code`, {
            method: 'POST',
            headers: HEADERS_BASE,
            body: JSON.stringify({ 
                client_id: CONFIG.CLIENT_ID,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            })
        });
        
        if (!res.ok) throw new Error(`Erreur code (${res.status})`);
        const deviceData = await res.json();
        
        onCodeReceived(deviceData.verification_url, deviceData.user_code);

        // 3. Polling : On vérifie si l'utilisateur a validé
        const interval = deviceData.interval * 1000;
        const pollTimer = setInterval(async () => {
            try {
                const tokenRes = await fetch(`${CONFIG.BASE_URL}/oauth/device/token`, {
                    method: 'POST',
                    headers: HEADERS_BASE,
                    body: JSON.stringify({
                        code: deviceData.device_code,
                        client_id: CONFIG.CLIENT_ID,
                        code_verifier: codeVerifier // Exit le client_secret, on envoie le verifier brut !
                    })
                });

                if (tokenRes.status === 200) {
                    const tokenData = await tokenRes.json();
                    clearInterval(pollTimer);
                    
                    localStorage.setItem('trakt_access_token', tokenData.access_token);
                    onAuthSuccess(tokenData.access_token);
                } else if (tokenRes.status === 400) {
                    // L'utilisateur n'a pas encore validé, on continue
                    return;
                } else {
                    clearInterval(pollTimer);
                    throw new Error(`Statut anormal : ${tokenRes.status}`);
                }
            } catch (err) {
                clearInterval(pollTimer);
                onError(err);
            }
        }, interval);

    } catch (err) {
        onError(err);
    }
}