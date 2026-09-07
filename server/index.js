require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')

const compression = require('compression')

const app = express()

// High-performance network compression (Gzip / Brotli)
app.use(compression())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve frontend with no-cache headers to ensure immediate updates across all browsers
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: 0,
    etag: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
    }
}))

// api routes
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/anime',       require('./routes/anime'))
app.use('/api/watchlist',   require('./routes/watchlist'))
app.use('/api/messages',    require('./routes/messages'))
app.use('/api/friends',     require('./routes/friends'))
app.use('/api/admin',       require('./routes/admin'))
app.use('/api/suggestions', require('./routes/suggestions'))
app.use('/api/games',       require('./gaming/routes/games'))
app.use('/api/gamelist',    require('./gaming/routes/gamelist'))

// everything else serves the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'))
})

// basic error handler
app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ ok: false, msg: 'server error' })
})

const { startRankingScheduler } = require('./services/rankingUpdater')
const { startDailyTrendingCron } = require('./services/trendingSync')

const PORT = process.env.PORT || 3000

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('mongodb connected')
        startRankingScheduler()
        startDailyTrendingCron()
        app.listen(PORT, () => {
            console.log(`campfire running → http://localhost:${PORT}`)
        })
    })
    .catch(err => {
        console.error('db connection failed:', err.message)
        process.exit(1)
    })
