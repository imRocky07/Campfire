const mongoose = require('mongoose')

const suggestionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['anime_suggestion', 'game_suggestion', 'category_suggestion', 'feature_request', 'bug_report', 'help_question', 'other'],
        default: 'anime_suggestion'
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    details: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved'],
        default: 'pending'
    }
}, { timestamps: true })

module.exports = mongoose.model('Suggestion', suggestionSchema)
