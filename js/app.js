/**
 * AnimeStream Pro - Main Application
 */

// Global state
let currentAnime = null;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initPage();
    initSearch();
});

function initPage() {
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/' || path === '') {
        loadHomepage();
    } else if (path.includes('anime.html')) {
        loadAnimeDetail();
    } else if (path.includes('search.html')) {
        loadSearchPage();
    }
}

// ==================== HOMEPAGE ====================
async function loadHomepage() {
    // Load hero anime (random top airing)
    const airing = await getTopAnime('airing', 5);
    if (airing.data && airing.data.length > 0) {
        const hero = airing.data[Math.floor(Math.random() * Math.min(5, airing.data.length))];
        setHeroAnime(hero);
    }
    
    // Load sections
    loadSection('trendingGrid', () => getTopAnime('bypopularity', 12));
    loadSection('airingGrid', () => getTopAnime('airing', 12));
    loadSection('moviesGrid', () => getTopAnime('movie', 12));
    loadSection('ratedGrid', () => getTopAnime('', 12));
}

function setHeroAnime(anime) {
    const data = formatAnimeData(anime);
    document.getElementById('heroBg').style.backgroundImage = `url(${data.image})`;
    document.getElementById('heroTitle').textContent = data.title;
    document.getElementById('heroDesc').textContent = data.synopsis;
    
    const meta = document.getElementById('heroMeta');
    meta.innerHTML = `
        <span class="score"><i class="fas fa-star"></i> ${data.score}</span>
        <span><i class="fas fa-tv"></i> ${data.type}</span>
        <span><i class="fas fa-list-ol"></i> ${data.episodes || '?'} eps</span>
        <span><i class="fas fa-calendar"></i> ${data.year || 'N/A'}</span>
        <span><i class="fas fa-clock"></i> ${data.duration}</span>
    `;
    
    document.getElementById('heroWatchBtn').href = `anime.html?id=${data.malId}`;
}

async function loadSection(gridId, fetchFn) {
    const grid = document.getElementById(gridId);
    try {
        const response = await fetchFn();
        if (response.data) {
            grid.innerHTML = response.data.map(anime => createAnimeCard(anime)).join('');
        }
    } catch (e) {
        grid.innerHTML = '<div class="loading-text">Failed to load content.</div>';
    }
}

// ==================== ANIME DETAIL ====================
async function loadAnimeDetail() {
    const params = new URLSearchParams(window.location.search);
    const malId = params.get('id');
    if (!malId) return;
    
    // Load anime details
    const response = await getAnimeById(malId);
    if (!response.data) return;
    
    const anime = formatAnimeData(response.data);
    currentAnime = anime;
    
    // Set page title
    document.title = `${anime.title} — AnimeStream Pro`;
    
    // Set hero
    document.getElementById('detailBg').style.backgroundImage = `url(${anime.image})`;
    document.getElementById('detailPoster').src = anime.image;
    document.getElementById('detailPoster').alt = anime.title;
    document.getElementById('detailScore').querySelector('span').textContent = anime.score;
    document.getElementById('detailTitle').textContent = anime.title;
    document.getElementById('detailSynopsis').textContent = anime.synopsis;
    
    // Badges
    const badges = document.getElementById('detailBadges');
    badges.innerHTML = `
        <span class="badge type">${anime.type}</span>
        <span class="badge status ${statusClass(anime.status)}">${anime.status}</span>
        ${anime.rating ? `<span class="badge">${anime.rating}</span>` : ''}
    `;
    
    // Meta
    const meta = document.getElementById('detailMeta');
    meta.innerHTML = `
        <span><i class="fas fa-star"></i> ${anime.score} (${formatNumber(anime.scoredBy)} users)</span>
        <span><i class="fas fa-ranking-star"></i> Rank #${anime.rank}</span>
        <span><i class="fas fa-fire"></i> Popularity #${anime.popularity}</span>
        <span><i class="fas fa-list-ol"></i> ${anime.episodes || '?'} Episodes</span>
        <span><i class="fas fa-clock"></i> ${anime.duration}</span>
        <span><i class="fas fa-calendar"></i> ${anime.aired}</span>
        <span><i class="fas fa-building"></i> ${anime.studios}</span>
    `;
    
    // Watch button
    const watchBtn = document.getElementById('watchFirstBtn');
    if (anime.type === 'Movie') {
        watchBtn.innerHTML = '<i class="fas fa-play"></i> Watch Movie';
        watchBtn.href = `watch.html?id=${malId}&ep=1&type=movie`;
    } else {
        watchBtn.href = `watch.html?id=${malId}&ep=1`;
    }
    
    // Update favorite button
    updateFavoriteBtn();
    
    // Load episodes
    loadEpisodes(malId, anime.episodes, anime.type);
    
    // Load characters
    loadCharacters(malId);
    
    // Load related
    loadRelated(malId);
}

function statusClass(status) {
    if (status.includes('Airing')) return 'airing';
    if (status.includes('Complete')) return 'completed';
    return '';
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

async function loadEpisodes(malId, totalEpisodes, type) {
    const grid = document.getElementById('episodeGrid');
    
    if (type === 'Movie') {
        grid.innerHTML = `
            <a href="watch.html?id=${malId}&ep=1&type=movie" class="episode-card">
                <div class="ep-number"><i class="fas fa-film"></i></div>
                <div class="ep-info">
                    <div class="ep-title">Watch Full Movie</div>
                    <div class="ep-meta">Movie</div>
                </div>
                <div class="ep-play"><i class="fas fa-play"></i></div>
            </a>
        `;
        return;
    }
    
    // Try to get episodes from Jikan
    const epResponse = await getAnimeEpisodes(malId);
    let episodes = [];
    
    if (epResponse.data && epResponse.data.length > 0) {
        episodes = epResponse.data;
    } else {
        // Generate generic episodes
        const count = totalEpisodes || 12;
        for (let i = 1; i <= count; i++) {
            episodes.push({ mal_id: i, episode: i, title: `Episode ${i}`, aired: '' });
        }
    }
    
    grid.innerHTML = episodes.map(ep => `
        <a href="watch.html?id=${malId}&ep=${ep.mal_id || ep.episode}" class="episode-card">
            <div class="ep-number">${ep.mal_id || ep.episode}</div>
            <div class="ep-info">
                <div class="ep-title">${ep.title || `Episode ${ep.mal_id || ep.episode}`}</div>
                <div class="ep-meta">${ep.aired || ''}</div>
            </div>
            <div class="ep-play"><i class="fas fa-play"></i></div>
        </a>
    `).join('');
}

function setEpisodeView(view) {
    const grid = document.getElementById('episodeGrid');
    const buttons = document.querySelectorAll('.btn-ep-toggle');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.btn-ep-toggle').classList.add('active');
    
    if (view === 'list') {
        grid.classList.add('list-view');
    } else {
        grid.classList.remove('list-view');
    }
}

async function loadCharacters(malId) {
    const grid = document.getElementById('characterGrid');
    const response = await getAnimeCharacters(malId);
    
    if (!response.data || response.data.length === 0) {
        grid.innerHTML = '<div class="loading-text">No characters found.</div>';
        return;
    }
    
    const characters = response.data.slice(0, 12);
    grid.innerHTML = characters.map(char => `
        <div class="character-card">
            <img src="${char.character.images?.jpg?.image_url || ''}" alt="${char.character.name}" loading="lazy">
            <div class="char-name">${char.character.name}</div>
            <div class="char-role">${char.role}</div>
        </div>
    `).join('');
}

async function loadRelated(malId) {
    const grid = document.getElementById('relatedGrid');
    // Use recommendations as related
    const response = await getAnimeRecommendations(malId);
    
    if (!response.data || response.data.length === 0) {
        grid.innerHTML = '<div class="loading-text">No recommendations found.</div>';
        return;
    }
    
    const related = response.data.slice(0, 6);
    grid.innerHTML = related.map(rec => createAnimeCard(rec.entry)).join('');
}

// ==================== FAVORITES ====================
function toggleFavorite() {
    if (!currentAnime) return;
    
    const index = favorites.findIndex(f => f.malId === currentAnime.malId);
    if (index === -1) {
        favorites.push({ malId: currentAnime.malId, title: currentAnime.title, image: currentAnime.image });
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoriteBtn();
}

function updateFavoriteBtn() {
    if (!currentAnime) return;
    const isFav = favorites.some(f => f.malId === currentAnime.malId);
    const icon = document.getElementById('favIcon');
    const text = document.getElementById('favText');
    
    if (isFav) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = '#ec4899';
        text.textContent = 'In Favorites';
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '';
        text.textContent = 'Add to Favorites';
    }
}

function addToList() {
    if (!currentAnime) return;
    alert('Added to your list! (Demo feature)');
}

// ==================== SEARCH ====================
function initSearch() {
    const searchInput = document.getElementById('navSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            document.getElementById('searchDropdown').classList.remove('active');
            return;
        }
        
        const response = await searchAnimeJikan(query, { limit: 6 });
        const dropdown = document.getElementById('searchDropdown');
        
        if (response.data && response.data.length > 0) {
            dropdown.innerHTML = response.data.map(anime => {
                const data = formatAnimeData(anime);
                return `
                    <a href="anime.html?id=${data.malId}" class="search-dropdown-item">
                        <img src="${data.image}" alt="${data.title}">
                        <div class="sdd-info">
                            <div class="sdd-title">${data.title}</div>
                            <div class="sdd-meta">${data.type} • ${data.year || 'N/A'} • ${data.score ? data.score + '★' : 'N/A'}</div>
                        </div>
                    </a>
                `;
            }).join('');
            dropdown.classList.add('active');
        } else {
            dropdown.innerHTML = '<div class="search-dropdown-item"><div class="sdd-info"><div class="sdd-title">No results found</div></div></div>';
            dropdown.classList.add('active');
        }
    }, 400));
    
    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            document.getElementById('searchDropdown')?.classList.remove('active');
        }
    });
}

function searchAnime() {
    const query = document.getElementById('navSearch').value.trim();
    if (query) {
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
}

// ==================== SEARCH PAGE ====================
async function loadSearchPage() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const type = params.get('type') || '';
    const status = params.get('status') || '';
    const genre = params.get('genre') || '';
    const sort = params.get('sort') || 'popularity';
    const page = parseInt(params.get('page')) || 1;
    
    // Set filter values
    if (type) document.getElementById('filterType').value = type;
    if (status) document.getElementById('filterStatus').value = status;
    if (genre) document.getElementById('filterGenre').value = genre;
    if (sort) document.getElementById('filterSort').value = sort;
    if (query) document.getElementById('bigSearch').value = query;
    
    // Build API params
    const apiParams = { page, limit: 24 };
    if (query) apiParams.q = query;
    if (type) apiParams.type = type;
    if (status) apiParams.status = status;
    if (genre) apiParams.genres = genre;
    
    // Sort mapping
    const sortMap = {
        popularity: 'members',
        score: 'score',
        members: 'members',
        start_date: 'start_date'
    };
    if (sortMap[sort]) apiParams.order_by = sortMap[sort];
    apiParams.sort = sort === 'start_date' ? 'desc' : 'desc';
    
    let response;
    if (query) {
        response = await searchAnimeJikan(query, apiParams);
    } else if (genre) {
        response = await getAnimeByGenre(genre, page, 24);
    } else if (type === 'movie') {
        response = await jikanRequest(`/anime?type=movie&page=${page}&limit=24`);
    } else if (status === 'airing') {
        response = await getTopAnime('airing', 24, page);
    } else {
        response = await getTopAnime('', 24, page);
    }
    
    const grid = document.getElementById('searchResults');
    const countEl = document.getElementById('resultsCount');
    
    if (response.data && response.data.length > 0) {
        grid.innerHTML = response.data.map(anime => createAnimeCard(anime)).join('');
        const total = response.pagination?.items?.total || response.data.length;
        countEl.textContent = `Showing ${response.data.length} of ${total} results`;
        
        // Pagination
        renderPagination(response.pagination, page);
    } else {
        grid.innerHTML = '<div class="loading-text">No results found.</div>';
        countEl.textContent = '0 results';
    }
}

function renderPagination(pagination, currentPage) {
    const container = document.getElementById('pagination');
    if (!pagination || !pagination.last_visible_page) {
        container.innerHTML = '';
        return;
    }
    
    const totalPages = Math.min(pagination.last_visible_page, 20);
    let html = '';
    
    // Prev
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    
    // Pages
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    // Next
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    
    container.innerHTML = html;
}

function goToPage(page) {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    window.location.search = params.toString();
}

function performSearch() {
    const query = document.getElementById('bigSearch').value.trim();
    if (query) {
        const params = new URLSearchParams(window.location.search);
        params.set('q', query);
        params.delete('page');
        window.location.search = params.toString();
    }
}

function applyFilters() {
    const params = new URLSearchParams();
    
    const query = document.getElementById('bigSearch').value.trim();
    if (query) params.set('q', query);
    
    const type = document.getElementById('filterType').value;
    if (type) params.set('type', type);
    
    const status = document.getElementById('filterStatus').value;
    if (status) params.set('status', status);
    
    const genre = document.getElementById('filterGenre').value;
    if (genre) params.set('genre', genre);
    
    const sort = document.getElementById('filterSort').value;
    if (sort) params.set('sort', sort);
    
    window.location.href = 'search.html?' + params.toString();
}

// ==================== MOBILE MENU ====================
function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}
