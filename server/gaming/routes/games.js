const express = require('express')
const Game = require('../models/Game')
const { requireLogin, adminOnly } = require('../../middleware/auth')
const { getRawgApiKey, fetchRawgGames, fetchRawgGameDetails } = require('../services/rawgService')

const router = express.Router()

// GET /api/games - query games list
router.get('/', async (req, res) => {
    try {
        const { search, genre, platform, sort, minRating, limit } = req.query

        // Try RAWG API if key is set
        if (getRawgApiKey()) {
            const rawgGames = await fetchRawgGames({
                search,
                genre,
                platform,
                ordering: sort === 'year' ? '-released' : (sort === 'title' ? 'name' : '-rating'),
                pageSize: parseInt(limit) || 24
            })

            if (rawgGames && rawgGames.length > 0) {
                // Upsert RAWG games into MongoDB asynchronously so user gamelist can reference them
                Promise.allSettled(rawgGames.map(g => Game.updateOne({ _id: g._id }, g, { upsert: true }))).catch(() => {})
                return res.json({ ok: true, data: rawgGames, source: 'rawg' })
            }
        }

        // Fallback to local MongoDB Games dataset
        let query = {}

        if (search) {
            query.title = { $regex: search.trim(), $options: 'i' }
        }
        if (genre && genre !== 'All') {
            query.genres = genre
        }
        if (platform && platform !== 'All') {
            query.platforms = platform
        }
        if (minRating && parseFloat(minRating) > 0) {
            query.rating = { $gte: parseFloat(minRating) }
        }

        let dbQuery = Game.find(query)

        if (sort === 'rating') dbQuery = dbQuery.sort({ rating: -1 })
        else if (sort === 'year') dbQuery = dbQuery.sort({ releaseYear: -1 })
        else if (sort === 'title') dbQuery = dbQuery.sort({ title: 1 })
        else dbQuery = dbQuery.sort({ rating: -1 })

        if (limit && parseInt(limit) > 0) {
            dbQuery = dbQuery.limit(parseInt(limit))
        }

        const games = await dbQuery.exec()
        res.json({ ok: true, data: games, source: 'database' })
    } catch (err) {
        console.error('get games error:', err.message)
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/games/recommendations - top games
router.get('/recommendations', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12

        if (getRawgApiKey()) {
            const rawgGames = await fetchRawgGames({ ordering: '-rating', pageSize: limit })
            if (rawgGames && rawgGames.length > 0) {
                Promise.allSettled(rawgGames.map(g => Game.updateOne({ _id: g._id }, g, { upsert: true }))).catch(() => {})
                return res.json({ ok: true, data: rawgGames, source: 'rawg' })
            }
        }

        const games = await Game.find({ isPopular: true }).sort({ rating: -1 }).limit(limit)
        res.json({ ok: true, data: games, source: 'database' })
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/games/:id - single game details
router.get('/:id', async (req, res) => {
    try {
        let game = await Game.findById(req.params.id)
        if (!game && req.params.id.startsWith('rawg-') && getRawgApiKey()) {
            const fetched = await fetchRawgGameDetails(req.params.id)
            if (fetched) {
                game = await Game.create(fetched)
            }
        }
        if (!game) return res.status(404).json({ ok: false, msg: 'game not found' })
        res.json({ ok: true, data: game })
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/games - create game (admin only)
router.post('/', requireLogin, adminOnly, async (req, res) => {
    try {
        const game = await Game.create(req.body)
        res.status(201).json({ ok: true, data: game })
    } catch (err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

module.exports = router
