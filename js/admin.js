/**
 * AnimeStream Pro - Admin Panel
 * Publish and manage anime content
 */

// Local storage key
const LIBRARY_KEY = 'animeLibrary';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
});

// ==================== TABS ====================
function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    
    event.target.closest('.admin-tab').classList.add('active');
    document.getElementById(`${tab}Panel`).classList.add('active');
    
    if (tab === 'manage') loadLibrary();
}

// ==================== SEARCH MAL ====================
async function searchMAL() {
    const query = document.getElementById('malSearchInput').value.trim();
    if (!query) return;
    
    const container = document.getElementById('malResults');
    container.innerHTML = '<div class="loading-text">Searching MAL database...</div>';
    
    const response = await searchAnimeJikan(query, { limit: 10 });
    
    if (!response.data || response.data.length === 0) {
        container.innerHTML = '<div class="loading-text">No results found.</div>';
        return;
    }
    
    container.innerHTML = response.data.map(anime => {
        const data = formatAnimeData(anime);
        return `
            <div class="mal-result-item" onclick="selectAnime(${data.malId})">
                <img src="${data.image}" alt="${data.title}">
                <div class="mal-info">
                    <div class="mal-title">${data.title}</div>
                    <div class="mal-meta">${data.type} • ${data.year || 'N/A'} • ${data.episodes || '?'} eps</div>
                    <div class="mal-synopsis">${data.synopsis}</div>
                </div>
                <button class="mal-select-btn" onclick="event.stopPropagation(); selectAnime(${data.malId})">
                    Select
                </button>
            </div>
        `;
    }).join('');
}

async function selectAnime(malId) {
    const response = await getAnimeById(malId);
    if (!response.data) return;
    
    const anime = formatAnimeData(response.data);
    
    // Fill form
    document.getElementById('pubMalId').value = anime.malId;
    document.getElementById('pubTitle').value = anime.title;
    document.getElementById('pubType').value = anime.type.toLowerCase();
    document.getElementById('pubEpisodes').value = anime.episodes || 1;
    document.getElementById('pubSynopsis').value = anime.synopsis;
    document.getElementById('pubPoster').value = anime.image;
    
    // Show form
    document.getElementById('publishFormCard').style.display = 'block';
    document.getElementById('publishFormCard').scrollIntoView({ behavior: 'smooth' });
}

// ==================== PUBLISH ====================
function publishAnime(event) {
    event.preventDefault();
    
    const anime = {
        malId: parseInt(document.getElementById('pubMalId').value),
        title: document.getElementById('pubTitle').value,
        type: document.getElementById('pubType').value,
        episodes: parseInt(document.getElementById('pubEpisodes').value),
        synopsis: document.getElementById('pubSynopsis').value,
        poster: document.getElementById('pubPoster').value,
        server: document.getElementById('pubServer').value,
        customEmbed: document.getElementById('pubCustomEmbed').value,
        publishedAt: new Date().toISOString()
    };
    
    // Save to library
    let library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    
    // Check if already exists
    const existingIndex = library.findIndex(a => a.malId === anime.malId);
    if (existingIndex !== -1) {
        library[existingIndex] = anime;
    } else {
        library.push(anime);
    }
    
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    
    alert(`✅ "${anime.title}" published successfully!`);
    resetForm();
    switchTab('manage');
}

function resetForm() {
    document.getElementById('publishForm').reset();
    document.getElementById('publishFormCard').style.display = 'none';
    document.getElementById('malResults').innerHTML = '';
    document.getElementById('malSearchInput').value = '';
}

// ==================== MANAGE LIBRARY ====================
function loadLibrary() {
    const library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    const tbody = document.getElementById('libraryBody');
    
    if (library.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">No anime published yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = library.map(anime => `
        <tr>
            <td>${anime.malId}</td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${anime.poster}" style="width:30px;height:42px;object-fit:cover;border-radius:4px;">
                    <span style="font-weight:600;">${anime.title}</span>
                </div>
            </td>
            <td><span class="badge" style="padding:4px 10px;background:var(--bg-tertiary);border-radius:4px;font-size:0.8rem;text-transform:uppercase;">${anime.type}</span></td>
            <td>${anime.episodes}</td>
            <td>${anime.server}</td>
            <td>
                <div class="action-btns">
                    <button class="edit" onclick="editAnime(${anime.malId})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteAnime(${anime.malId})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function deleteAnime(malId) {
    if (!confirm('Are you sure you want to delete this anime?')) return;
    
    let library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    library = library.filter(a => a.malId !== malId);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    
    loadLibrary();
}

function editAnime(malId) {
    const library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    const anime = library.find(a => a.malId === malId);
    if (!anime) return;
    
    switchTab('publish');
    
    document.getElementById('pubMalId').value = anime.malId;
    document.getElementById('pubTitle').value = anime.title;
    document.getElementById('pubType').value = anime.type;
    document.getElementById('pubEpisodes').value = anime.episodes;
    document.getElementById('pubSynopsis').value = anime.synopsis;
    document.getElementById('pubPoster').value = anime.poster;
    document.getElementById('pubServer').value = anime.server;
    document.getElementById('pubCustomEmbed').value = anime.customEmbed || '';
    
    document.getElementById('publishFormCard').style.display = 'block';
}

// ==================== BULK IMPORT ====================
async function bulkImport() {
    const input = document.getElementById('bulkIds').value.trim();
    if (!input) return;
    
    const ids = input.split(/[\n,]+/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) {
        alert('Please enter valid MAL IDs.');
        return;
    }
    
    const progress = document.getElementById('bulkProgress');
    progress.classList.add('active');
    
    let library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const percent = Math.round(((i + 1) / ids.length) * 100);
        
        progress.innerHTML = `
            <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
            <div class="progress-text">Processing ${i + 1}/${ids.length}: MAL ID ${id}...</div>
        `;
        
        // Check if already in library
        if (library.some(a => a.malId === id)) {
            success++;
            continue;
        }
        
        const response = await getAnimeById(id);
        if (response.data) {
            const anime = formatAnimeData(response.data);
            library.push({
                malId: anime.malId,
                title: anime.title,
                type: anime.type.toLowerCase(),
                episodes: anime.episodes || 1,
                synopsis: anime.synopsis,
                poster: anime.image,
                server: 'vidrock',
                customEmbed: '',
                publishedAt: new Date().toISOString()
            });
            success++;
        } else {
            failed++;
        }
        
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 400));
    }
    
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    
    progress.innerHTML = `
        <div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>
        <div class="progress-text">✅ Complete! ${success} imported, ${failed} failed.</div>
    `;
    
    setTimeout(() => {
        switchTab('manage');
    }, 2000);
}
