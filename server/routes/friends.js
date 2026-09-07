const express = require('express')
const Friend = require('../models/Friend')
const User = require('../models/User')
const { requireLogin } = require('../middleware/auth')

const router = express.Router()

// GET /api/friends - my friends, incoming requests, sent requests
router.get('/', requireLogin, async (req, res) => {
    try {
        const uid = req.user._id

        // Execute all 3 friend lookups in parallel with .lean() for maximum performance
        const [accepted, incoming, sent] = await Promise.all([
            Friend.find({ $or: [{ from: uid }, { to: uid }], accepted: true }).populate('from to', 'username avatar status').lean(),
            Friend.find({ to: uid, accepted: false }).populate('from', 'username avatar status').lean(),
            Friend.find({ from: uid, accepted: false }).populate('to', 'username avatar status').lean()
        ])

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
        }).select('username avatar status bio').lean()

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

// GET /api/friends/user/:userId - fetch public user profile & relationship status
router.get('/user/:userId', requireLogin, async (req, res) => {
    try {
        const me = req.user
        const targetId = req.params.userId

        const targetUser = await User.findById(targetId).select('-password')
        if (!targetUser) return res.status(404).json({ ok: false, msg: 'user not found' })

        // Check if I blocked them
        const isBlocked = (me.blockedUsers || []).some(id => id.toString() === targetId.toString())

        // Check friendship status
        let friendState = 'none'
        const existing = await Friend.findOne({
            $or: [
                { from: me._id, to: targetId },
                { from: targetId, to: me._id }
            ]
        })

        if (existing) {
            if (existing.accepted) {
                friendState = 'friends'
            } else if (existing.from.toString() === me._id.toString()) {
                friendState = 'sent'
            } else {
                friendState = 'incoming'
            }
        }

        res.json({
            ok: true,
            user: targetUser,
            friendState,
            isBlocked
        })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/friends/block/:userId - block user (scoped to logged-in user)
router.post('/block/:userId', requireLogin, async (req, res) => {
    try {
        const meId = req.user._id
        const targetId = req.params.userId

        if (meId.toString() === targetId.toString()) {
            return res.status(400).json({ ok: false, msg: 'cannot block yourself' })
        }

        // Add to blockedUsers set
        await User.findByIdAndUpdate(meId, {
            $addToSet: { blockedUsers: targetId }
        })

        // Remove any friendship / pending request
        await Friend.deleteOne({
            $or: [
                { from: meId, to: targetId },
                { from: targetId, to: meId }
            ]
        })

        res.json({ ok: true, msg: 'User blocked' })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/friends/unblock/:userId - unblock user
router.post('/unblock/:userId', requireLogin, async (req, res) => {
    try {
        const meId = req.user._id
        const targetId = req.params.userId

        await User.findByIdAndUpdate(meId, {
            $pull: { blockedUsers: targetId }
        })

        res.json({ ok: true, msg: 'User unblocked' })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
