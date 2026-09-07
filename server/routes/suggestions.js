const express = require('express')
const Suggestion = require('../models/Suggestion')
const Anime = require('../models/Anime')
const User = require('../models/User')
const { requireLogin, adminOnly } = require('../middleware/auth')
const { checkProfanity, checkRubbishOrOffTopic, sanitizeText } = require('../utils/moderation')

const router = express.Router()

// GET /api/suggestions/my - get logged in user's own suggestions ONLY
router.get('/my', requireLogin, async (req, res) => {
    try {
        const mySuggestions = await Suggestion.find({ user: req.user._id })
            .sort({ createdAt: 1 })
            .lean()
        res.json({ ok: true, data: mySuggestions })
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

// POST /api/suggestions - submit a suggestion or help request
router.post('/', requireLogin, async (req, res) => {
    try {
        const { type, title, details } = req.body

        const textToCheck = (details || title || '').trim()
        if (!textToCheck) {
            return res.status(400).json({ ok: false, msg: 'Please enter a message' })
        }

        const rawTitle = (title || textToCheck.slice(0, 60)).trim()
        const rawDetails = textToCheck

        // 1. Security & Moderation Check: Profanity & Rubbish / Off-Topic / Keyboard Mashing
        const profanity = checkProfanity(rawDetails)
        const rubbish = checkRubbishOrOffTopic(rawDetails)

        if (profanity.isProfane || rubbish.isRubbish) {
            // DO NOT SAVE SUGGESTION (Message deleted/removed)
            const user = await User.findById(req.user._id)
            if (!user) return res.status(404).json({ ok: false, msg: 'User not found' })

            user.warningsCount = (user.warningsCount || 0) + 1
            const reasonStr = profanity.isProfane ? 
                `Bad words (${profanity.word || 'profanity'})` : 
                `Off-topic / Rubbish text (${rubbish.reason})`

            user.warningsHistory.push({
                reason: reasonStr,
                message: rawDetails.slice(0, 100),
                date: new Date()
            })

            // 2-Warning Penalty System
            if (user.warningsCount >= 2) {
                user.banned = true
                user.status = 'offline'
                await user.save()

                return res.status(403).json({
                    ok: false,
                    blocked: true,
                    warningsCount: user.warningsCount,
                    msg: '🚫 Account Blocked: You received 2 warnings for posting rubbish/off-topic/bad words.'
                })
            } else {
                await user.save()

                return res.status(400).json({
                    ok: false,
                    warning: true,
                    warningsCount: user.warningsCount,
                    msg: `⚠️ Warning 1/2: Your message was identified as off-topic/rubbish/bad language and was removed. A 2nd offense will block your account.`
                })
            }
        }

        const sanitizedTitle = sanitizeText(rawTitle)
        const sanitizedDetails = sanitizeText(rawDetails)

        // 2. Duplicate Detection Check ("Already working on it! 🔥")
        const keywords = sanitizedDetails.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
        let isDuplicate = false

        if (keywords.length > 0) {
            // Check existing suggestions in DB across all users (excluding current user's newly created item)
            const existingSug = await Suggestion.findOne({
                details: new RegExp(keywords.slice(0, 2).join('|'), 'i')
            })

            // Check if anime already exists in database
            const existingAnime = await Anime.findOne({
                title: new RegExp(keywords.slice(0, 2).join('|'), 'i')
            })

            if (existingSug || existingAnime) {
                isDuplicate = true
            }
        }

        const botReply = isDuplicate ?
            'Already working on it! 🔥' :
            null

        const suggestion = await Suggestion.create({
            user: req.user._id,
            type: type || 'anime_suggestion',
            title: sanitizedTitle,
            details: sanitizedDetails,
            status: isDuplicate ? 'reviewed' : 'pending'
        })

        res.status(201).json({
            ok: true,
            isDuplicate,
            botReply,
            msg: isDuplicate ? 'Already working on it! 🔥' : 'Feedback submitted! 🔥',
            data: suggestion
        })

    } catch (err) {
        console.error('Suggestion submit error:', err)
        res.status(500).json({ ok: false, msg: 'Failed to submit suggestion' })
    }
})

// GET /api/suggestions - admin list all suggestions
router.get('/', requireLogin, adminOnly, async (req, res) => {
    try {
        const list = await Suggestion.find()
            .populate('user', 'username email avatar')
            .sort({ createdAt: -1 })
            .lean()

        res.json({ ok: true, data: list })
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message })
    }
})

module.exports = router
