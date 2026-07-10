import { parseTvTimeRatings } from '../tvTimeLiberator.js';
import { importRatings } from '../traktApi.js';

export function renderRatingsUi() {
    document.getElementById('ratings-container').innerHTML = `
        <div id="ratings-section" class="card hidden">
            <h3>Importateur de notes TV Time</h3>
            <p style="font-size: 14px; color: #6b7280;">Sélectionnez votre fichier JSON exporté pour envoyer vos notes d'épisodes (converties sur 10) vers Trakt.</p>
            <div style="margin-top: 15px;">
                <input type="file" id="ratings-file" accept=".json" style="font-size: 14px;">
                <button id="btn-import-ratings" class="action-btn" style="margin-left: 10px;">Lancer l'importation</button>
            </div>
            <p id="ratings-status" style="margin-top: 15px; font-weight: bold; font-size: 14px;"></p>
        </div>
    `;
}

export function toggleRatingsVisibility(isConnected) {
    const section = document.getElementById('ratings-section');
    if (isConnected) section.classList.remove('hidden');
    else section.classList.add('hidden');
}

export function setupRatingsListeners() {
    const btnImport = document.getElementById('btn-import-ratings');
    const fileInput = document.getElementById('ratings-file');
    const statusEl = document.getElementById('ratings-status');

    btnImport.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return alert("Sélectionnez un fichier JSON.");

        btnImport.disabled = true;
        statusEl.style.color = "#2563eb";
        statusEl.innerText = "Lecture du fichier...";

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const rawJson = JSON.parse(e.target.result);
                statusEl.innerText = "Analyse des données TV Time...";
                const cleanRatings = parseTvTimeRatings(rawJson);

                statusEl.innerText = `Préparation de l'import (${cleanRatings.length} épisodes)...`;
                const result = await importRatings(cleanRatings, (current, total) => {
                    statusEl.innerText = `🔄 Synchronisation : ${current} / ${total} épisodes...`;
                });

                statusEl.style.color = "#16a34a";
                statusEl.innerText = `🎉 Succès ! ${result.added} notes synchronisées.`;
                fileInput.value = "";
            } catch (err) {
                statusEl.style.color = "#dc2626";
                statusEl.innerText = `❌ Erreur : ${err.message}`;
            } finally {
                btnImport.disabled = false;
            }
        };
        reader.readAsText(file);
    });
}