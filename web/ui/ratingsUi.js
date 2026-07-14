import { parseTvTimeRatings } from '../tvTimeLiberator.js';
import { importRatings } from '../traktApi.js';
import { t } from './i18n.js';

let localEpisodesStore = [];
let isImportAborted = false;

export function renderRatingsUi() {
    document.getElementById('ratings-container').innerHTML = `
        <div id="ratings-section" class="card hidden">
            <h3>${t('ratingsTitle')}</h3>
            <p style="font-size: 14px; color: #6b7280;">${t('ratingsDesc')}</p>
            
            <div style="margin-top: 15px;">
                <input type="file" id="ratings-file" accept=".json" style="font-size: 14px;">
                <button id="btn-import-ratings" class="action-btn" style="margin-left: 10px;">${t('btnImport')}</button>
                <button id="btn-cancel-ratings" class="secondary hidden" style="border-color: #dc2626; color: #dc2626;">${t('btnCancel')}</button>
            </div>
            <p id="ratings-status" style="margin-top: 15px; font-weight: bold; font-size: 14px;"></p>
            
            <details id="ratings-report-details" class="hidden" style="margin-top: 20px; border: 1px solid #ccc; border-radius: 8px; padding: 15px; background: #fff;">
                <summary style="cursor: pointer; font-weight: bold; padding: 5px;">${t('reportSummary')}</summary>
                
                <!-- Section Succès -->
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

                <!-- Section Échecs -->
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
}

export function toggleRatingsVisibility(isConnected) {
    const section = document.getElementById('ratings-section');
    if (isConnected) section.classList.remove('hidden');
    else section.classList.add('hidden');
}

function renderReportTables() {
    const successBody = document.getElementById('ratings-success-body');
    const failureBody = document.getElementById('ratings-failure-body');
    
    successBody.innerHTML = '';
    failureBody.innerHTML = '';

    const successes = localEpisodesStore.filter(ep => ep.status === 'success');
    const failures = localEpisodesStore.filter(ep => ep.status === 'not_found' || ep.status === 'pending');

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
    const successes = localEpisodesStore.filter(ep => ep.status === 'success');
    const failures = localEpisodesStore.filter(ep => ep.status === 'not_found' || ep.status === 'pending');

    document.getElementById('cnt-success').innerText = successes.length;
    document.getElementById('cnt-failure').innerText = failures.length;
}

export function setupRatingsListeners() {
    const btnImport = document.getElementById('btn-import-ratings');
    const btnCancel = document.getElementById('btn-cancel-ratings');
    const fileInput = document.getElementById('ratings-file');
    const statusEl = document.getElementById('ratings-status');
    const reportDetails = document.getElementById('ratings-report-details');

    btnCancel.addEventListener('click', () => {
        isImportAborted = true;
        btnCancel.disabled = true;
        btnCancel.innerText = t('btnCancelling');
    });

    btnImport.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return alert(t('selectFileAlert'));

        btnImport.disabled = true;
        btnCancel.disabled = false;
        btnCancel.innerText = t('btnCancel');
        btnCancel.classList.remove('hidden');
        reportDetails.classList.add('hidden');
        statusEl.style.color = "#2563eb";
        statusEl.innerText = t('statusReading');
        isImportAborted = false;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const rawJson = JSON.parse(e.target.result);
                statusEl.innerText = t('statusParsing');
                localEpisodesStore = parseTvTimeRatings(rawJson);

                statusEl.innerText = t('statusSyncing');
                const result = await importRatings(
                    localEpisodesStore, 
                    (current, total) => {
                        statusEl.innerText = t('statusProgress', {current, total});
                    },
                    () => isImportAborted
                );

                localEpisodesStore = result.updatedEpisodes;
                updateReportCounters();
                renderReportTables();
                
                const notFoundCount = localEpisodesStore.filter(e => e.status === 'not_found').length;

                if (result.aborted) {
                    statusEl.style.color = "#b45309";
                    statusEl.innerText = t('statusAborted', {added: result.added});
                } else {
                    statusEl.style.color = "#16a34a";
                    statusEl.innerText = t('statusSuccess', {added: result.added});
                }

                if (notFoundCount > 0) {
                    statusEl.style.color = "#dc2626";
                    statusEl.innerText += t('statusNotFoundWarning', {count: notFoundCount});
                }

                reportDetails.classList.remove('hidden');
                fileInput.value = "";
            } catch (err) {
                statusEl.style.color = "#dc2626";
                statusEl.innerText = `❌ Error: ${err.message}`;
            } finally {
                btnImport.disabled = false;
                btnCancel.classList.add('hidden');
            }
        };
        reader.readAsText(file);
    });
}