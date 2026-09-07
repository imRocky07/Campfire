const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Anime = require('../models/Anime')
const { requireLogin, adminOnly } = require('../middleware/auth')
const { getPersonalizedRecommendations } = require('../services/recommendationEngine')

const router = express.Router()

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
    if (!item || !item.images) return ''
    let img = item.images.jpg?.large_image_url || item.images.jpg?.image_url || item.images.webp?.large_image_url || ''
    if (img && img.includes('cdn.myanimelist.net/images/anime/') && img.endsWith('.jpg') && !img.endsWith('l.jpg')) {
        img = img.replace(/\.jpg$/, 'l.jpg')
    }
    return img
}

// GET /api/anime/recommendations
// Returns personalized AI recommendations based on user watchlist history & collaborative filtering
router.get('/recommendations', async (req, res) => {
    try {
        let userId = null
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                userId = decoded.id
            } catch (e) {
                // Invalid token; proceed as guest
            }
        }

        const limit = parseInt(req.query.limit) || 12
        const recommendations = await getPersonalizedRecommendations(userId, limit)

        res.json({ ok: true, data: recommendations })
    } catch (err) {
        console.error('[AnimeRoute] Error getting recommendations:', err)
        res.status(500).json({ ok: false, msg: 'failed to fetch recommendations' })
    }
})

// Queries AniList GraphQL (with Jikan API fallback) and permanently saves new anime to MongoDB
async function searchExternalAndPersist(searchQuery) {
    if (!searchQuery || !searchQuery.trim()) return []
    const cleanSearch = searchQuery.trim()
    const results = []

    // 1. Primary: AniList GraphQL API (ultra fast, high uptime, crisp posters)
    try {
        const gqlQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 12) {
            media(search: $search, type: ANIME) {
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
            body: JSON.stringify({ query: gqlQuery, variables: { search: cleanSearch } })
        })

        if (res.ok) {
            const json = await res.json()
            const mediaList = json.data?.Page?.media || []

            for (const item of mediaList) {
                const mainTitle = (item.title.english || item.title.romaji || item.title.native || '').trim()
                if (!mainTitle) continue

                const altTitle = (item.title.romaji && item.title.romaji !== mainTitle) ? item.title.romaji : (item.title.native || '')

                const queryCond = [{ title: new RegExp('^' + mainTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }]
                if (item.idMal) queryCond.push({ malId: item.idMal })

                let existing = await Anime.findOne({ $or: queryCond })

                if (!existing) {
                    const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, '').trim()
                    const studioName = item.studios?.nodes?.[0]?.name || 'Unknown'
                    const coverUrl = item.coverImage?.extraLarge || item.coverImage?.large || ''
                    const bannerUrl = item.bannerImage || coverUrl
                    const score = item.averageScore ? parseFloat((item.averageScore / 10).toFixed(2)) : 7.0

                    existing = await Anime.create({
                        title: mainTitle,
                        altTitle,
                        malId: item.idMal || null,
                        genres: item.genres || ['Anime'],
                        rating: score,
                        episodes: item.episodes || 12,
                        releaseStatus: mapStatus(item.status),
                        year: item.seasonYear || null,
                        studio: studioName,
                        synopsis: cleanDesc || 'No synopsis available.',
                        cover: coverUrl,
                        banner: bannerUrl,
                        mediaType: mapMediaType(item.format)
                    })
                }
                results.push(existing)
            }

            if (results.length > 0) return results
        }
    } catch (err) {
        console.error('[AniList Search] Error:', err.message)
    }

    // 2. Secondary Fallback: Jikan API v4 (if AniList is unreachable or returns zero results)
    try {
        const jikanRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanSearch)}&limit=12`)
        if (jikanRes.ok) {
            const json = await jikanRes.json()
            const externalList = json.data || []

            for (const item of externalList) {
                if (!item.title) continue
                let existing = await Anime.findOne({
                    $or: [{ malId: item.mal_id }, { title: new RegExp('^' + item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }]
                })

                if (!existing) {
                    const genres = (item.genres || []).map(g => g.name)
                    if (item.themes) genres.push(...item.themes.map(t => t.name))
                    if (item.demographics) genres.push(...item.demographics.map(d => d.name))
                    const uniqueGenres = [...new Set(genres)]

                    const studio = (item.studios || []).map(s => s.name).join(' / ') || 'Unknown'
                    const cover = getHDImage(item)

                    existing = await Anime.create({
                        title: item.title,
                        altTitle: item.title_english || item.title_japanese || '',
                        malId: item.mal_id,
                        genres: uniqueGenres,
                        rating: item.score || 0,
                        episodes: item.episodes || 12,
                        releaseStatus: mapStatus(item.status),
                        year: item.year || (item.aired?.prop?.from?.year) || null,
                        studio,
                        synopsis: item.synopsis || 'No synopsis available.',
                        cover,
                        banner: cover,
                        mediaType: mapMediaType(item.type)
                    })
                }
                results.push(existing)
            }
        }
    } catch (err) {
        console.error('[Jikan Search Fallback] Error:', err.message)
    }

    return results
}

// High-performance RAM cache for frequent public queries
const apiRamCache = new Map()

function getRamCache(key) {
    const entry = apiRamCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
        apiRamCache.delete(key)
        return null
    }
    return entry.data
}

function setRamCache(key, data, ttlSeconds = 15) {
    apiRamCache.set(key, { data, expiry: Date.now() + (ttlSeconds * 1000) })
}

// GET /api/anime
// supports ?search= &genre= &status= &sort= &trending= &popular= &minRating=
router.get('/', async (req, res) => {
    try {
        const { search, genre, status, sort, trending, popular, minRating } = req.query
        
        // Cache lookup key for default list queries
        const cacheKey = `anime_list_${search||''}_${genre||''}_${status||''}_${sort||''}_${trending||''}_${popular||''}_${minRating||''}`
        const cachedResult = getRamCache(cacheKey)
        if (cachedResult) {
            return res.json({ ok: true, data: cachedResult })
        }

        let filter = {}

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' }
            filter.$or = [
                { title: searchRegex },
                { altTitle: searchRegex }
            ]
        }
        if (genre && genre !== 'All') filter.genres = genre
        if (status && status !== 'All') filter.releaseStatus = status
        if (minRating && parseFloat(minRating) > 0) filter.rating = { $gte: parseFloat(minRating) }
        if (trending === 'true') filter.isTrending = true
        if (popular === 'true') filter.isPopular = true

        let sortBy = { rating: -1 }
        if (popular === 'true') sortBy = { popularityRank: 1 }
        else if (trending === 'true') sortBy = { trendingRank: 1 }

        if (sort === 'year') sortBy = { year: -1 }
        else if (sort === 'title') sortBy = { title: 1 }

        // .lean() for 4x-10x faster query performance & minimal memory usage
        let list = await Anime.find(filter).sort(sortBy).lean()

        // External API search & automatic MongoDB persistence
        if (search && list.length < 3) {
            await searchExternalAndPersist(search)
            list = await Anime.find(filter).sort(sortBy).lean()
        }

        // Cache result in RAM for 15 seconds
        setRamCache(cacheKey, list, 15)

        res.json({ ok: true, data: list })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/anime/stats
router.get('/stats', async (req, res) => {
    try {
        const cachedStats = getRamCache('anime_stats')
        if (cachedStats) {
            return res.json({ ok: true, ...cachedStats })
        }

        const User = require('../models/User')
        const Watchlist = require('../models/Watchlist')
        
        const [animeCount, userCount, watchlistCount, ratedCount] = await Promise.all([
            Anime.countDocuments(),
            User.countDocuments(),
            Watchlist.countDocuments(),
            Watchlist.countDocuments({ userRating: { $gt: 0 } })
        ])

        const statsData = {
            anime: animeCount,
            members: userCount,
            reviews: ratedCount,
            watchlists: watchlistCount
        }

        setRamCache('anime_stats', statsData, 10)

        res.json({
            ok: true,
            ...statsData
        })
    } catch (err) {
        console.error('Stats query failed:', err)
        res.status(500).json({ ok: false, msg: 'failed to fetch stats' })
    }
})

// GET /api/anime/:id
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id
        let found

        if (id.startsWith('mal-') || !mongoose.Types.ObjectId.isValid(id)) {
            const malId = parseInt(id.replace('mal-', ''))
            if (isNaN(malId)) {
                return res.status(400).json({ ok: false, msg: 'invalid id' })
            }

            // Check if we already have it in MongoDB
            found = await Anime.findOne({ malId })

            if (!found) {
                // Fetch from Jikan API and save automatically
                const jRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}`)
                if (!jRes.ok) {
                    return res.status(404).json({ ok: false, msg: 'anime not found on MyAnimeList' })
                }
                const jJson = await jRes.json()
                const item = jJson.data

                if (item) {
                    const genres = (item.genres || []).map(g => g.name)
                    if (item.themes) genres.push(...item.themes.map(t => t.name))
                    if (item.demographics) genres.push(...item.demographics.map(d => d.name))
                    const uniqueGenres = [...new Set(genres)]
                    const altTitle = item.title_english || item.title_japanese || ''
                    const studio = (item.studios || []).map(s => s.name).join(' / ') || 'Unknown'
                    const cover = getHDImage(item)
                    const banner = cover
                    const year = item.year || (item.aired?.prop?.from?.year) || null

                    found = await Anime.create({
                        title: item.title,
                        altTitle,
                        malId: item.mal_id,
                        genres: uniqueGenres,
                        rating: item.score || 0,
                        episodes: item.episodes || 12,
                        releaseStatus: mapStatus(item.status),
                        year,
                        studio,
                        synopsis: item.synopsis || 'No synopsis available.',
                        cover,
                        banner,
                        mediaType: mapMediaType(item.type)
                    })
                }
            }
        } else {
            found = await Anime.findById(id)
        }

        if (!found) return res.status(404).json({ ok: false, msg: 'not found' })
        res.json({ ok: true, data: found })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/anime - admin only
router.post('/', requireLogin, adminOnly, async (req, res) => {
    try {
        const created = await Anime.create(req.body)
        res.status(201).json({ ok: true, data: created })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// PUT /api/anime/:id - admin only
router.put('/:id', requireLogin, adminOnly, async (req, res) => {
    try {
        const updated = await Anime.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!updated) return res.status(404).json({ ok: false, msg: 'not found' })
        res.json({ ok: true, data: updated })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// POST /api/anime/sync-trending - manual trigger for daily trending update
router.post('/sync-trending', async (req, res) => {
    try {
        const { syncTrendingAnime } = require('../services/trendingSync')
        const result = await syncTrendingAnime()
        res.json(result)
    } catch (err) {
        console.error('[AnimeRoute] Sync trending error:', err)
        res.status(500).json({ ok: false, msg: 'failed to sync trending anime' })
    }
})

// DELETE /api/anime/:id - admin only
router.delete('/:id', requireLogin, adminOnly, async (req, res) => {
    try {
        await Anime.findByIdAndDelete(req.params.id)
        res.json({ ok: true, msg: 'deleted' })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
