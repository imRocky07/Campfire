const express = require('express')
const User = require('../models/User')
const Anime = require('../models/Anime')
const Message = require('../models/Message')
const { requireLogin, adminOnly } = require('../middleware/auth')

const router = express.Router()

// GET /api/admin/stats
router.get('/stats', requireLogin, adminOnly, async (req, res) => {
    try {
        // run all counts at once, faster
        const [animeCount, userCount, onlineCount, msgCount, bannedCount] = await Promise.all([
            Anime.countDocuments(),
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ status: 'online', role: 'user' }),
            Message.countDocuments(),
            User.countDocuments({ banned: true })
        ])

        res.json({ ok: true, data: { animeCount, userCount, onlineCount, msgCount, bannedCount } })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/admin/users
router.get('/users', requireLogin, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ createdAt: -1 })
        res.json({ ok: true, data: users })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// PUT /api/admin/ban/:id - toggle ban
router.put('/ban/:id', requireLogin, adminOnly, async (req, res) => {
    try {
        const target = await User.findById(req.params.id)
        if (!target) return res.status(404).json({ ok: false, msg: 'user not found' })

        target.banned = !target.banned
        if (target.banned) {
            target.status = 'offline'
        } else {
            target.warningsCount = 0
        }
        await target.save()

        const action = target.banned ? 'banned' : 'unbanned'
        res.json({ ok: true, data: target, msg: `user ${action}` })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/admin/sync-rankings - manually trigger rankings sync
router.post('/sync-rankings', requireLogin, adminOnly, async (req, res) => {
    try {
        const updater = require('../services/rankingUpdater')
        const result = await updater.updateRankings()
        if (result.ok) {
            res.json({ ok: true, msg: `Rankings updated successfully! Updated: ${result.updated}, Created: ${result.created}` })
        } else {
            res.status(500).json({ ok: false, msg: result.error || 'Failed to update rankings' })
        }
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
