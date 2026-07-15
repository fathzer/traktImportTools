import { parseTvTimeRatings } from '../tvTimeLiberator.js';
import { importRatings } from '../traktApi.js';
import { t } from './i18n.js';

let localEpisodesStore = [];
let isImportAborted = false;
let isImportRunning = false;

let currentProgressCount = 0;
let totalProgressCount = 0;

const STORAGE_EPISODES_KEY = 'trakt_import_episodes';
const STORAGE_FILE_NAME_KEY = 'trakt_import_file_name';
const STORAGE_ADDED_HISTORY_KEY = 'trakt_import_added_history';
const STORAGE_ADDED_RATINGS_KEY = 'trakt_import_added_ratings';

export function renderRatingsUi() {
    if (localEpisodesStore.length === 0) {
        const storedEpisodes = localStorage.getItem(STORAGE_EPISODES_KEY);
        if (storedEpisodes) {
            try {
                localEpisodesStore = JSON.parse(storedEpisodes);
            } catch (e) {
                console.error("Erreur lors de la lecture des épisodes persistés :", e);
                localEpisodesStore = [];
            }
        }
    }

    const storedFileName = localStorage.getItem(STORAGE_FILE_NAME_KEY);
    const hasDataLoaded = localEpisodesStore && localEpisodesStore.length > 0;
    
    const fileSelectorClass = (hasDataLoaded || isImportRunning) ? 'hidden' : '';
    const fileDetailsClass = (hasDataLoaded || isImportRunning) ? '' : 'hidden';
    const reportClass = (hasDataLoaded && !isImportRunning) ? '' : 'hidden';

    const isResetVisible = hasDataLoaded && !isImportRunning;

    document.getElementById('ratings-container').innerHTML = `
        <div id="ratings-section" class="card hidden">
            <h3>${t('ratingsTitle')}</h3>
            <p style="font-size: 14px; color: #6b7280;">${t('ratingsDesc')}</p>
            
            <div id="ratings-file-selector" class="${fileSelectorClass}" style="margin-top: 15px;">
                <input type="file" id="ratings-file" accept=".json" style="font-size: 14px;">
                <button id="btn-import-ratings" class="action-btn" style="margin-left: 10px;" disabled>${t('btnImport')}</button>
            </div>

            <div id="ratings-file-details" class="${fileDetailsClass}" style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
                <span id="ratings-active-filename" style="font-weight: 500; font-size: 14px; color: #1e293b;">
                    ${(storedFileName && (hasDataLoaded || isImportRunning)) ? `📄 ${t('fileImported') || 'Fichier importé'} : ${storedFileName}` : ''}
                </span>
                
                <button id="btn-reset-ratings" class="secondary ${isResetVisible ? '' : 'hidden'}" style="border-color: #ef4444; color: #ef4444; padding: 6px 12px; font-size: 13px;">
                    ${t('btnClear') || 'Réinitialiser'}
                </button>
                
                <button id="btn-cancel-ratings" class="secondary ${isImportRunning ? '' : 'hidden'}" style="border-color: #dc2626; color: #dc2626; padding: 6px 12px; font-size: 13px;">
                    ${t('btnCancel')}
                </button>
            </div>

            <p id="ratings-status" style="margin-top: 15px; font-weight: bold; font-size: 14px;"></p>
            
            <details id="ratings-report-details" class="${reportClass}" style="margin-top: 20px; border: 1px solid #ccc; border-radius: 8px; padding: 15px; background: #fff;" ${hasDataLoaded && !isImportRunning ? 'open' : ''}>
                <summary style="cursor: pointer; font-weight: bold; padding: 5px;">${t('reportSummary')}</summary>
                
                <div style="margin-top: 15px; margin-bottom: 25px;">
                    <h4 style="margin: 0 0 10px 0; color: #16a34a; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
                        <span>${t('titleSuccesses')}</span>
                        <span id="cnt-success" style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">0</span>
                    </h4>
                    <div style="max-height: 350px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <table style="font-size: 13px; margin-top: 0; width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="position: sticky; top: 0; background: #f3f4f6; z-index: 1;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thShow')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thEpisode')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thTvdb')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thWatchedAt')}</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thRating')}</th>
                                </tr>
                            </thead>
                            <tbody id="ratings-success-body"></tbody>
                        </table>
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #dc2626; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
                        <span>${t('titleFailures')}</span>
                        <span id="cnt-failure" style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">0</span>
                    </h4>
                    <div style="max-height: 350px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <table style="font-size: 13px; margin-top: 0; width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="position: sticky; top: 0; background: #f3f4f6; z-index: 1;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thShow')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thEpisode')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thTvdb')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thWatchedAt')}</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thRating')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thStatus')}</th>
                                </tr>
                            </thead>
                            <tbody id="ratings-failure-body"></tbody>
                        </table>
                    </div>
                </div>
            </details>
        </div>
    `;

    if (isImportRunning) {
        const statusEl = document.getElementById('ratings-status');
        if (statusEl) {
            statusEl.style.color = "#2563eb";
            statusEl.innerText = t('statusProgress', { current: currentProgressCount, total: totalProgressCount });
        }
    } else if (hasDataLoaded) {
        updateReportCounters();
        renderReportTables();
        restoreSummaryMessage();
    }
}

function restoreSummaryMessage() {
    const statusEl = document.getElementById('ratings-status');
    if (!statusEl || localEpisodesStore.length === 0) return;

    // Récupération des décomptes de synchronisation réels persistés
    const addedHistory = parseInt(localStorage.getItem(STORAGE_ADDED_HISTORY_KEY) || "0", 10);
    const addedRatings = parseInt(localStorage.getItem(STORAGE_ADDED_RATINGS_KEY) || "0", 10);

    const pendings = localEpisodesStore.filter(ep => ep.status === 'pending');
    const notFounds = localEpisodesStore.filter(ep => ep.status === 'not_found');
    const incoherents = localEpisodesStore.filter(ep => ep.status === 'incoherent');

    if (isImportRunning) return;

    if (pendings.length > 0) {
        statusEl.style.color = "#b45309";
        statusEl.innerText = t('statusAborted', { watched: addedHistory, rated: addedRatings });
    } else {
        statusEl.style.color = "#16a34a";
        statusEl.innerText = t('statusSuccess', { watched: addedHistory, rated: addedRatings });
    }

    if (notFounds.length > 0) {
        statusEl.style.color = "#dc2626";
        statusEl.innerText += t('statusNotFoundWarning', { count: notFounds.length });
    }
    
    if (incoherents.length > 0) {
        statusEl.style.color = "#dc2626";
        statusEl.innerText += ` ⚠️ ${incoherents.length} épisode(s) rejeté(s) car noté(s) mais sans historique de visionnage.`;
    }
}

export function toggleRatingsVisibility(isConnected) {
    const section = document.getElementById('ratings-section');
    if (section) {
        if (isConnected) section.classList.remove('hidden');
        else section.classList.add('hidden');
    }
}

function renderReportTables() {
    const successBody = document.getElementById('ratings-success-body');
    const failureBody = document.getElementById('ratings-failure-body');
    
    if (!successBody || !failureBody) return;

    successBody.innerHTML = '';
    failureBody.innerHTML = '';

    const successes = localEpisodesStore.filter(ep => ep.status === 'success');
    const failures = localEpisodesStore.filter(ep => ep.status === 'not_found' || ep.status === 'pending' || ep.status === 'incoherent');

    if (successes.length === 0) {
        successBody.innerHTML = `<tr><td colspan="5" class="loading-stub" style="text-align:center; padding: 20px;">${t('noMatch')}</td></tr>`;
    } else {
        successes.forEach(ep => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${ep.showTitle}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><code>${ep.tvdbId || 'N/A'}</code></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">${ep.watchedAt ? String(ep.watchedAt).split('T')[0] : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align:center">${ep.originalRating || '-'} / 10</td>
            `;
            successBody.appendChild(tr);
        });
    }

    if (failures.length === 0) {
        failureBody.innerHTML = `<tr><td colspan="6" class="loading-stub" style="text-align:center; padding: 20px;">${t('noMatch')}</td></tr>`;
    } else {
        failures.forEach(ep => {
            const tr = document.createElement('tr');
            
            let statusBadge = t('badgeNotFound');
            if (ep.status === 'pending') statusBadge = t('badgeAborted');
            if (ep.status === 'incoherent') statusBadge = t('badgeIncoherent') || '❌ Incohérent';

            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${ep.showTitle}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><code>${ep.tvdbId || 'N/A'}</code></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">${ep.watchedAt ? String(ep.watchedAt).split('T')[0] : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align:center">${ep.originalRating || '-'} / 10</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${statusBadge}</td>
            `;
            failureBody.appendChild(tr);
        });
    }
}

function updateReportCounters() {
    const successCountEl = document.getElementById('cnt-success');
    const failureCountEl = document.getElementById('cnt-failure');
    if (!successCountEl || !failureCountEl) return;

    const successes = localEpisodesStore.filter(ep => ep.status === 'success');
    const failures = localEpisodesStore.filter(ep => ep.status === 'not_found' || ep.status === 'pending' || ep.status === 'incoherent');

    successCountEl.innerText = successes.length;
    failureCountEl.innerText = failures.length;
}

function updateUiImportState(running) {
    isImportRunning = running;
    
    const fileSelector = document.getElementById('ratings-file-selector');
    const fileDetails = document.getElementById('ratings-file-details');
    const btnReset = document.getElementById('btn-reset-ratings');
    const btnCancel = document.getElementById('btn-cancel-ratings');
    const btnImport = document.getElementById('btn-import-ratings');

    const hasDataLoaded = localEpisodesStore && localEpisodesStore.length > 0;

    if (running) {
        if (fileSelector) fileSelector.classList.add('hidden');
        if (fileDetails) fileDetails.classList.remove('hidden');
        if (btnReset) btnReset.classList.add('hidden');
        if (btnCancel) {
            btnCancel.classList.remove('hidden');
            btnCancel.disabled = false;
            btnCancel.innerText = t('btnCancel');
        }
    } else {
        if (btnImport) btnImport.disabled = true;
        if (btnCancel) btnCancel.classList.add('hidden');
        
        if (btnReset) {
            if (hasDataLoaded) btnReset.classList.remove('hidden');
            else btnReset.classList.add('hidden');
        }
    }
}

export function setupRatingsListeners() {
    const btnImport = document.getElementById('btn-import-ratings');
    const btnCancel = document.getElementById('btn-cancel-ratings');
    const btnReset = document.getElementById('btn-reset-ratings');
    const fileInput = document.getElementById('ratings-file');

    if (fileInput && btnImport) {
        fileInput.onchange = () => {
            if (fileInput.files && fileInput.files.length > 0) {
                btnImport.disabled = false;
            } else {
                btnImport.disabled = true;
            }
        };
    }

    if (btnCancel) {
        btnCancel.onclick = () => {
            isImportAborted = true;
            btnCancel.disabled = true;
            btnCancel.innerText = t('btnCancelling');
        };
    }

    if (btnReset) {
        btnReset.onclick = () => {
            localEpisodesStore = [];
            isImportAborted = false;
            isImportRunning = false;
            currentProgressCount = 0;
            totalProgressCount = 0;
            
            localStorage.removeItem(STORAGE_EPISODES_KEY);
            localStorage.removeItem(STORAGE_FILE_NAME_KEY);
            localStorage.removeItem(STORAGE_ADDED_HISTORY_KEY);
            localStorage.removeItem(STORAGE_ADDED_RATINGS_KEY);

            renderRatingsUi();
            
            const token = localStorage.getItem('trakt_access_token');
            if (token) {
                toggleRatingsVisibility(true);
            }
            
            setupRatingsListeners();
        };
    }

    if (!btnImport) return;

    btnImport.onclick = () => {
        const file = fileInput.files[0];
        if (!file) return;

        updateUiImportState(true);
        
        const activeFileNameEl = document.getElementById('ratings-active-filename');
        if (activeFileNameEl) activeFileNameEl.innerText = `📄 ${t('fileImported') || 'Fichier importé'} : ${file.name}`;
        localStorage.setItem(STORAGE_FILE_NAME_KEY, file.name);

        const reportDetails = document.getElementById('ratings-report-details');
        if (reportDetails) reportDetails.classList.add('hidden');

        const statusEl = document.getElementById('ratings-status');
        if (statusEl) {
            statusEl.style.color = "#2563eb";
            statusEl.innerText = t('statusReading');
        }
        isImportAborted = false;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dynamicStatusEl = document.getElementById('ratings-status');
                if (dynamicStatusEl) dynamicStatusEl.innerText = t('statusParsing');
                
                const rawJson = JSON.parse(e.target.result);
                localEpisodesStore = parseTvTimeRatings(rawJson);
                localStorage.setItem(STORAGE_EPISODES_KEY, JSON.stringify(localEpisodesStore));

                if (dynamicStatusEl) dynamicStatusEl.innerText = t('statusSyncing');
                
                const result = await importRatings(
                    localEpisodesStore, 
                    (current, total, step) => {
                        currentProgressCount = current;
                        totalProgressCount = total;
                        const progressStatusEl = document.getElementById('ratings-status');
                        if (progressStatusEl) {
                            const stepLabel = step === 'history' ? t('statusSyncHistory') : t('statusSyncRatings');
                            progressStatusEl.innerText = `${stepLabel} (${current}/${total})`;
                        }
                    },
                    () => isImportAborted
                );

                localEpisodesStore = result.updatedEpisodes;
                localStorage.setItem(STORAGE_EPISODES_KEY, JSON.stringify(localEpisodesStore));
                
                // Persistance des compteurs détaillés de cette session d'import
                localStorage.setItem(STORAGE_ADDED_HISTORY_KEY, result.addedHistory.toString());
                localStorage.setItem(STORAGE_ADDED_RATINGS_KEY, result.addedRatings.toString());

                updateUiImportState(false);
                
                updateReportCounters();
                renderReportTables();
                restoreSummaryMessage();

                const dynamicReportDetails = document.getElementById('ratings-report-details');
                if (dynamicReportDetails) {
                    dynamicReportDetails.classList.remove('hidden');
                    dynamicReportDetails.open = true;
                }
                if (fileInput) fileInput.value = "";
            } catch (err) {
                updateUiImportState(false);
                const errorStatusEl = document.getElementById('ratings-status');
                if (errorStatusEl) {
                    errorStatusEl.style.color = "#dc2626";
                    errorStatusEl.innerText = `❌ Error: ${err.message}`;
                }
                const fileSelector = document.getElementById('ratings-file-selector');
                const fileDetails = document.getElementById('ratings-file-details');
                if (fileSelector) fileSelector.classList.remove('hidden');
                if (fileDetails) fileDetails.classList.add('hidden');
            }
        };
        reader.readAsText(file);
    };
}