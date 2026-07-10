import { fetchMoviesHistory, updateMovieWatchedDate } from '../traktApi.js';

export function renderMoviesUi() {
    document.getElementById('movies-container').innerHTML = `
        <div id="history-section" class="card hidden">
            <h3>Historique des visionnages (<span id="movie-count">0</span>)</h3>
            <button id="btn-refresh">Charger l'historique</button>
            <span id="global-action-status" style="margin-left: 15px; font-weight: bold;"></span>
            <table>
                <thead>
                    <tr>
                        <th>ID Trakt</th>
                        <th>ID IMDb</th>
                        <th>ID TMDb</th>
                        <th>Titre</th>
                        <th>Date de visionnage</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="history-body">
                    <tr><td colspan="6" class="loading-stub">Cliquez sur Charger pour récupérer vos données.</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

export function toggleMoviesVisibility(isConnected) {
    const section = document.getElementById('history-section');
    if (isConnected) section.classList.remove('hidden');
    else section.classList.add('hidden');
}

async function loadHistory() {
    const historyBody = document.getElementById('history-body');
    const movieCountEl = document.getElementById('movie-count');
    const globalStatusEl = document.getElementById('global-action-status');

    historyBody.innerHTML = `<tr><td colspan="6" class="loading-stub">Chargement des films...</td></tr>`;
    globalStatusEl.innerText = "";
    
    try {
        const history = await fetchMoviesHistory();
        movieCountEl.innerText = history.length;
        if (history.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="6" class="loading-stub">Aucun film trouvé.</td></tr>`;
            return;
        }

        historyBody.innerHTML = "";
        history.forEach(item => {
            const rawDate = item.watched_at ? item.watched_at.split('T')[0] : "";
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${item.movie.ids.trakt}</code></td>
                <td><code>${item.movie.ids.imdb || 'N/A'}</code></td>
                <td><code>${item.movie.ids.tmdb || 'N/A'}</code></td>
                <td><strong>${item.movie.title}</strong> <span style="color:#6b7280">(${item.movie.year})</span></td>
                <td><input type="date" value="${rawDate}" id="date-${item.id}"></td>
                <td><button class="action-btn" id="btn-${item.id}">Mettre à jour</button></td>
            `;
            historyBody.appendChild(tr);

            document.getElementById(`btn-${item.id}`).addEventListener('click', async (e) => {
                const newDate = document.getElementById(`date-${item.id}`).value;
                if (!newDate) return alert("Date invalide.");
                
                e.target.disabled = true;
                e.target.innerText = "En cours...";
                globalStatusEl.style.color = "#2563eb";
                globalStatusEl.innerText = `Modification de "${item.movie.title}"...`;

                try {
                    await updateMovieWatchedDate(item.id, item.movie.ids, newDate);
                    globalStatusEl.style.color = "#16a34a";
                    globalStatusEl.innerText = `✅ "${item.movie.title}" mis à jour !`;
                    setTimeout(loadHistory, 1500);
                } catch (err) {
                    globalStatusEl.style.color = "#dc2626";
                    globalStatusEl.innerText = `❌ Erreur : ${err.message}`;
                    e.target.disabled = false;
                    e.target.innerText = "Mettre à jour";
                }
            });
        });
    } catch (err) {
        historyBody.innerHTML = `<tr><td colspan="6" style="color:#dc2626">Erreur : ${err.message}</td></tr>`;
    }
}

export function setupMoviesListeners() {
    document.getElementById('btn-refresh').addEventListener('click', loadHistory);
}