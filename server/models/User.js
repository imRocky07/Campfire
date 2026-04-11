// user model - handles all user stuff
// had to add the select:false on password otherwise it kept leaking into responses

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'need a username'],
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false   // dont send this back ever
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: '',
        maxlength: 200
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['online', 'away', 'offline'],
        default: 'offline'
    },
    banned: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

// hash before save - only if password changed
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next()

    // 12 rounds is good enough, 14 gets slow
    this.password = await bcrypt.hash(this.password, 12)

    // auto set avatar if not provided
    if (!this.avatar) {
        this.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(this.username)}`
    }

    next()
})

// compare password helper
userSchema.methods.checkPassword = async function(inputPass) {
    return await bcrypt.compare(inputPass, this.password)
}

// strip password from output
userSchema.methods.toJSON = function() {
    const data = this.toObject()
    delete data.password
    return data
}

module.exports = mongoose.model('User', userSchema)
