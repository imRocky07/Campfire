const RAWG_BASE = 'https://api.rawg.io/api'

function getRawgApiKey() {
    return process.env.RAWG_API_KEY || ''
}

/**
 * Normalizes raw RAWG API game object into Campfire Game schema structure
 */
function formatRawgGame(rawg) {
    if (!rawg) return null

    // Platforms mapping
    const rawPlatforms = (rawg.platforms || [])
        .map(p => p.platform ? p.platform.name : '')
        .filter(Boolean)
    
    const platforms = rawPlatforms.map(p => {
        if (p.includes('PlayStation 5') || p.includes('PS5')) return 'PS5'
        if (p.includes('PlayStation 4') || p.includes('PS4')) return 'PS4'
        if (p.includes('Xbox Series') || p.includes('Xbox One') || p.includes('Xbox')) return 'Xbox'
        if (p.includes('Nintendo Switch') || p.includes('Switch')) return 'Switch'
        if (p.includes('PC')) return 'PC'
        return p
    })

    const uniquePlatforms = Array.from(new Set(platforms))
    if (uniquePlatforms.length === 0) uniquePlatforms.push('PC')

    // Genres mapping
    const genres = (rawg.genres || []).map(g => g.name)
    if (genres.length === 0) genres.push('Action')

    // Rating mapping: RAWG is out of 5, scale to out of 10
    let rating = 8.5
    if (rawg.rating && rawg.rating > 0) {
        rating = parseFloat((rawg.rating * 2).toFixed(1))
    } else if (rawg.metacritic) {
        rating = parseFloat((rawg.metacritic / 10).toFixed(1))
    }

    // Release year
    let releaseYear = 2023
    if (rawg.released) {
        releaseYear = parseInt(rawg.released.split('-')[0]) || 2023
    }

    // Developer / Publisher
    let developer = 'RAWG Database'
    if (rawg.developers && rawg.developers.length > 0) {
        developer = rawg.developers.map(d => d.name).join(', ')
    } else if (rawg.publishers && rawg.publishers.length > 0) {
        developer = rawg.publishers.map(p => p.name).join(', ')
    }

    const cover = rawg.background_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80'
    const banner = rawg.background_image_additional || rawg.background_image || cover

    return {
        _id: `rawg-${rawg.id}`,
        rawgId: rawg.id,
        title: rawg.name,
        altTitle: rawg.slug || '',
        genres,
        platforms: uniquePlatforms,
        rating,
        releaseYear,
        developer,
        publisher: rawg.publishers ? rawg.publishers.map(p => p.name).join(', ') : developer,
        synopsis: rawg.description_raw || rawg.description || rawg.slug || 'Discover and track this title on Campfire Gaming.',
        cover,
        banner,
        isPopular: rawg.rating >= 4.0 || (rawg.added && rawg.added > 1000),
        isTrending: true
    }
}

/**
 * Fetch game list from RAWG API
 */
async function fetchRawgGames({ search, genre, platform, ordering = '-rating', pageSize = 24 } = {}) {
    const key = getRawgApiKey()
    if (!key) return null

    try {
        let url = `${RAWG_BASE}/games?key=${key}&page_size=${pageSize}&ordering=${ordering}`
        if (search) url += `&search=${encodeURIComponent(search)}`
        if (genre && genre !== 'All') url += `&genres=${encodeURIComponent(genre.toLowerCase())}`
        if (platform && platform !== 'All') url += `&platforms=${encodeURIComponent(platform)}`

        const res = await fetch(url)
        const data = await res.json()

        if (data && Array.isArray(data.results) && data.results.length > 0) {
            return data.results.map(formatRawgGame).filter(Boolean)
        }
        return null
    } catch (err) {
        console.error('fetchRawgGames network error:', err.message)
        return null
    }
}

/**
 * Fetch single game details from RAWG API
 */
async function fetchRawgGameDetails(id) {
    const key = getRawgApiKey()
    if (!key) return null

    try {
        const rawgId = id.toString().replace('rawg-', '')
        const url = `${RAWG_BASE}/games/${rawgId}?key=${key}`
        const res = await fetch(url)
        const data = await res.json()
        if (data && data.id) {
            return formatRawgGame(data)
        }
        return null
    } catch (err) {
        console.error('fetchRawgGameDetails error:', err.message)
        return null
    }
}

module.exports = {
    getRawgApiKey,
    formatRawgGame,
    fetchRawgGames,
    fetchRawgGameDetails
}
