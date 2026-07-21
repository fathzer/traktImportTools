import { getStoredToken } from '../traktApi.js';
import { CONFIG } from '../config.js';
import { t } from './i18n.js';

let paramCount = 0;

export function renderToolsUi() {
    const container = document.getElementById('tools-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card" id="tools-card">
            <h2>${t('toolsTitle')}</h2>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">${t('toolsDesc')}</p>
            
            <div style="display: flex; gap: 12px; margin-bottom: 16px; align-items: center;">
                <div>
                    <label style="font-size: 13px; font-weight: 500; margin-bottom: 4px; display: block;">${t('methodLabel')}</label>
                    <select id="api-method" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; min-width: 100px;">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 13px; font-weight: 500; margin-bottom: 4px; display: block;">${t('urlLabel')}</label>
                    <input type="text" id="api-url" placeholder="/sync/history" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; box-sizing: border-box;">
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="font-size: 13px; font-weight: 500; margin-bottom: 8px; display: block;">${t('paramsLabel')}</label>
                <div id="params-container"></div>
                <button id="btn-add-param" class="secondary" style="margin-top: 8px; font-size: 12px; padding: 6px 12px;">+ ${t('addParam')}</button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="font-size: 13px; font-weight: 500; margin-bottom: 4px; display: block;">${t('bodyLabel')} <span style="font-weight: normal; color: #6b7280;">(${t('bodyOptional')})</span></label>
                <textarea id="api-body" rows="4" placeholder='{"key": "value"}' style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-family: monospace; font-size: 13px; box-sizing: border-box; resize: vertical;"></textarea>
            </div>
            
            <button id="btn-send-request" style="margin-bottom: 16px;">${t('sendRequest')}</button>
            
            <div id="response-container" class="hidden">
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 13px; font-weight: 500;">${t('responseCode')}:</span>
                    <span id="response-status" style="font-weight: 600; margin-left: 8px;"></span>
                </div>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 13px; font-weight: 500;">${t('responseHeaders')}:</span>
                    <pre id="response-headers" style="background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; margin-top: 8px; font-size: 13px; max-height: 200px; overflow-y: auto;"></pre>
                </div>
                <div>
                    <span style="font-size: 13px; font-weight: 500;">${t('responseBody')}:</span>
                    <pre id="response-body" style="background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; margin-top: 8px; font-size: 13px; max-height: 400px; overflow-y: auto;"></pre>
                </div>
            </div>
        </div>
    `;
}

export function toggleToolsVisibility(isConnected) {
    const toolsCard = document.getElementById('tools-card');
    if (toolsCard) {
        toolsCard.classList.toggle('hidden', !isConnected);
    }
}

export function setupToolsListeners() {
    const btnAddParam = document.getElementById('btn-add-param');
    const btnSendRequest = document.getElementById('btn-send-request');
    
    if (btnAddParam) {
        btnAddParam.addEventListener('click', addParamRow);
    }
    
    if (btnSendRequest) {
        btnSendRequest.addEventListener('click', sendApiRequest);
    }
}

function addParamRow() {
    const container = document.getElementById('params-container');
    if (!container) return;
    
    const rowId = `param-${paramCount++}`;
    const row = document.createElement('div');
    row.id = rowId;
    row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
    row.innerHTML = `
        <input type="text" class="param-key" placeholder="${t('paramKey')}" style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; box-sizing: border-box;">
        <input type="text" class="param-value" placeholder="${t('paramValue')}" style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; box-sizing: border-box;">
        <button class="btn-remove-param secondary" style="padding: 6px 10px; font-size: 12px;">×</button>
    `;
    
    container.appendChild(row);
    
    const removeBtn = row.querySelector('.btn-remove-param');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            row.remove();
        });
    }
}

function buildUrlParams() {
    const params = new URLSearchParams();
    document.querySelectorAll('#params-container > div').forEach(row => {
        const key = row.querySelector('.param-key')?.value;
        const value = row.querySelector('.param-value')?.value;
        if (key && value) {
            params.append(key, value);
        }
    });
    return params.toString();
}

function buildRequestOptions(method, token, bodyInput) {
    const headers = {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': CONFIG.CLIENT_ID,
        'Authorization': `Bearer ${token}`
    };
    
    const options = {
        method: method,
        headers: headers
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyInput?.trim()) {
        options.body = bodyInput.trim();
        JSON.parse(options.body);
    }
    
    return options;
}

async function fetchResponse(fullUrl, options) {
    const response = await fetch(fullUrl, options);
    const status = response.status;
    let body;
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        body = await response.json();
    } else {
        body = await response.text();
    }
    
    // Capture headers
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    
    return { status, body, headers };
}

function displayResponse(status, body, headers) {
    const responseContainer = document.getElementById('response-container');
    const responseStatus = document.getElementById('response-status');
    const responseHeaders = document.getElementById('response-headers');
    const responseBody = document.getElementById('response-body');
    
    responseContainer?.classList.remove('hidden');
    if (responseStatus) {
        responseStatus.textContent = status;
        responseStatus.style.color = status >= 200 && status < 300 ? '#16a34a' : '#dc2626';
    }
    if (responseHeaders) {
        responseHeaders.textContent = JSON.stringify(headers, null, 2);
    }
    if (responseBody) {
        responseBody.textContent = typeof body === 'object' ? JSON.stringify(body, null, 2) : body;
    }
}

function displayError(error) {
    const responseContainer = document.getElementById('response-container');
    const responseStatus = document.getElementById('response-status');
    const responseBody = document.getElementById('response-body');
    
    responseContainer?.classList.remove('hidden');
    if (responseStatus) {
        responseStatus.textContent = 'Error';
        responseStatus.style.color = '#dc2626';
    }
    if (responseBody) {
        responseBody.textContent = error.message;
    }
}

async function sendApiRequest() {
    const method = document.getElementById('api-method')?.value;
    const urlInput = document.getElementById('api-url')?.value;
    const bodyInput = document.getElementById('api-body')?.value;
    
    if (!urlInput) {
        alert(t('urlRequired'));
        return;
    }
    
    const token = getStoredToken();
    if (!token) {
        alert(t('notConnected'));
        return;
    }
    
    // Validate JSON body before building options
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyInput?.trim()) {
        try {
            JSON.parse(bodyInput.trim());
        } catch (e) {
            alert(`${t('invalidJson')}: ${e.message}`);
            return;
        }
    }
    
    const queryString = buildUrlParams();
    const fullUrl = `${CONFIG.BASE_URL}${urlInput}${queryString ? '?' + queryString : ''}`;
    
    const options = buildRequestOptions(method, token, bodyInput);
    
    const btnSend = document.getElementById('btn-send-request');
    const originalText = btnSend.textContent;
    btnSend.textContent = t('sending');
    btnSend.disabled = true;
    
    try {
        const { status, body, headers } = await fetchResponse(fullUrl, options);
        displayResponse(status, body, headers);
    } catch (error) {
        displayError(error);
    } finally {
        btnSend.textContent = originalText;
        btnSend.disabled = false;
    }
}
