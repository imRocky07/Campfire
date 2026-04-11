const mongoose = require('mongoose')

const msgSchema = new mongoose.Schema({
    room: {
        type: String,
        required: true,
        default: 'general'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    }
}, { timestamps: true })

// index for faster room queries
msgSchema.index({ room: 1, createdAt: -1 })

module.exports = mongoose.model('Message', msgSchema)
