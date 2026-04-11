const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { requireLogin } = require('../middleware/auth')

const router = express.Router()

function makeToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY })
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ ok: false, msg: 'fill all fields' })
        }

        // check if email or username taken
        const alreadyExists = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        })

        if (alreadyExists) {
            const field = alreadyExists.email === email.toLowerCase() ? 'email' : 'username'
            return res.status(400).json({ ok: false, msg: `${field} already taken` })
        }

        const newUser = await User.create({ username, email, password })
        await User.findByIdAndUpdate(newUser._id, { status: 'online', lastSeen: new Date() })

        const token = makeToken(newUser._id)
        res.status(201).json({ ok: true, token, user: newUser })

    } catch(err) {
        console.log('register err:', err.message)
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { credential, password } = req.body

        if (!credential || !password) {
            return res.status(400).json({ ok: false, msg: 'enter credentials' })
        }

        // allow login with either email or username
        const user = await User.findOne({
            $or: [
                { email: credential.toLowerCase() },
                { username: credential }
            ]
        }).select('+password')

        if (!user) return res.status(401).json({ ok: false, msg: 'account not found' })
        if (user.banned) return res.status(403).json({ ok: false, msg: 'account suspended' })

        const passOk = await user.checkPassword(password)
        if (!passOk) return res.status(401).json({ ok: false, msg: 'wrong password' })

        // mark as online
        await User.findByIdAndUpdate(user._id, { status: 'online', lastSeen: new Date() })

        const token = makeToken(user._id)
        res.json({ ok: true, token, user: user.toJSON() })

    } catch(err) {
        console.log('login err:', err.message)
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// GET /api/auth/me - get current user
router.get('/me', requireLogin, (req, res) => {
    res.json({ ok: true, user: req.user })
})

// POST /api/auth/logout
router.post('/logout', requireLogin, async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() })
    res.json({ ok: true })
})

module.exports = router
