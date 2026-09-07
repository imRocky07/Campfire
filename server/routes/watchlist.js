const express = require('express')
const Watchlist = require('../models/Watchlist')
const { requireLogin } = require('../middleware/auth')

const router = express.Router()

// GET /api/watchlist - my list
router.get('/', requireLogin, async (req, res) => {
    try {
        const myList = await Watchlist.find({ user: req.user._id }).populate('anime').lean()
        res.json({ ok: true, data: myList })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/watchlist - add anime
router.post('/', requireLogin, async (req, res) => {
    try {
        const { animeId, watchStatus } = req.body

        const dupe = await Watchlist.findOne({ user: req.user._id, anime: animeId })
        if (dupe) return res.status(400).json({ ok: false, msg: 'already in list' })

        const entry = await Watchlist.create({
            user: req.user._id,
            anime: animeId,
            watchStatus: watchStatus || 'plan_to_watch'
        })
        const populated = await entry.populate('anime')
        res.status(201).json({ ok: true, data: populated })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// PUT /api/watchlist/:animeId - update entry
router.put('/:animeId', requireLogin, async (req, res) => {
    try {
        const entry = await Watchlist.findOneAndUpdate(
            { user: req.user._id, anime: req.params.animeId },
            req.body,
            { new: true }
        ).populate('anime')

        if (!entry) return res.status(404).json({ ok: false, msg: 'entry not found' })
        res.json({ ok: true, data: entry })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// DELETE /api/watchlist/:animeId - remove from list
router.delete('/:animeId', requireLogin, async (req, res) => {
    try {
        await Watchlist.findOneAndDelete({ user: req.user._id, anime: req.params.animeId })
        res.json({ ok: true })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
