/**
 * AnimeStream Pro - Video Player
 * Embed URLs for various anime streaming servers
 */

// Server embed URL patterns
const SERVER_PATTERNS = {
    // These are example patterns - actual working URLs may vary
    vidrock: (malId, ep) => `https://vidrock.net/embed/${malId}/${ep}`,
    hianime: (malId, ep) => `https://hianime.to/watch/${malId}?ep=${ep}`,
    gogo: (malId, ep) => `https://gogoanime3.co/${malId}-episode-${ep}`,
    '9anime': (malId, ep) => `https://9anime.org.lv/watch/${malId}?ep=${ep}`,
    animeheaven: (malId, ep) => `https://animeheaven.me/watch/${malId}/${ep}`,
    custom: (url, malId, ep) => url.replace('{malId}', malId).replace('{ep}', ep)
};

// State
let currentMalId = null;
let currentEp = 1;
let totalEps = 1;
let currentServer = 'vidrock';
let animeData = null;
let customEmbedUrl = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentMalId = params.get('id');
    currentEp = parseInt(params.get('ep')) || 1;
    const type = params.get('type') || 'tv';
    
    if (!currentMalId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Load anime data
    loadWatchData(currentMalId, type);
});

async function loadWatchData(malId, type) {
    // Get anime info
    const response = await getAnimeById(malId);
    if (!response.data) return;
    
    animeData = formatAnimeData(response.data);
    totalEps = animeData.episodes || 1;
    
    // Check local storage for custom embed
    const library = JSON.parse(localStorage.getItem('animeLibrary') || '[]');
    const published = library.find(a => a.malId == malId);
    if (published) {
        customEmbedUrl = published.customEmbed || '';
        currentServer = published.server || 'vidrock';
    }
    
    // Update UI
    document.title = `${animeData.title} — Ep ${currentEp} — AnimeStream`;
    document.getElementById('watchNavInfo').innerHTML = `
        <span class="watch-nav-title">${animeData.title}</span>
        <span style="color:var(--text-muted);margin-left:8px;">— Ep ${currentEp}</span>
    `;
    document.getElementById('backToAnime').href = `anime.html?id=${malId}`;
    
    // Episode title
    document.getElementById('epTitle').textContent = 
        type === 'movie' ? 'Full Movie' : `Episode ${currentEp}`;
    
    // Update nav buttons
    updateNavButtons();
    
    // Load episode list
    loadEpisodeList(type);
    
    // Load video
    loadVideo();
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevEpBtn');
    const nextBtn = document.getElementById('nextEpBtn');
    
    prevBtn.disabled = currentEp <= 1;
    nextBtn.disabled = currentEp >= totalEps;
    
    document.getElementById('epCounter').textContent = `${currentEp} / ${totalEps}`;
}

function loadEpisodeList(type) {
    const container = document.getElementById('epListScroll');
    
    if (type === 'movie') {
        container.innerHTML = `
            <div class="ep-item active">
                <div class="ep-item-num"><i class="fas fa-film"></i></div>
                <div class="ep-item-title">Full Movie</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    for (let i = 1; i <= totalEps; i++) {
        html += `
            <div class="ep-item ${i === currentEp ? 'active' : ''}" onclick="goToEpisode(${i})">
                <div class="ep-item-num">${i}</div>
                <div class="ep-item-title">Episode ${i}</div>
            </div>
        `;
    }
    container.innerHTML = html;
    
    // Scroll to current episode
    setTimeout(() => {
        const active = container.querySelector('.ep-item.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function loadVideo() {
    const iframe = document.getElementById('videoPlayer');
    const loading = document.getElementById('playerLoading');
    const error = document.getElementById('playerError');
    
    loading.style.display = 'flex';
    error.style.display = 'none';
    
    let url;
    if (currentServer === 'custom' && customEmbedUrl) {
        url = SERVER_PATTERNS.custom(customEmbedUrl, currentMalId, currentEp);
    } else if (SERVER_PATTERNS[currentServer]) {
        url = SERVER_PATTERNS[currentServer](currentMalId, currentEp);
    } else {
        url = SERVER_PATTERNS.vidrock(currentMalId, currentEp);
    }
    
    iframe.src = url;
    
    // Hide loading after iframe loads
    iframe.onload = () => {
        loading.style.display = 'none';
    };
    
    iframe.onerror = () => {
        loading.style.display = 'none';
        error.style.display = 'flex';
    };
    
    // Fallback timeout
    setTimeout(() => {
        if (loading.style.display !== 'none') {
            loading.style.display = 'none';
        }
    }, 5000);
}

function switchServer(server) {
    currentServer = server;
    
    // Update active button
    document.querySelectorAll('.server-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.server === server);
    });
    
    loadVideo();
}

function goToEpisode(ep) {
    if (ep < 1 || ep > totalEps) return;
    currentEp = ep;
    
    const params = new URLSearchParams(window.location.search);
    params.set('ep', ep);
    window.history.replaceState({}, '', `watch.html?${params.toString()}`);
    
    document.getElementById('epTitle').textContent = `Episode ${ep}`;
    updateNavButtons();
    loadEpisodeList(animeData.type === 'Movie' ? 'movie' : 'tv');
    loadVideo();
}

function prevEpisode() {
    goToEpisode(currentEp - 1);
}

function nextEpisode() {
    goToEpisode(currentEp + 1);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentEp > 1) prevEpisode();
    if (e.key === 'ArrowRight' && currentEp < totalEps) nextEpisode();
});
