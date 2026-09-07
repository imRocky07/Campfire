const mongoose = require('mongoose')

const gamelistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    gameStatus: {
        type: String,
        enum: ['plan_to_play', 'playing', 'completed', 'dropped'],
        default: 'plan_to_play'
    },
    playtimeHours: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

gamelistSchema.index({ user: 1, game: 1 }, { unique: true })

module.exports = mongoose.model('Gamelist', gamelistSchema)
