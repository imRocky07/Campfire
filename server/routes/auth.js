const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { requireLogin } = require('../middleware/auth')
const { checkProfanity, sanitizeText } = require('../utils/moderation')

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

        const cleanUsername = sanitizeText(username.trim())

        const profanity = checkProfanity(cleanUsername)
        if (profanity.isProfane) {
            return res.status(400).json({ ok: false, msg: 'Username contains inappropriate language' })
        }

        // check if email or username taken (case-insensitive)
        const safeUname = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const alreadyExists = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: new RegExp('^' + safeUname + '$', 'i') }
            ]
        })

        if (alreadyExists) {
            const field = alreadyExists.email === email.toLowerCase() ? 'email' : 'username'
            return res.status(400).json({ ok: false, msg: `${field} already taken` })
        }

        const newUser = await User.create({ username: cleanUsername, email: email.toLowerCase().trim(), password })
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

        // allow login with either email or username (case-insensitive)
        const safeCred = credential.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const user = await User.findOne({
            $or: [
                { email: credential.toLowerCase() },
                { username: new RegExp('^' + safeCred + '$', 'i') }
            ]
        }).select('+password')

        if (!user) return res.status(401).json({ ok: false, msg: 'account not found' })
        if (user.banned || user.warningsCount >= 2) {
            return res.status(403).json({ ok: false, blocked: true, msg: 'Account blocked due to community guideline violations (profanity warnings).' })
        }

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

// PUT /api/auth/profile - update user profile (username, avatar, bio)
router.put('/profile', requireLogin, async (req, res) => {
    try {
        const { username, avatar, bio } = req.body
        const user = await User.findById(req.user._id)

        if (!user) return res.status(404).json({ ok: false, msg: 'user not found' })

        if (username && username !== user.username) {
            const cleanUsername = sanitizeText(username.trim())
            if (cleanUsername.length < 3 || cleanUsername.length > 20) {
                return res.status(400).json({ ok: false, msg: 'username must be 3-20 characters' })
            }
            const profanity = checkProfanity(cleanUsername)
            if (profanity.isProfane) {
                return res.status(400).json({ ok: false, msg: 'Username contains inappropriate language' })
            }
            const existing = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } })
            if (existing) {
                return res.status(400).json({ ok: false, msg: 'username already taken' })
            }
            user.username = cleanUsername
        }

        if (avatar !== undefined) user.avatar = avatar.trim()
        if (bio !== undefined) {
            const cleanBio = sanitizeText(bio.trim().slice(0, 200))
            const bioProfanity = checkProfanity(cleanBio)
            if (bioProfanity.isProfane) {
                return res.status(400).json({ ok: false, msg: 'Bio contains inappropriate language' })
            }
            user.bio = cleanBio
        }

        await user.save()
        res.json({ ok: true, user: user.toJSON() })

    } catch (err) {
        console.error('profile update err:', err.message)
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/auth/logout
router.post('/logout', requireLogin, async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() })
    res.json({ ok: true })
})

module.exports = router
