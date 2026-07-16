import { parseTvTimeRatings } from '../tvTimeLiberator.js';
import { importRatings } from '../traktApi.js';
import { ImportStatus } from '../constants.js';
import { t } from './i18n.js';

let localEpisodesStore = []; // Liste plate
let localTreeStore = [];      // Structure arborescente (Séries -> Saisons -> Épisodes)
let isImportAborted = false;
let isImportRunning = false;

let currentProgressCount = 0;
let totalProgressCount = 0;

const STORAGE_EPISODES_KEY = 'trakt_import_episodes';
const STORAGE_TREE_KEY = 'trakt_import_tree';
const STORAGE_FILE_NAME_KEY = 'trakt_import_file_name';
const STORAGE_ADDED_HISTORY_KEY = 'trakt_import_added_history';
const STORAGE_ADDED_RATINGS_KEY = 'trakt_import_added_ratings';

export function renderRatingsUi() {
    // Restauration depuis le localStorage au chargement
    if (localEpisodesStore.length === 0) {
        const storedEpisodes = localStorage.getItem(STORAGE_EPISODES_KEY);
        const storedTree = localStorage.getItem(STORAGE_TREE_KEY);
        if (storedEpisodes && storedTree) {
            try {
                localEpisodesStore = JSON.parse(storedEpisodes);
                localTreeStore = JSON.parse(storedTree);
                
                // Recréer les liens de référence mémoire après désérialisation
                relinkFlatToTree();
            } catch (e) {
                console.error("Erreur lors de la lecture des données persistées :", e);
                localEpisodesStore = [];
                localTreeStore = [];
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
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thSpecial')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thTvdb')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thWatchedAt')}</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thRating')}</th>
                                </tr>
                            </thead>
                            <tbody id="ratings-success-body"></tbody>
                        </table>
                    </div>
                </div>

                <div style="margin-top: 15px; margin-bottom: 25px;">
                    <h4 style="margin: 0 0 10px 0; color: #dc2626; display: flex; align-items: center; justify-content: space-between; font-size: 14px;">
                        <span>${t('titleFailures')}</span>
                        <span id="cnt-failure" style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">0</span>
                    </h4>
                    <div style="max-height: 350px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <table style="font-size: 13px; margin-top: 0; width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="position: sticky; top: 0; background: #f3f4f6; z-index: 1;">
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thIgnore')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thShow')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thEpisode')}</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thSpecial')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thTvdb')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; width: 130px;">${t('thImdb') || 'ID IMDb'}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thWatchedAt')}</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thRating')}</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thStatus')}</th>
                                </tr>
                            </thead>
                            <tbody id="ratings-failure-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="correction-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btn-save-corrections" class="action-btn" style="background-color: #10b981;">
                        ${t('btnSaveStore') || '💾 Enregistrer les corrections'}
                    </button>
                    <button id="btn-retry-corrections" class="action-btn" style="background-color: #3b82f6;">
                        ${t('btnRetrySync') || '🔄 Synchroniser les corrections'}
                    </button>
                    <button id="btn-download-json" class="secondary" style="border-color: #6b7280; color: #374151;">
                        ${t('btnDownloadJson') || '📥 Exporter le fichier corrigé'}
                    </button>
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

/**
 * Recrée le chaînage d'objets (_ref) entre la liste plate et la structure arborescente.
 */
function relinkFlatToTree() {
    const treeMap = {};
    localTreeStore.forEach(show => {
        treeMap[show.title] = show;
    });

    localEpisodesStore.forEach(ep => {
        const show = treeMap[ep.showTitle];
        if (show) {
            const season = show.seasons.find(s => s.number === ep.seasonNumber);
            if (season) {
                const episodeNode = season.episodes.find(e => e.number === ep.episodeNumber);
                if (episodeNode) {
                    ep._ref = episodeNode;
                }
            }
        }
    });
}

function restoreSummaryMessage() {
    const statusEl = document.getElementById('ratings-status');
    if (!statusEl || localEpisodesStore.length === 0) return;

    const addedHistory = parseInt(localStorage.getItem(STORAGE_ADDED_HISTORY_KEY) || "0", 10);
    const addedRatings = parseInt(localStorage.getItem(STORAGE_ADDED_RATINGS_KEY) || "0", 10);

    const pendings = localEpisodesStore.filter(ep => ep.status === ImportStatus.PENDING);
    const notFounds = localEpisodesStore.filter(ep => ep.status === ImportStatus.NOT_FOUND);
    const incoherents = localEpisodesStore.filter(ep => ep.status === ImportStatus.INCONSISTENT);

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
        statusEl.innerText += t('inconsistentWarning', { count: incoherents.length });
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

    // Filtrage propre basé strictement sur l'énumération ImportStatus
    const successes = localEpisodesStore.filter(ep => ep.status === ImportStatus.SUCCESS);
    const failures = localEpisodesStore.filter(ep => 
        ep.status === ImportStatus.NOT_FOUND || 
        ep.status === ImportStatus.PENDING || 
        ep.status === ImportStatus.INCONSISTENT
    );

    if (successes.length === 0) {
        successBody.innerHTML = `<tr><td colspan="6" class="loading-stub" style="text-align:center; padding: 20px;">${t('noMatch')}</td></tr>`;
    } else {
        successes.forEach(ep => {
            const tr = document.createElement('tr');
            
            // 🛠 AFFICHAGE DE L'ID : Priorité à l'ID IMDb avec mention s'il est présent
            let displayId = "";
            if (ep.imdbId && ep.imdbId !== "-1" && ep.imdbId.trim() !== "") {
                displayId = `<code>${ep.imdbId}</code> <span style="font-size: 11px; color: #6b7280; font-weight: 600;">(imdb)</span>`;
            } else {
                displayId = `<code>${ep.tvdbId || 'N/A'}</code>`;
            }

            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${ep.showTitle}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;"><input type="checkbox" ${ep.special ? 'checked' : ''} disabled style="cursor: default;"></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${displayId}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">${ep.watchedAt ? String(ep.watchedAt).split('T')[0] : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align:center">${ep.originalRating || '-'} / 10</td>
            `;
            successBody.appendChild(tr);
        });
    }

    if (failures.length === 0) {
        failureBody.innerHTML = `<tr><td colspan="9" class="loading-stub" style="text-align:center; padding: 20px;">${t('noMatch')}</td></tr>`;
    } else {
        failures.forEach((ep, index) => {
            const tr = document.createElement('tr');
            
            let statusBadge = t('badgeNotFound');
            if (ep.status === ImportStatus.PENDING) statusBadge = t('badgeAborted');
            if (ep.status === ImportStatus.INCONSISTENT) statusBadge = t('badgeIncoherent') || '❌ Incohérent';

            let imdbMarkup = '';
            if (ep.status === ImportStatus.INCONSISTENT) {
                imdbMarkup = `<span style="color: #9ca3af; font-style: italic;">N/A</span>`;
            } else {
                imdbMarkup = `
                    <input type="text" 
                           class="imdb-edit-input" 
                           data-index="${index}" 
                           value="${ep.imdbId || ''}" 
                           placeholder="tt1234567" 
                           style="width: 110px; padding: 4px 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
                `;
            }

            const isInconsistent = ep.status === ImportStatus.INCONSISTENT;
            let ignoreChecked;
            if (isInconsistent) {
                ignoreChecked = 'checked';
            } else {
                ignoreChecked = ep.ignore ? 'checked' : '';
            }
            const ignoreDisabled = isInconsistent ? 'disabled' : '';

            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;"><input type="checkbox" class="ignore-checkbox" data-index="${index}" ${ignoreChecked} ${ignoreDisabled} style="cursor: ${isInconsistent ? 'default' : 'pointer'};"></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${ep.showTitle}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;"><input type="checkbox" ${ep.special ? 'checked' : ''} disabled style="cursor: default;"></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><code>${ep.tvdbId || 'N/A'}</code></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${imdbMarkup}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">${ep.watchedAt ? String(ep.watchedAt).split('T')[0] : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align:center">${ep.originalRating || '-'} / 10</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${statusBadge}</td>
            `;
            failureBody.appendChild(tr);
        });

        // Liaison des saisies IMDb en cascade vers la structure arborescente (par référence)
        document.querySelectorAll('.imdb-edit-input').forEach(input => {
            input.oninput = (e) => {
                const failureIndex = parseInt(e.target.getAttribute('data-index'), 10);
                // On utilise le même filtre cohérent ici pour cibler le bon élément du tableau
                const targetFailures = localEpisodesStore.filter(ep => 
                    ep.status === ImportStatus.NOT_FOUND || 
                    ep.status === ImportStatus.PENDING || 
                    ep.status === ImportStatus.INCONSISTENT
                );
                const targetEpisode = targetFailures[failureIndex];
                
                if (targetEpisode) {
                    const cleanValue = e.target.value.trim() || null;
                    targetEpisode.imdbId = cleanValue;
                    
                    // Mise à jour automatique de la structure arborescente liée par référence
                    if (targetEpisode._ref) {
                        targetEpisode._ref.id.imdb = cleanValue;
                    }
                }
            };
        });

        // Liaison des cases à cocher Ignorer vers la structure de données
        document.querySelectorAll('.ignore-checkbox').forEach(checkbox => {
            checkbox.onchange = (e) => {
                const failureIndex = parseInt(e.target.getAttribute('data-index'), 10);
                const targetFailures = localEpisodesStore.filter(ep => 
                    ep.status === ImportStatus.NOT_FOUND || 
                    ep.status === ImportStatus.PENDING || 
                    ep.status === ImportStatus.INCONSISTENT
                );
                const targetEpisode = targetFailures[failureIndex];
                
                if (targetEpisode && targetEpisode.status !== ImportStatus.INCONSISTENT) {
                    targetEpisode.ignore = e.target.checked;
                    
                    // Mise à jour automatique de la structure arborescente liée par référence
                    if (targetEpisode._ref) {
                        targetEpisode._ref.ignore = e.target.checked;
                    }
                }
            };
        });
    }
}

function updateReportCounters() {
    const successCountEl = document.getElementById('cnt-success');
    const failureCountEl = document.getElementById('cnt-failure');
    if (!successCountEl || !failureCountEl) return;

    const successes = localEpisodesStore.filter(ep => ep.status === ImportStatus.SUCCESS);
    const failures = localEpisodesStore.filter(ep => ep.status === ImportStatus.NOT_FOUND || ep.status === ImportStatus.PENDING || ep.status === ImportStatus.INCONSISTENT);

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

    const btnSave = document.getElementById('btn-save-corrections');
    const btnDownload = document.getElementById('btn-download-json');
    const btnRetry = document.getElementById('btn-retry-corrections');

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
            localTreeStore = [];
            isImportAborted = false;
            isImportRunning = false;
            currentProgressCount = 0;
            totalProgressCount = 0;
            
            localStorage.removeItem(STORAGE_EPISODES_KEY);
            localStorage.removeItem(STORAGE_TREE_KEY);
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

    // BOUTON 1 : Enregistrement de l'état actuel (Arbre + Plat)
    if (btnSave) {
        btnSave.onclick = () => {
            localStorage.setItem(STORAGE_EPISODES_KEY, JSON.stringify(localEpisodesStore));
            localStorage.setItem(STORAGE_TREE_KEY, JSON.stringify(localTreeStore));
            const statusEl = document.getElementById('ratings-status');
            if (statusEl) {
                statusEl.style.color = "#10b981";
                statusEl.innerText = t('statusSaved') || "💾 Modifications enregistrées localement !";
                setTimeout(restoreSummaryMessage, 2000);
            }
        };
    }

    // BOUTON 2 : Exporter l'état d'importation arborescent et enrichi
    if (btnDownload) {
        btnDownload.onclick = () => {
            // On télécharge la structure arborescente enrichie
            const blob = new Blob([JSON.stringify(localTreeStore, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const sourceName = localStorage.getItem(STORAGE_FILE_NAME_KEY) || 'shows-corrected.json';
            a.href = url;
            a.download = sourceName.replace('.json', '-state.json');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }

    // BOUTON 3 : Retry (En attente d'implémentation de l'import/recherche auto)
    if (btnRetry) {
        btnRetry.onclick = async () => {
            const failures = localEpisodesStore.filter(ep => ep.status === ImportStatus.NOT_FOUND || ep.status === ImportStatus.INCONSISTENT);

            if (failures.length === 0) {
                alert(t('noErrorToSyncAlert'));
                return;
            }

            // Préparation : on repasse les échecs en "pending" pour qu'ils soient traités
            failures.forEach(ep => {
                ep.status = ImportStatus.PENDING;
                if (ep._ref) ep._ref.status = ImportStatus.PENDING;
            });

            updateUiImportState(true);
            isImportAborted = false;

            try {
                // Appel unique (même fonction !)
                const result = await importRatings(
                    localEpisodesStore,
                    (current, total, step) => updateProgressUi(current, total, step),
                    () => isImportAborted
                );

                // Finalisation commune (en mode cumul : isIncremental = true)
                finalizeImportState(result, true);

                const statusEl = document.getElementById('ratings-status');
                if (statusEl) {
                    statusEl.style.color = "#16a34a";
                    statusEl.innerText = t('correctionsSynced', { history: result.addedHistory, ratings: result.addedRatings });
                    setTimeout(restoreSummaryMessage, 5000);
                }
            } catch (err) {
                // ... gestion erreur ...
            }
        };
    }

    if (!fileInput || !btnImport) return;

    btnImport.onclick = () => {
        const file = fileInput.files[0];
        if (!file) return;

        updateUiImportState(true);
        
        const activeFileNameEl = document.getElementById('ratings-active-filename');
        if (activeFileNameEl) activeFileNameEl.innerText = `📄 ${t('fileImported')} : ${file.name}`;
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
                
                // Parsing et détection du format
                if (Array.isArray(rawJson) && rawJson.length > 0 && rawJson[0].hasOwnProperty('seasons')) {
                    const parsed = parseTvTimeRatings(rawJson);
                    localTreeStore = parsed.tree;
                    localEpisodesStore = parsed.flat;
                }

                if (dynamicStatusEl) dynamicStatusEl.innerText = t('statusSyncing');
                
                // Appel unique
                const result = await importRatings(
                    localEpisodesStore, 
                    (current, total, step) => updateProgressUi(current, total, step),
                    () => isImportAborted
                );

                // Finalisation commune (en mode écrasement : isIncremental = false)
                finalizeImportState(result, false);

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
                    errorStatusEl.innerText = `❌ ${t('errorPrefix')} ${err.message}`;
                }
            }
        };
        reader.readAsText(file);
    };
}

/**
 * Centralise la sauvegarde des données, le calcul des compteurs et le rafraîchissement complet de l'IHM
 * @param {Object} result - Le résultat retourné par importRatings
 * @param {boolean} isIncremental - Si vrai, on ajoute les scores aux compteurs existants (cas du Retry). Sinon, on écrase (cas de l'Import initial).
 */
function finalizeImportState(result, isIncremental = false) {
    localEpisodesStore = result.updatedEpisodes;

    // 1. Sauvegarde des structures en local
    localStorage.setItem(STORAGE_EPISODES_KEY, JSON.stringify(localEpisodesStore));
    localStorage.setItem(STORAGE_TREE_KEY, JSON.stringify(localTreeStore));

    // 2. Gestion propre des compteurs Trakt
    if (isIncremental) {
        const prevHistory = parseInt(localStorage.getItem(STORAGE_ADDED_HISTORY_KEY) || "0", 10);
        const prevRatings = parseInt(localStorage.getItem(STORAGE_ADDED_RATINGS_KEY) || "0", 10);
        localStorage.setItem(STORAGE_ADDED_HISTORY_KEY, (prevHistory + result.addedHistory).toString());
        localStorage.setItem(STORAGE_ADDED_RATINGS_KEY, (prevRatings + result.addedRatings).toString());
    } else {
        localStorage.setItem(STORAGE_ADDED_HISTORY_KEY, result.addedHistory.toString());
        localStorage.setItem(STORAGE_ADDED_RATINGS_KEY, result.addedRatings.toString());
    }

    // 3. Extinction de l'état "en cours" de l'IHM
    updateUiImportState(false);
    
    // 4. Rafraîchissement global de la vue
    updateReportCounters();
    renderReportTables();
    restoreSummaryMessage();

    // 5. Ré-attachement des écouteurs sur le DOM fraîchement rendu
    setupRatingsListeners();
}

/**
 * Met à jour l'affichage textuel de la progression de la synchronisation.
 * @param {number} current - Le nombre d'épisodes traités dans le lot actuel
 * @param {number} total - Le nombre total d'épisodes à traiter pour cette étape
 * @param {string} step - L'étape en cours ('history' ou 'ratings')
 */
function updateProgressUi(current, total, step) {
    currentProgressCount = current;
    totalProgressCount = total;
    
    const progressStatusEl = document.getElementById('ratings-status');
    if (!progressStatusEl) return;

    let stepLabel = "";
    if (step === 'history') {
        stepLabel = t('statusSyncHistory') || "🔄 Synchronisation de l'historique";
    } else if (step === 'ratings') {
        stepLabel = t('statusSyncRatings') || "🔄 Synchronisation des notes";
    } else {
        stepLabel = t('syncInProgress');
    }

    progressStatusEl.innerText = `${stepLabel} (${current}/${total})`;
}