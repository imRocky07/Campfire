const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    altTitle: {
        type: String,
        default: ''
    },
    genres: [String],
    platforms: [String], // e.g. ["PC", "PS5", "Xbox", "Switch"]
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    releaseYear: Number,
    developer: {
        type: String,
        default: ''
    },
    publisher: {
        type: String,
        default: ''
    },
    synopsis: {
        type: String,
        default: ''
    },
    cover: {
        type: String,
        required: true
    },
    banner: {
        type: String,
        default: ''
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    isTrending: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Game', gameSchema)
