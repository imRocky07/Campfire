require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// serve the frontend from /public
app.use(express.static(path.join(__dirname, '../public')))

// api routes
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/anime',     require('./routes/anime'))
app.use('/api/watchlist', require('./routes/watchlist'))
app.use('/api/messages',  require('./routes/messages'))
app.use('/api/friends',   require('./routes/friends'))
app.use('/api/admin',     require('./routes/admin'))

// everything else serves the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'))
})

// basic error handler
app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ ok: false, msg: 'server error' })
})

const PORT = process.env.PORT || 3000

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('mongodb connected')
        app.listen(PORT, () => {
            console.log(`campfire running → http://localhost:${PORT}`)
        })
    })
    .catch(err => {
        console.error('db connection failed:', err.message)
        process.exit(1)
    })
