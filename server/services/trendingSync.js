const Anime = require('../models/Anime')

function mapStatus(jikanStatus) {
    if (!jikanStatus) return 'Ongoing'
    if (jikanStatus.toLowerCase().includes('finished')) return 'Completed'
    if (jikanStatus.toLowerCase().includes('currently')) return 'Ongoing'
    if (jikanStatus.toLowerCase().includes('not yet')) return 'Upcoming'
    return 'Ongoing'
}

function mapMediaType(jikanType) {
    const valid = ['TV', 'Movie', 'OVA', 'Special']
    if (valid.includes(jikanType)) return jikanType
    return 'TV'
}

async function syncTrendingAnime() {
    console.log('[TrendingSync] Starting daily trending anime update...')
    try {
        let fetchedList = []

        // 1. Fetch current top airing/trending anime from Jikan API
        try {
            const res = await fetch('https://api.jikan.moe/v4/top/anime?filter=airing&limit=20')
            if (res.ok) {
                const json = await res.json()
                if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                    fetchedList = json.data
                }
            }
        } catch (apiErr) {
            console.warn('[TrendingSync] Jikan API fetch warning:', apiErr.message)
        }

        // If Jikan fetch didn't return data, fallback to season/now API
        if (fetchedList.length === 0) {
            try {
                const res = await fetch('https://api.jikan.moe/v4/seasons/now?limit=20')
                if (res.ok) {
                    const json = await res.json()
                    if (json.data && Array.isArray(json.data)) {
                        fetchedList = json.data
                    }
                }
            } catch (err) {
                console.warn('[TrendingSync] Fallback Jikan fetch failed:', err.message)
            }
        }

        // 2. Process fetched trending anime if available
        if (fetchedList.length > 0) {
            // Clear current trending flags
            await Anime.updateMany({}, { isTrending: false, trendingRank: null })

            const trendingIds = []

            for (let i = 0; i < Math.min(15, fetchedList.length); i++) {
                const item = fetchedList[i]
                const rank = i + 1

                const genres = (item.genres || []).map(g => g.name)
                if (item.themes) genres.push(...item.themes.map(t => t.name))
                if (item.demographics) genres.push(...item.demographics.map(d => d.name))
                const uniqueGenres = [...new Set(genres)]

function getHDImage(item) {
    if (!item || !item.images) return ''
    let img = item.images.jpg?.large_image_url || item.images.jpg?.image_url || item.images.webp?.large_image_url || ''
    if (img && img.includes('cdn.myanimelist.net/images/anime/') && img.endsWith('.jpg') && !img.endsWith('l.jpg')) {
        img = img.replace(/\.jpg$/, 'l.jpg')
    }
    return img
}

                const studio = (item.studios || []).map(s => s.name).join(' / ') || 'Unknown Studio'
                const cover = getHDImage(item)
                const banner = cover
                const year = item.year || item.aired?.prop?.from?.year || new Date().getFullYear()

                let existing = await Anime.findOne({
                    $or: [
                        { malId: item.mal_id },
                        { title: item.title }
                    ]
                })

                if (existing) {
                    existing.isTrending = true
                    existing.trendingRank = rank
                    existing.rating = item.score || existing.rating || 8.0
                    existing.releaseStatus = mapStatus(item.status)
                    if (item.episodes) existing.episodes = item.episodes
                    if (cover) existing.cover = cover
                    if (banner) existing.banner = banner
                    await existing.save()
                    trendingIds.push(existing._id)
                } else {
                    const newAnime = await Anime.create({
                        title: item.title,
                        altTitle: item.title_english || item.title_japanese || '',
                        malId: item.mal_id,
                        genres: uniqueGenres.length > 0 ? uniqueGenres : ['Action', 'Fantasy'],
                        rating: item.score || 8.2,
                        episodes: item.episodes || 12,
                        releaseStatus: mapStatus(item.status),
                        year,
                        studio,
                        synopsis: item.synopsis || 'Latest trending anime series.',
                        cover,
                        banner,
                        mediaType: mapMediaType(item.type),
                        isTrending: true,
                        trendingRank: rank
                    })
                    trendingIds.push(newAnime._id)
                }
            }

            console.log(`[TrendingSync] Successfully updated ${trendingIds.length} trending anime!`)
            return { ok: true, count: trendingIds.length, source: 'Jikan API' }
        } else {
            // 3. Fallback: Internal recalculation based on top rated anime in DB
            console.log('[TrendingSync] Jikan API unavailable; recalculating top trending from database.')
            await Anime.updateMany({}, { isTrending: false, trendingRank: null })

            const topDbAnime = await Anime.find({}).sort({ rating: -1 }).limit(10)
            for (let i = 0; i < topDbAnime.length; i++) {
                topDbAnime[i].isTrending = true
                topDbAnime[i].trendingRank = i + 1
                await topDbAnime[i].save()
            }
            return { ok: true, count: topDbAnime.length, source: 'Database Fallback' }
        }
    } catch (err) {
        console.error('[TrendingSync] Error syncing trending anime:', err)
        return { ok: false, error: err.message }
    }
}

let syncTimer = null

function startDailyTrendingCron() {
    // Run immediately on boot
    syncTrendingAnime().catch(err => console.error('[TrendingSync] Initial boot sync error:', err))

    // Schedule every 24 hours (86,400,000 ms)
    if (!syncTimer) {
        syncTimer = setInterval(() => {
            console.log('[TrendingSync] Running daily scheduled trending update...')
            syncTrendingAnime()
        }, 24 * 60 * 60 * 1000)
    }
}

module.exports = {
    syncTrendingAnime,
    startDailyTrendingCron
}
