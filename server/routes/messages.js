const express = require('express')
const Message = require('../models/Message')
const { requireLogin, adminOnly } = require('../middleware/auth')

const router = express.Router()

// GET /api/messages/all - admin only, all messages
router.get('/all', requireLogin, adminOnly, async (req, res) => {
    try {
        const msgs = await Message.find()
            .populate('sender', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(200)
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

        const msg = await Message.create({
            room: room || 'general',
            sender: req.user._id,
            body: body.trim()
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
