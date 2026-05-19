/**
 * Jikan API v4 Integration
 * Base URL: https://api.jikan.moe/v4
 * Rate Limit: 3 requests/second
 */

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Rate limiter
let lastRequest = 0;
const MIN_DELAY = 350; // ms between requests

async function jikanRequest(endpoint) {
    const now = Date.now();
    const wait = Math.max(0, MIN_DELAY - (now - lastRequest));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequest = Date.now();
    
    try {
        const response = await fetch(`${JIKAN_BASE}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Jikan API Error:', error);
        return { data: null, error: error.message };
    }
}

// Get anime by ID
async function getAnimeById(malId) {
    return await jikanRequest(`/anime/${malId}/full`);
}

// Get anime characters
async function getAnimeCharacters(malId) {
    return await jikanRequest(`/anime/${malId}/characters`);
}

// Get anime episodes
async function getAnimeEpisodes(malId, page = 1) {
    return await jikanRequest(`/anime/${malId}/episodes?page=${page}`);
}

// Search anime
async function searchAnimeJikan(query, params = {}) {
    const queryParams = new URLSearchParams({ q: query, limit: 25, ...params });
    return await jikanRequest(`/anime?${queryParams}`);
}

// Get top anime
async function getTopAnime(filter = '', limit = 25, page = 1) {
    const endpoint = filter 
        ? `/top/anime?filter=${filter}&limit=${limit}&page=${page}`
        : `/top/anime?limit=${limit}&page=${page}`;
    return await jikanRequest(endpoint);
}

// Get seasonal anime
async function getSeasonalAnime(year, season, limit = 25) {
    return await jikanRequest(`/seasons/${year}/${season}?limit=${limit}`);
}

// Get current season
async function getCurrentSeason(limit = 25) {
    return await jikanRequest(`/seasons/now?limit=${limit}`);
}

// Get anime by genre
async function getAnimeByGenre(genreId, page = 1, limit = 25) {
    return await jikanRequest(`/anime?genres=${genreId}&page=${page}&limit=${limit}`);
}

// Get anime recommendations
async function getAnimeRecommendations(malId) {
    return await jikanRequest(`/anime/${malId}/recommendations`);
}

// Get random anime
async function getRandomAnime() {
    return await jikanRequest('/random/anime');
}

// Helper: Format anime data for display
function formatAnimeData(anime) {
    return {
        malId: anime.mal_id,
        title: anime.title || anime.title_english || anime.title_japanese,
        titleJapanese: anime.title_japanese,
        image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        synopsis: anime.synopsis || 'No synopsis available.',
        score: anime.score || 0,
        scoredBy: anime.scored_by || 0,
        rank: anime.rank || 0,
        popularity: anime.popularity || 0,
        members: anime.members || 0,
        status: anime.status || 'Unknown',
        type: anime.type || 'Unknown',
        episodes: anime.episodes || 0,
        duration: anime.duration || 'Unknown',
        rating: anime.rating || 'Unknown',
        aired: anime.aired?.string || 'Unknown',
        season: anime.season || '',
        year: anime.year || '',
        studios: anime.studios?.map(s => s.name).join(', ') || 'Unknown',
        genres: anime.genres?.map(g => g.name) || [],
        themes: anime.themes?.map(t => t.name) || [],
        trailer: anime.trailer?.embed_url || '',
        url: anime.url
    };
}

// Helper: Create anime card HTML
function createAnimeCard(anime) {
    const data = formatAnimeData(anime);
    const typeClass = data.type.toLowerCase();
    const statusClass = data.status.toLowerCase().includes('airing') ? 'airing' : 
                       data.status.toLowerCase().includes('complete') ? 'completed' : '';
    
    return `
        <a href="anime.html?id=${data.malId}" class="anime-card" data-mal-id="${data.malId}">
            <div class="card-image">
                <img src="${data.image}" alt="${data.title}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-play"><i class="fas fa-play"></i></div>
                </div>
                <span class="card-badge ${typeClass}">${data.type}</span>
                ${data.score > 0 ? `<span class="card-score"><i class="fas fa-star"></i> ${data.score}</span>` : ''}
            </div>
            <div class="card-info">
                <div class="card-title">${data.title}</div>
                <div class="card-meta">
                    <span>${data.episodes ? data.episodes + ' eps' : '?'}</span>
                    <span>${data.year || 'N/A'}</span>
                </div>
            </div>
        </a>
    `;
}

// Helper: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
