const express = require('express')
const Friend = require('../models/Friend')
const User = require('../models/User')
const { requireLogin } = require('../middleware/auth')

const router = express.Router()

// GET /api/friends - my friends, incoming requests, sent requests
router.get('/', requireLogin, async (req, res) => {
    try {
        const uid = req.user._id

        // accepted friendships where im either side
        const accepted = await Friend.find({
            $or: [{ from: uid }, { to: uid }],
            accepted: true
        }).populate('from to', 'username avatar status')

        // someone sent me a request
        const incoming = await Friend.find({ to: uid, accepted: false })
            .populate('from', 'username avatar status')

        // requests i sent
        const sent = await Friend.find({ from: uid, accepted: false })
            .populate('to', 'username avatar status')

        res.json({ ok: true, accepted, incoming, sent })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/friends/discover - all users (not friends yet)
router.get('/discover', requireLogin, async (req, res) => {
    try {
        const users = await User.find({
            _id: { $ne: req.user._id },
            role: { $ne: 'admin' },
            banned: false
        })
        res.json({ ok: true, data: users })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/friends/add/:userId - send request
router.post('/add/:userId', requireLogin, async (req, res) => {
    try {
        const fromId = req.user._id
        const toId = req.params.userId

        // check if already exists either way
        const existing = await Friend.findOne({
            $or: [
                { from: fromId, to: toId },
                { from: toId, to: fromId }
            ]
        })

        if (existing) return res.status(400).json({ ok: false, msg: 'already sent or already friends' })

        const req_ = await Friend.create({ from: fromId, to: toId })
        res.status(201).json({ ok: true, data: req_ })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// PUT /api/friends/accept/:userId - accept a request
router.put('/accept/:userId', requireLogin, async (req, res) => {
    try {
        const updated = await Friend.findOneAndUpdate(
            { from: req.params.userId, to: req.user._id, accepted: false },
            { accepted: true },
            { new: true }
        )
        if (!updated) return res.status(404).json({ ok: false, msg: 'request not found' })
        res.json({ ok: true, data: updated })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// DELETE /api/friends/remove/:userId - unfriend
router.delete('/remove/:userId', requireLogin, async (req, res) => {
    try {
        const me = req.user._id
        const them = req.params.userId
        await Friend.deleteOne({
            $or: [{ from: me, to: them }, { from: them, to: me }]
        })
        res.json({ ok: true })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
