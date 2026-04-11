const express = require('express')
const Anime = require('../models/Anime')
const { requireLogin, adminOnly } = require('../middleware/auth')

const router = express.Router()

// GET /api/anime
// supports ?search= &genre= &status= &sort= &trending= &popular=
router.get('/', async (req, res) => {
    try {
        const { search, genre, status, sort, trending, popular } = req.query
        let filter = {}

        if (search) filter.title = { $regex: search, $options: 'i' }
        if (genre && genre !== 'All') filter.genres = genre
        if (status && status !== 'All') filter.releaseStatus = status
        if (trending === 'true') filter.isTrending = true
        if (popular === 'true') filter.isPopular = true

        let sortBy = { rating: -1 }
        if (sort === 'year') sortBy = { year: -1 }
        else if (sort === 'title') sortBy = { title: 1 }

        const list = await Anime.find(filter).sort(sortBy)
        res.json({ ok: true, data: list })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/anime/:id
router.get('/:id', async (req, res) => {
    try {
        const found = await Anime.findById(req.params.id)
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
