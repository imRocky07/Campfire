const Anime = require('../models/Anime')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

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

function getHDImage(item) {
    const DEFAULT_COVER = 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'
    if (!item) return DEFAULT_COVER
    let img = item.coverImage?.extraLarge || item.coverImage?.large || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || ''
    if (img && img.includes('cdn.myanimelist.net/images/anime/') && img.endsWith('.jpg') && !img.endsWith('l.jpg')) {
        img = img.replace(/\.jpg$/, 'l.jpg')
    }
    return img || DEFAULT_COVER
}

const DEFAULT_COVER = 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'

async function updateRankings() {
    try {
        console.log('[RankingUpdater] Starting dynamic ranking update via AniList GraphQL...')

        const gqlQuery = `
        query {
          trending: Page(page: 1, perPage: 20) {
            media(sort: TRENDING_DESC, type: ANIME) {
              id
              idMal
              title { romaji english native }
              genres
              averageScore
              episodes
              status
              seasonYear
              studios(isMain: true) { nodes { name } }
              description
              coverImage { extraLarge large }
              bannerImage
              format
            }
          }
          popular: Page(page: 1, perPage: 30) {
            media(sort: POPULARITY_DESC, type: ANIME) {
              id
              idMal
              title { romaji english native }
              genres
              averageScore
              episodes
              status
              seasonYear
              studios(isMain: true) { nodes { name } }
              description
              coverImage { extraLarge large }
              bannerImage
              format
            }
          }
        }`

        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: gqlQuery })
        })

        if (!res.ok) {
            console.warn(`[RankingUpdater] AniList fetch returned status ${res.status}, skipping update.`)
            return { ok: false }
        }

        const json = await res.json()
        const trendingList = json.data?.trending?.media || []
        const popularList  = json.data?.popular?.media  || []

        console.log(`[RankingUpdater] AniList returned ${trendingList.length} trending items and ${popularList.length} popular items.`)

        await Anime.updateMany({}, { isTrending: false, isPopular: false, trendingRank: null, popularityRank: null })

        let updated = 0
        let created = 0

        for (let i = 0; i < trendingList.length; i++) {
            const item = trendingList[i]
            const title = (item.title.english || item.title.romaji || item.title.native || '').trim()
            if (!title) continue

            const altTitle = (item.title.romaji && item.title.romaji !== title) ? item.title.romaji : (item.title.native || '')
            const cover = item.coverImage?.extraLarge || item.coverImage?.large || DEFAULT_COVER
            const banner = item.bannerImage || cover
            const studio = item.studios?.nodes?.[0]?.name || 'Unknown'
            const rating = item.averageScore ? parseFloat((item.averageScore / 10).toFixed(2)) : 8.0

            const queryCond = [{ title: new RegExp('^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }]
            if (item.idMal) queryCond.push({ malId: item.idMal })

            let existing = await Anime.findOne({ $or: queryCond })

            if (existing) {
                existing.isTrending = true
                existing.trendingRank = i + 1
                if (!existing.cover || existing.cover.trim() === '') existing.cover = cover
                if (!existing.banner || existing.banner.trim() === '') existing.banner = banner
                await existing.save()
                updated++
            } else {
                const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, '').trim()
                await Anime.create({
                    title,
                    altTitle,
                    malId: item.idMal || null,
                    genres: item.genres || ['Action', 'Fantasy'],
                    rating,
                    episodes: item.episodes || 12,
                    releaseStatus: mapStatus(item.status),
                    year: item.seasonYear || null,
                    studio,
                    synopsis: cleanDesc || 'Trending anime series.',
                    cover,
                    banner,
                    mediaType: mapMediaType(item.format),
                    isTrending: true,
                    trendingRank: i + 1
                })
                created++
            }
        }

        for (let i = 0; i < popularList.length; i++) {
            const item = popularList[i]
            const title = (item.title.english || item.title.romaji || item.title.native || '').trim()
            if (!title) continue

            const altTitle = (item.title.romaji && item.title.romaji !== title) ? item.title.romaji : (item.title.native || '')
            const cover = item.coverImage?.extraLarge || item.coverImage?.large || DEFAULT_COVER
            const banner = item.bannerImage || cover
            const studio = item.studios?.nodes?.[0]?.name || 'Unknown'
            const rating = item.averageScore ? parseFloat((item.averageScore / 10).toFixed(2)) : 8.0

            const queryCond = [{ title: new RegExp('^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }]
            if (item.idMal) queryCond.push({ malId: item.idMal })

            let existing = await Anime.findOne({ $or: queryCond })

            if (existing) {
                existing.isPopular = true
                existing.popularityRank = i + 1
                if (!existing.cover || existing.cover.trim() === '') existing.cover = cover
                if (!existing.banner || existing.banner.trim() === '') existing.banner = banner
                await existing.save()
                updated++
            } else {
                const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, '').trim()
                await Anime.create({
                    title,
                    altTitle,
                    malId: item.idMal || null,
                    genres: item.genres || ['Action', 'Fantasy'],
                    rating,
                    episodes: item.episodes || 12,
                    releaseStatus: mapStatus(item.status),
                    year: item.seasonYear || null,
                    studio,
                    synopsis: cleanDesc || 'Popular anime series.',
                    cover,
                    banner,
                    mediaType: mapMediaType(item.format),
                    isPopular: true,
                    popularityRank: i + 1
                })
                created++
            }
        }

        console.log(`[RankingUpdater] Ranking update complete! Updated: ${updated}, Created: ${created}`)
        return { ok: true, updated, created }

    } catch (err) {
        console.error('[RankingUpdater] Error during ranking update:', err.message)
        return { ok: false, error: err.message }
    }
}

function startRankingScheduler() {
    // Run update once on startup (with a 5 second delay to let server initialize fully)
    setTimeout(() => {
        updateRankings()
    }, 5000)

    // Then schedule to run every 24 hours
    const intervalTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    setInterval(() => {
        updateRankings()
    }, intervalTime)
    
    console.log('[RankingUpdater] Background scheduler started (running every 24 hours).')
}

module.exports = {
    updateRankings,
    startRankingScheduler
}
