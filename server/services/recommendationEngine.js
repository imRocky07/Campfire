const Watchlist = require('../models/Watchlist')
const Anime = require('../models/Anime')

// Hybrid recommendations combining collaborative filtering and genre/studio affinity
async function getPersonalizedRecommendations(userId = null, limit = 10) {
    try {
        let userWl = []
        if (userId) {
            userWl = await Watchlist.find({ user: userId }).populate('anime')
        }

        // Fallback for guests or new users with no watch history
        if (!userId || userWl.length === 0) {
            const topAnime = await Anime.find()
                .sort({ rating: -1, popularityRank: 1 })
                .limit(limit)

            return topAnime.map((anime, index) => {
                const animeObj = anime.toObject()
                const matchPct = Math.max(88, 98 - index * 2)
                animeObj.matchPercentage = `${matchPct}%`
                animeObj.matchReason = '✨ Community AI Spotlight • Top rated by Campfire members'
                return animeObj
            })
        }

        const userAnimeObjectIds = userWl.filter(w => w.anime).map(w => w.anime._id)
        const userAnimeIds = new Set(
            userAnimeObjectIds.map(id => id.toString())
        )

        // Build user genre and studio affinity profile
        const genreScores = {}
        const studioScores = {}
        const userRatingsMap = {}

        userWl.forEach(w => {
            if (!w.anime) return
            const animeIdStr = w.anime._id.toString()
            
            const ratingVal = w.userRating > 0 ? w.userRating : 3.5
            userRatingsMap[animeIdStr] = ratingVal

            let statusMult = 1.0
            if (w.watchStatus === 'completed') statusMult = 1.5
            else if (w.watchStatus === 'watching') statusMult = 1.2
            else if (w.watchStatus === 'plan_to_watch') statusMult = 0.8
            else if (w.watchStatus === 'dropped') statusMult = -0.5

            const itemWeight = (ratingVal / 5) * statusMult

            if (Array.isArray(w.anime.genres)) {
                w.anime.genres.forEach(g => {
                    genreScores[g] = (genreScores[g] || 0) + itemWeight
                })
            }

            if (w.anime.studio) {
                studioScores[w.anime.studio] = (studioScores[w.anime.studio] || 0) + itemWeight
            }
        })

        const topUserGenres = Object.entries(genreScores)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0])

        const topUserStudio = Object.entries(studioScores)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0])[0] || null

        // User-user similarity (collaborative filtering)
        const otherWatchlists = await Watchlist.find({
            user: { $ne: userId }
        })

        const otherUsersMap = {}
        otherWatchlists.forEach(w => {
            if (!w.anime) return
            const uid = w.user.toString()
            if (!otherUsersMap[uid]) otherUsersMap[uid] = {}
            const rVal = w.userRating > 0 ? w.userRating : (w.watchStatus === 'completed' ? 4 : 3)
            otherUsersMap[uid][w.anime.toString()] = rVal
        })

        const cfScores = {}
        const cfUserCounts = {}

        Object.entries(otherUsersMap).forEach(([otherUid, otherRatings]) => {
            let dotProduct = 0
            let normUser = 0
            let normOther = 0
            let overlaps = 0

            Object.entries(userRatingsMap).forEach(([aid, uRating]) => {
                normUser += uRating * uRating
                if (otherRatings[aid] !== undefined) {
                    const oRating = otherRatings[aid]
                    dotProduct += uRating * oRating
                    normOther += oRating * oRating
                    overlaps++
                }
            })

            if (overlaps > 0 && normUser > 0 && normOther > 0) {
                const similarity = dotProduct / (Math.sqrt(normUser) * Math.sqrt(normOther))

                if (similarity > 0.3) {
                    Object.entries(otherRatings).forEach(([candidateAid, oRating]) => {
                        if (!userAnimeIds.has(candidateAid) && oRating >= 3) {
                            cfScores[candidateAid] = (cfScores[candidateAid] || 0) + (similarity * oRating)
                            cfUserCounts[candidateAid] = (cfUserCounts[candidateAid] || 0) + 1
                        }
                    })
                }
            }
        })

        // Fetch candidate anime and calculate hybrid scores
        const allCandidates = await Anime.find({
            _id: { $nin: userAnimeObjectIds }
        })

        // Max genre weight for normalization
        const maxGenreWeight = Math.max(...Object.values(genreScores), 1)

        // 4. Compute Final Hybrid Scores & Build Recommendation Objects
        const scoredCandidates = allCandidates.map(anime => {
            const aidStr = anime._id.toString()

            // Content Score (0 - 10)
            let contentScore = 0
            let matchedGenres = []

            if (Array.isArray(anime.genres)) {
                anime.genres.forEach(g => {
                    if (genreScores[g]) {
                        contentScore += (genreScores[g] / maxGenreWeight) * 3
                        matchedGenres.push(g)
                    }
                })
            }

            if (anime.studio && studioScores[anime.studio]) {
                contentScore += (studioScores[anime.studio] / maxGenreWeight) * 2.5
            }

            // Global anime quality boost
            contentScore += (anime.rating / 10) * 2

            // Collaborative Filtering Score
            const rawCfScore = cfScores[aidStr] || 0
            const cfBoost = Math.min(rawCfScore * 1.5, 8)

            // Combined Total Score
            const totalScore = contentScore + cfBoost

            // Generate Match Reason
            let matchReason = ''
            if (rawCfScore > 2.5) {
                matchReason = `🔥 Highly recommended by fans with similar taste`
            } else if (matchedGenres.length > 0) {
                const topG = matchedGenres.slice(0, 2).join(' & ')
                if (anime.studio && anime.studio === topUserStudio) {
                    matchReason = `🎯 Based on your love for ${topG} & ${anime.studio}`
                } else {
                    matchReason = `🎯 Based on your interest in ${topG}`
                }
            } else if (topUserGenres.length > 0) {
                matchReason = `✨ Highly rated pick for ${topUserGenres[0]} fans`
            } else {
                matchReason = `⭐ Top rated match for your profile`
            }

            return {
                anime,
                totalScore,
                matchedGenres,
                matchReason,
                hasCF: rawCfScore > 0
            }
        })

        // Sort candidates by total hybrid score descending
        scoredCandidates.sort((a, b) => b.totalScore - a.totalScore)

        // Take top candidates up to limit
        const topCandidates = scoredCandidates.slice(0, limit)
        const maxScore = topCandidates.length > 0 ? topCandidates[0].totalScore : 1

        return topCandidates.map((item, index) => {
            const animeObj = item.anime.toObject()

            // Calculate realistic dynamic match percentage between 84% and 99%
            const relativeRatio = item.totalScore / (maxScore || 1)
            const matchPct = Math.min(99, Math.max(84, Math.round(86 + relativeRatio * 13 - index * 0.5)))

            animeObj.matchPercentage = `${matchPct}%`
            animeObj.matchReason = item.matchReason || 'Match • Recommended based on your watch history'

            return animeObj
        })

    } catch (err) {
        console.error('[RecommendationEngine] Error computing recommendations:', err)
        // Fallback to top rated anime on error
        const fallback = await Anime.find().sort({ rating: -1 }).limit(limit)
        return fallback.map((a, idx) => {
            const obj = a.toObject()
            obj.matchPercentage = `${95 - idx}%`
            obj.matchReason = '⭐ Top Recommended Anime'
            return obj
        })
    }
}

module.exports = {
    getPersonalizedRecommendations
}
