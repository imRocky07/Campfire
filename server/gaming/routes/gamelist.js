const express = require('express')
const Gamelist = require('../models/Gamelist')
const { requireLogin } = require('../../middleware/auth')

const router = express.Router()

// GET /api/gamelist - user's game library
router.get('/', requireLogin, async (req, res) => {
    try {
        const myList = await Gamelist.find({ user: req.user._id }).populate('game').lean()
        res.json({ ok: true, data: myList })
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/gamelist - add game to library
router.post('/', requireLogin, async (req, res) => {
    try {
        const { gameId, gameStatus } = req.body

        const dupe = await Gamelist.findOne({ user: req.user._id, game: gameId })
        if (dupe) {
            // Update status if already exists
            dupe.gameStatus = gameStatus || 'plan_to_play'
            await dupe.save()
            const populatedDupe = await dupe.populate('game')
            return res.json({ ok: true, data: populatedDupe })
        }

        const entry = await Gamelist.create({
            user: req.user._id,
            game: gameId,
            gameStatus: gameStatus || 'plan_to_play'
        })
        const populated = await entry.populate('game')
        res.status(201).json({ ok: true, data: populated })
    } catch (err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// PUT /api/gamelist/:gameId - update entry
router.put('/:gameId', requireLogin, async (req, res) => {
    try {
        const entry = await Gamelist.findOneAndUpdate(
            { user: req.user._id, game: req.params.gameId },
            req.body,
            { new: true }
        ).populate('game')

        if (!entry) return res.status(404).json({ ok: false, msg: 'entry not found' })
        res.json({ ok: true, data: entry })
    } catch (err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// DELETE /api/gamelist/:gameId - remove entry
router.delete('/:gameId', requireLogin, async (req, res) => {
    try {
        await Gamelist.findOneAndDelete({ user: req.user._id, game: req.params.gameId })
        res.json({ ok: true })
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
