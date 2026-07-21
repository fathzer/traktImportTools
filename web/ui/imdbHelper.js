import { t } from './i18n.js';
import { fetchShowSeasonsByTvdbId } from '../traktApi.js';

let dialogElement = null;

// Simple publish/subscribe mechanism for TVDB/IMDb correspondence
const subscribers = new Set();

export function subscribeToImdbUpdate(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function publishImdbUpdate(tvdbId, imdbId) {
    subscribers.forEach(callback => callback(tvdbId, imdbId));
}

/**
 * Opens the IMDB helper dialog and inserts it before the target element
 * @param {HTMLElement} targetElement - The element before which to insert the dialog
 * @param {Array} episodes - List of episodes to display
 */
export function openImdbHelperDialog(targetElement, episodes) {
    // Remove existing dialog if present
    closeImdbHelperDialog();

    // Create dialog container
    dialogElement = document.createElement('div');
    dialogElement.id = 'imdb-helper-dialog';
    dialogElement.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        background: #f8fafc;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    // Build episodes table HTML
    let episodesTableHtml = '';
    if (episodes && episodes.length > 0) {
        const rows = episodes.map(ep => {
            const imdbValue = ep.imdbId || '';
            const hasValidImdb = imdbValue && imdbValue !== '-1' && imdbValue.trim() !== '';
            
            let imdbCellContent = `
                <input type="text" 
                       class="imdb-helper-input" 
                       data-index="${episodes.indexOf(ep)}" 
                       value="${imdbValue}" 
                       placeholder="tt1234567" 
                       style="width: 110px; padding: 4px 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
            `;
            
            if (hasValidImdb) {
                imdbCellContent += `
                    <a href="https://www.imdb.com/fr/title/${imdbValue}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       style="margin-left: 5px; color: #3b82f6; text-decoration: none; font-size: 14px;"
                       title="${t('tooltipOpenImdb')}">
                        🔗
                    </a>
                    <button class="imdb-copy-btn" 
                            data-tvdb-id="${ep.tvdbId}" 
                            data-imdb-id="${imdbValue}"
                            style="margin-left: 5px; background: none; border: none; cursor: pointer; font-size: 14px; padding: 0;"
                            title="${t('tooltipCopyApply')}">
                        📋
                    </button>
                `;
            }
            
            return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${ep.showTitle}</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;"><input type="checkbox" ${ep.special ? 'checked' : ''} disabled style="cursor: default;"></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><code>${ep.tvdbId || 'N/A'}</code></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                        <div style="display: flex; align-items: center;">
                            ${imdbCellContent}
                        </div>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"></td>
                </tr>
            `;
        }).join('');

        episodesTableHtml = `
            <div style="max-height: 350px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <table style="font-size: 13px; margin-top: 0; width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="position: sticky; top: 0; background: #f3f4f6; z-index: 1;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thShow')}</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thEpisode')}</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${t('thSpecial')}</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thTvdb')}</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thImdb')}</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${t('thConfidence')}</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } else {
        episodesTableHtml = `<p style="color: #6b7280; font-size: 14px;">${t('noMatch')}</p>`;
    }

    dialogElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #1e293b; font-size: 16px;">${t('imdbHelperTitle')}</h3>
            <button id="btn-close-imdb-helper" style="
                background: #ef4444;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            ">${t('imdbHelperClose')}</button>
        </div>
        <div id="imdb-helper-content">
            ${episodesTableHtml}
        </div>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button id="btn-search-imdb" class="action-btn" style="background-color: #3b82f6;">
                ${t('imdbHelperSearch')}
            </button>
        </div>
    `;

    // Insert dialog before the target element
    targetElement.parentNode.insertBefore(dialogElement, targetElement);

    // Setup close button listener
    const closeBtn = document.getElementById('btn-close-imdb-helper');
    if (closeBtn) {
        closeBtn.onclick = closeImdbHelperDialog;
    }

    // Setup IMDb input listeners to toggle link icon
    document.querySelectorAll('.imdb-helper-input').forEach(input => {
        const updateLinkIcon = () => {
            const imdbValue = input.value.trim();
            const hasValidImdb = imdbValue && imdbValue !== '-1';
            const parentCell = input.parentElement;
            const tvdbId = input.closest('tr')?.querySelector('code')?.textContent;
            
            // Remove existing link and copy button if present
            const existingLink = parentCell.querySelector('a');
            if (existingLink) {
                existingLink.remove();
            }
            const existingCopyBtn = parentCell.querySelector('.imdb-copy-btn');
            if (existingCopyBtn) {
                existingCopyBtn.remove();
            }
            
            // Add link and copy button if IMDb ID is valid
            if (hasValidImdb) {
                const link = document.createElement('a');
                link.href = `https://www.imdb.com/fr/title/${imdbValue}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.style.cssText = 'margin-left: 5px; color: #3b82f6; text-decoration: none; font-size: 14px;';
                link.title = t('tooltipOpenImdb');
                link.textContent = '🔗';
                parentCell.appendChild(link);
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'imdb-copy-btn';
                copyBtn.dataset.tvdbId = tvdbId;
                copyBtn.dataset.imdbId = imdbValue;
                copyBtn.style.cssText = 'margin-left: 5px; background: none; border: none; cursor: pointer; font-size: 14px; padding: 0;';
                copyBtn.title = t('tooltipCopyApply');
                copyBtn.textContent = '📋';
                copyBtn.onclick = () => {
                    publishImdbUpdate(tvdbId, imdbValue);
                };
                parentCell.appendChild(copyBtn);
            }
        };
        
        input.addEventListener('input', updateLinkIcon);
    });

    // Setup copy button listeners for initial buttons
    document.querySelectorAll('.imdb-copy-btn').forEach(btn => {
        btn.onclick = () => {
            const tvdbId = btn.dataset.tvdbId;
            const imdbId = btn.dataset.imdbId;
            publishImdbUpdate(tvdbId, imdbId);
        };
    });

    // Setup search button listener
    const searchBtn = document.getElementById('btn-search-imdb');
    if (searchBtn) {
        searchBtn.onclick = async () => {
            searchBtn.disabled = true;
            searchBtn.textContent = '...';
            
            try {
                // Group episodes by TVDB ID (show)
                const showsMap = new Map();
                episodes.forEach(ep => {
                    if (!ep.showId || !ep.showId.tvdb) return;
                    if (!showsMap.has(ep.showId.tvdb)) {
                        showsMap.set(ep.showId.tvdb, []);
                    }
                    showsMap.get(ep.showId.tvdb).push(ep);
                });

                // Process each show
                for (const [tvdbId, showEpisodes] of showsMap) {
                    const showName = showEpisodes[0]?.showTitle || 'Unknown';
                    console.log(`[IMDB Helper] Processing show: ${showName} (TVDB ID: ${tvdbId})`);
                    
                    try {
                        const result = await fetchShowSeasonsByTvdbId(Number(tvdbId));
                        console.log(`[IMDB Helper] API response for ${showName}:`, result ? `${result.episodeMap.size} episodes found` : 'null (show not found)');
                        
                        if (result === null) {
                            // Show not found
                            console.log(`[IMDB Helper] Show not found: ${showName}`);
                            showEpisodes.forEach(ep => {
                                updateEpisodeConfidence(episodes.indexOf(ep), 'showNotFound', null, null);
                            });
                        } else {
                            const { slug, episodeMap } = result;
                            // Show found, process each episode
                            showEpisodes.forEach(ep => {
                                const seasonEpisodes = Array.from(episodeMap.values())
                                    .filter(e => e.season === ep.seasonNumber);
                                
                                console.log(`[IMDB Helper] Season ${ep.seasonNumber} for ${showName}: ${seasonEpisodes.length} episodes found`);
                                
                                if (seasonEpisodes.length === 0) {
                                    // Season not found
                                    console.log(`[IMDB Helper] Season not found: ${showName} S${ep.seasonNumber}`);
                                    updateEpisodeConfidence(episodes.indexOf(ep), 'seasonNotFound', null, slug);
                                } else if (ep.special) {
                                    // Special episode - use last episode of season
                                    const lastEpisode = seasonEpisodes[seasonEpisodes.length - 1];
                                    console.log(`[IMDB Helper] Special episode for ${showName}: using last episode IMDb ID ${lastEpisode.imdbId}`);
                                    updateEpisodeConfidence(episodes.indexOf(ep), 'uncertain', lastEpisode, slug);
                                } else {
                                    // Non-special episode - try to find exact match
                                    const exactMatch = seasonEpisodes.find(e => e.episode === ep.episodeNumber);
                                    if (exactMatch) {
                                        console.log(`[IMDB Helper] Episode found: ${showName} S${ep.seasonNumber}E${ep.episodeNumber} -> IMDb ID ${exactMatch.imdbId}`);
                                        updateEpisodeConfidence(episodes.indexOf(ep), 'high', exactMatch, slug);
                                    } else {
                                        console.log(`[IMDB Helper] Episode not found: ${showName} S${ep.seasonNumber}E${ep.episodeNumber}`);
                                        updateEpisodeConfidence(episodes.indexOf(ep), 'absent', null, slug);
                                    }
                                }
                            });
                        }
                    } catch (err) {
                        // Error occurred
                        console.error(`[IMDB Helper] Error processing show ${showName}:`, err);
                        showEpisodes.forEach(ep => {
                            updateEpisodeConfidence(episodes.indexOf(ep), 'error', null, null);
                        });
                    }
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = t('imdbHelperSearch');
            }
        };
    }
}

/**
 * Updates the confidence column and IMDb ID field for an episode
 * @param {number} index - Episode index in the list
 * @param {string} confidenceType - Type of confidence (showNotFound, seasonNotFound, high, uncertain, absent, error)
 * @param {Object} episodeData - Episode data from Trakt API (if found)
 * @param {string} slug - Trakt show slug (if show was found)
 */
function updateEpisodeConfidence(index, confidenceType, episodeData, slug) {
    const tbody = document.querySelector('#imdb-helper-content tbody');
    if (!tbody) return;
    
    const row = tbody.children[index];
    if (!row) return;
    
    const confidenceCell = row.children[5]; // Confidence column
    const imdbInput = row.querySelector('.imdb-helper-input');
    const showTitleCell = row.children[0]; // Show title column
    
    let confidenceText = '';
    let confidenceIcon = '';
    
    switch (confidenceType) {
        case 'showNotFound':
            confidenceText = t('confidenceShowNotFound');
            confidenceIcon = '⬡❓';
            break;
        case 'seasonNotFound':
            confidenceText = t('confidenceSeasonNotFound');
            confidenceIcon = '⬡❓';
            break;
        case 'high':
            confidenceText = t('confidenceHigh');
            confidenceIcon = '🚀';
            if (episodeData && imdbInput) {
                imdbInput.value = episodeData.imdbId || '';
                imdbInput.dispatchEvent(new Event('input'));
            }
            break;
        case 'uncertain':
            confidenceText = t('confidenceUncertain');
            confidenceIcon = '☢️';
            if (episodeData && imdbInput) {
                imdbInput.value = episodeData.imdbId || '';
                imdbInput.dispatchEvent(new Event('input'));
            }
            break;
        case 'absent':
            confidenceText = t('confidenceAbsent');
            confidenceIcon = '❓';
            break;
        case 'error':
            confidenceText = t('confidenceError');
            confidenceIcon = '🔥';
            break;
    }
    
    if (confidenceCell) {
        confidenceCell.textContent = `${confidenceIcon} ${confidenceText}`;
    }
    
    // Add Trakt icon if slug is available and show was found
    if (slug && showTitleCell) {
        const existingTraktIcon = showTitleCell.querySelector('.trakt-icon');
        if (!existingTraktIcon) {
            const seasonNumber = parseInt(row.children[1].textContent.match(/S(\d+)/)?.[1] || '0');
            const traktUrl = seasonNumber > 0 
                ? `https://app.trakt.tv/shows/${slug}?season=${seasonNumber}&mode=show`
                : `https://app.trakt.tv/shows/${slug}?mode=show`;
            
            const traktIcon = document.createElement('a');
            traktIcon.href = traktUrl;
            traktIcon.target = '_blank';
            traktIcon.rel = 'noopener noreferrer';
            traktIcon.className = 'trakt-icon';
            traktIcon.style.cssText = 'margin-left: 5px; text-decoration: none;';
            traktIcon.title = t('tooltipViewTrakt');
            
            const traktImg = document.createElement('img');
            traktImg.src = 'https://app.trakt.tv/favicon.svg';
            traktImg.alt = 'Trakt';
            traktImg.width = 14;
            traktImg.height = 14;
            
            traktIcon.appendChild(traktImg);
            showTitleCell.appendChild(traktIcon);
        }
    }
}

/**
 * Closes and removes the IMDB helper dialog
 */
export function closeImdbHelperDialog() {
    if (dialogElement) {
        dialogElement.remove();
        dialogElement = null;
    }
}
