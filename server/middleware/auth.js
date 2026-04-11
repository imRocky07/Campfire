const jwt = require('jsonwebtoken')
const User = require('../models/User')

// middleware to check if user is logged in via jwt
async function requireLogin(req, res, next) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, msg: 'not logged in' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const foundUser = await User.findById(decoded.id)

        if (!foundUser) return res.status(401).json({ ok: false, msg: 'user not found' })
        if (foundUser.banned) return res.status(403).json({ ok: false, msg: 'account banned' })

        req.user = foundUser
        next()
    } catch(err) {
        return res.status(401).json({ ok: false, msg: 'token invalid or expired' })
    }
}

// only admins get through
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ ok: false, msg: 'admins only' })
    }
    next()
}

module.exports = { requireLogin, adminOnly }
