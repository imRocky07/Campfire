const mongoose = require('mongoose')

const friendSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accepted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

// Indexes for high concurrency friend requests & status queries
friendSchema.index({ from: 1, to: 1 })
friendSchema.index({ to: 1, accepted: 1 })
friendSchema.index({ from: 1, accepted: 1 })

module.exports = mongoose.model('Friend', friendSchema)
