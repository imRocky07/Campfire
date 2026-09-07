// Security and Profanity Moderation Utility for Campfire

const BAD_WORDS = [
    'fuck', 'fucking', 'fucked', 'fucker', 'fuckin', 'fck', 'fuk',
    'shit', 'shitting', 'shitty', 'sh1t',
    'bitch', 'bitches', 'bitching', 'b1tch',
    'asshole', 'arsehole', 'a$$hole',
    'bastard', 'cunt', 'dick', 'dicks', 'pussy', 'whore', 'slut',
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'motherfucker',
    'cock', 'dumbass', 'bullshit'
]

/**
 * Normalizes text to catch leetspeak and special character evasions
 */
function normalizeText(text) {
    if (!text) return ''
    return text
        .toLowerCase()
        .replace(/@/g, 'a')
        .replace(/\$/g, 's')
        .replace(/!/g, 'i')
        .replace(/1/g, 'i')
        .replace(/0/g, 'o')
        .replace(/3/g, 'e')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
}

/**
 * Checks if text contains any bad/profane words
 */
function checkProfanity(text) {
    if (!text || typeof text !== 'string') return { isProfane: false }

    const rawLower = text.toLowerCase()
    const normalized = normalizeText(text)
    // Remove spacing/symbols between letters e.g. "f.u.c.k" -> "fuck"
    const stripped = normalized.replace(/[\s\._\-\*\+\#\~\`\^]/g, '')

    for (const badWord of BAD_WORDS) {
        const escaped = badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const boundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i')
        
        if (boundaryRegex.test(rawLower) || boundaryRegex.test(normalized) || stripped.includes(badWord)) {
            return { isProfane: true, word: badWord }
        }
    }
    return { isProfane: false }
}

/**
 * Checks if text is gibberish, keyboard mashing, or off-topic spam
 */
const GIBBERISH_PATTERNS = [
    /^([a-z0-9])\1{4,}$/i, // 5+ same character e.g. "aaaaa"
    /\b(asdfghjkl|asdfgh|qwertyuiop|zxcvbnm|dfghjkl|sdfgh|qwer|zxcv|hjkl|fgjhk|sdfsdf|asdfasdf)\b/i,
    /^[^a-zA-Z0-9]+$/, // symbols only e.g. "???"
]

function checkRubbishOrOffTopic(text) {
    if (!text || typeof text !== 'string') return { isRubbish: true, reason: 'Empty message' }
    const trimmed = text.trim()
    if (trimmed.length < 3) return { isRubbish: true, reason: 'Message too short' }

    // Check gibberish patterns
    for (const pat of GIBBERISH_PATTERNS) {
        if (pat.test(trimmed)) {
            return { isRubbish: true, reason: 'Keyboard mashing or gibberish detected' }
        }
    }

    // Check repeated character ratio e.g. "ssssssss"
    const charCounts = {}
    for (let char of trimmed.toLowerCase()) {
        if (char !== ' ') charCounts[char] = (charCounts[char] || 0) + 1
    }
    const maxFreq = Math.max(...Object.values(charCounts))
    if (trimmed.length > 5 && maxFreq / trimmed.length > 0.65) {
        return { isRubbish: true, reason: 'Repeated character spam' }
    }

    return { isRubbish: false }
}

/**
 * Escapes HTML characters to prevent XSS attacks
 */
function sanitizeText(str) {
    if (!str || typeof str !== 'string') return ''
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
}

module.exports = {
    BAD_WORDS,
    checkProfanity,
    checkRubbishOrOffTopic,
    sanitizeText
}
