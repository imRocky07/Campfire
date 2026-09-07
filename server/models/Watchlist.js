const mongoose = require('mongoose')

// tracks what each user is watching / has watched etc
const listSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    anime: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Anime',
        required: true
    },
    watchStatus: {
        type: String,
        enum: ['watching', 'completed', 'plan_to_watch', 'dropped'],
        default: 'plan_to_watch'
    },
    ep_progress: {
        type: Number,
        default: 0,
        min: 0
    },
    userRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    }
}, { timestamps: true })

// Indexes for high concurrency lookups
listSchema.index({ user: 1, anime: 1 }, { unique: true })
listSchema.index({ user: 1, watchStatus: 1 })
listSchema.index({ anime: 1 })

module.exports = mongoose.model('Watchlist', listSchema)
