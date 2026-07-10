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
            
            <details id="ratings-report-details" class="hidden" style="margin-top: 20px; border: 1px solid #ccc; border-radius: 8px; padding: 10px; background: #fff;">
                <summary style="cursor: pointer; font-weight: bold; padding: 5px;">${t('reportSummary')}</summary>
                
                <div style="margin: 15px 0; padding: 10px; background: #f3f4f6; border-radius: 6px; font-size: 13px;">
                    <strong>${t('filterLabel')}</strong>
                    <label style="margin-left: 10px;"><input type="radio" name="filter-status" value="all" checked> ${t('filterAll')} (<span id="cnt-all">0</span>)</label>
                    <label style="margin-left: 10px;"><input type="radio" name="filter-status" value="success"> ${t('filterSuccess')} (<span id="cnt-success">0</span>)</label>
                    <label style="margin-left: 10px;"><input type="radio" name="filter-status" value="not_found"> ${t('filterNotFound')} (<span id="cnt-not_found">0</span>)</label>
                    <label style="margin-left: 10px;"><input type="radio" name="filter-status" value="unrated"> ${t('filterUnrated')} (<span id="cnt-unrated">0</span>)</label>
                </div>

                <div style="max-height: 400px; overflow-y: auto;">
                    <table style="font-size: 13px; margin-top: 0;">
                        <thead>
                            <tr style="position: sticky; top: 0; background: #f3f4f6;">
                                <th>${t('thShow')}</th>
                                <th>${t('thEpisode')}</th>
                                <th>${t('thTvdb')}</th>
                                <th>${t('thTvTimeRating')}</th>
                                <th>${t('thTraktRating')}</th>
                                <th>${t('thStatus')}</th>
                            </tr>
                        </thead>
                        <tbody id="ratings-report-body"></tbody>
                    </table>
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

function renderReportTable(filter = 'all') {
    const tbody = document.getElementById('ratings-report-body');
    tbody.innerHTML = '';

    const filtered = localEpisodesStore.filter(ep => {
        if (filter === 'all') return true;
        return ep.status === filter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-stub" style="text-align:center;">${t('noMatch')}</td></tr>`;
        return;
    }

    filtered.forEach(ep => {
        const tr = document.createElement('tr');
        
        let statusBadge = t('badgeUnrated');
        if (ep.status === 'success') statusBadge = t('badgeOk');
        if (ep.status === 'not_found') statusBadge = t('badgeNotFound');
        if (ep.status === 'pending') statusBadge = t('badgeAborted');

        tr.innerHTML = `
            <td><strong>${ep.showTitle}</strong></td>
            <td>S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}</td>
            <td><code>${ep.tvdbId || 'N/A'}</code></td>
            <td style="text-align:center">${ep.originalRating || '-'} / 10</td>
            <td style="text-align:center; font-weight:bold">${ep.rating || '-'} / 10</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateFilterCounters() {
    document.getElementById('cnt-all').innerText = localEpisodesStore.length;
    document.getElementById('cnt-success').innerText = localEpisodesStore.filter(e => e.status === 'success').length;
    document.getElementById('cnt-not_found').innerText = localEpisodesStore.filter(e => e.status === 'not_found').length;
    document.getElementById('cnt-unrated').innerText = localEpisodesStore.filter(e => e.status === 'unrated').length;
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
                updateFilterCounters();
                renderReportTable('all');
                document.querySelector('input[name="filter-status"][value="all"]').checked = true;
                
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

    document.querySelectorAll('input[name="filter-status"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            renderReportTable(e.target.value);
        });
    });
}