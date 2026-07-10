// Fonctions purement cryptographiques et protocolaires OAuth2 / PKCE
function generateCodeVerifier() {
    const array = new Uint8Array(44);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function initDeviceFlow(codeEndpoint, clientId, extraPayload = {}) {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const res = await fetch(codeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            ...extraPayload
        })
    });
    
    if (!res.ok) throw new Error(`OAuth Error: ${res.status}`);
    const data = await res.json();
    
    return { deviceData: data, codeVerifier };
}

export function startPolling(tokenEndpoint, clientId, deviceCode, codeVerifier, intervalMs, onSuccess, onError) {
    const timer = setInterval(async () => {
        try {
            const res = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: deviceCode,
                    client_id: clientId,
                    code_verifier: codeVerifier
                })
            });

            if (res.status === 200) {
                clearInterval(timer);
                const tokenData = await res.json();
                onSuccess(tokenData.access_token);
            } else if (res.status !== 400) {
                clearInterval(timer);
                throw new Error(`Auth Status: ${res.status}`);
            }
        } catch (err) {
            clearInterval(timer);
            onError(err);
        }
    }, intervalMs);
    
    return timer;
}