const express = require('express')
const Message = require('../models/Message')
const User = require('../models/User')
const { requireLogin, adminOnly } = require('../middleware/auth')
const { checkProfanity, sanitizeText } = require('../utils/moderation')

const router = express.Router()

// GET /api/messages/all - admin only, all messages
router.get('/all', requireLogin, adminOnly, async (req, res) => {
    try {
        const msgs = await Message.find()
            .populate('sender', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(200)
            .lean()
        res.json({ ok: true, data: msgs })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/messages/:room - get room messages
router.get('/:room', requireLogin, async (req, res) => {
    try {
        const msgs = await Message.find({ room: req.params.room })
            .populate('sender', 'username avatar')
            .sort({ createdAt: 1 })
            .limit(100)
            .lean()
        res.json({ ok: true, data: msgs })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/messages - send message
router.post('/', requireLogin, async (req, res) => {
    try {
        const { room, body } = req.body

        if (!body || !body.trim()) {
            return res.status(400).json({ ok: false, msg: 'empty message' })
        }

        const rawBody = body.trim()

        // Security Check 1: Moderate profanity / bad words
        const profanity = checkProfanity(rawBody)

        if (profanity.isProfane) {
            // Bad word detected: message is deleted / not created
            const user = await User.findById(req.user._id)
            if (!user) return res.status(404).json({ ok: false, msg: 'user not found' })

            user.warningsCount = (user.warningsCount || 0) + 1
            user.warningsHistory.push({
                reason: `Used inappropriate language (${profanity.word || 'profanity'})`,
                message: rawBody.slice(0, 100),
                date: new Date()
            })

            // Block user after 2 warnings
            if (user.warningsCount >= 2) {
                user.banned = true
                user.status = 'offline'
                await user.save()

                return res.status(403).json({
                    ok: false,
                    blocked: true,
                    warningsCount: user.warningsCount,
                    msg: '🚫 Account Blocked: You have received 2 warnings for using bad words. Your account is now blocked from Campfire.'
                })
            } else {
                await user.save()

                return res.status(400).json({
                    ok: false,
                    warning: true,
                    warningsCount: user.warningsCount,
                    msg: `⚠️ Warning 1/2: Your message contained inappropriate language and was deleted. A 2nd offense will block your account.`
                })
            }
        }

        // Security Check 2: XSS Sanitization
        const sanitizedBody = sanitizeText(rawBody)

        const msg = await Message.create({
            room: room || 'general',
            sender: req.user._id,
            body: sanitizedBody
        })

        const filled = await msg.populate('sender', 'username avatar')
        res.status(201).json({ ok: true, data: filled })
    } catch(err) {
        res.status(400).json({ ok: false, msg: err.message })
    }
})

// DELETE /api/messages/:id - admin delete
router.delete('/:id', requireLogin, adminOnly, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id)
        res.json({ ok: true })
    } catch(err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
