const mongoose = require('mongoose')

// simple anime schema nothing fancy
const animeSchema = new mongoose.Schema({
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
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    episodes: {
        type: Number,
        default: 12
    },
    releaseStatus: {
        type: String,
        enum: ['Ongoing', 'Completed', 'Upcoming'],
        default: 'Ongoing'
    },
    year: Number,
    studio: {
        type: String,
        default: ''
    },
    synopsis: {
        type: String,
        default: ''
    },
    cover: {
        type: String,
        default: ''
    },
    banner: {
        type: String,
        default: ''
    },
    mediaType: {
        type: String,
        enum: ['TV', 'Movie', 'OVA', 'Special'],
        default: 'TV'
    },
    isTrending: { type: Boolean, default: false },
    isPopular:  { type: Boolean, default: false }

}, { timestamps: true })

module.exports = mongoose.model('Anime', animeSchema)
