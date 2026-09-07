require('dotenv').config()
const mongoose = require('mongoose')
const Anime = require('./models/Anime')

const PAGES_TO_FETCH = 20 // 20 pages * 25 per page = 500 anime
const DELAY_MS = 1500 // 1.5 seconds between pages to respect Jikan API rate limits (3 requests/second)

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function mapStatus(jikanStatus) {
    if (!jikanStatus) return 'Ongoing'
    if (jikanStatus.toLowerCase().includes('finished')) return 'Completed'
    if (jikanStatus.toLowerCase().includes('currently')) return 'Ongoing'
    if (jikanStatus.toLowerCase().includes('not yet')) return 'Upcoming'
    return 'Ongoing'
}

function mapMediaType(jikanType) {
    const valid = ['TV', 'Movie', 'OVA', 'Special']
    if (valid.includes(jikanType)) return jikanType
    return 'TV'
}

async function importAnime() {
    try {
        console.log('Connecting to database...')
        await mongoose.connect(process.env.MONGO_URI)
        console.log('Database connected!')

        let totalImported = 0
        let totalUpdated = 0

        for (let page = 1; page <= PAGES_TO_FETCH; page++) {
            console.log(`\n--- Fetching page ${page}/${PAGES_TO_FETCH} from Jikan API ---`)
            const response = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}`)
            
            if (!response.ok) {
                console.error(`Failed to fetch page ${page}: Status ${response.status}. Retrying in 5 seconds...`)
                await sleep(5000)
                page-- // Retry this page
                continue
            }

            const json = await response.json()
            const animeList = json.data

            if (!animeList || animeList.length === 0) {
                console.log('No more anime data found. Ending import.')
                break
            }

            console.log(`Processing ${animeList.length} anime from page ${page}...`)

            for (const item of animeList) {
                // Ensure required field exists
                if (!item.title) continue

                const genres = (item.genres || []).map(g => g.name)
                // Add themes and demographics as genres to enrich search
                if (item.themes) genres.push(...item.themes.map(t => t.name))
                if (item.demographics) genres.push(...item.demographics.map(d => d.name))

                // Remove duplicate genres
                const uniqueGenres = [...new Set(genres)]

                const rating = item.score || 0
                const altTitle = item.title_english || item.title_japanese || ''
                const studio = (item.studios || []).map(s => s.name).join(' / ') || 'Unknown'
                const cover = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || ''
                const banner = item.images?.jpg?.large_image_url || cover

                const year = item.year || (item.aired?.prop?.from?.year) || null

                const rank = item.rank || 9999

                const mapped = {
                    title: item.title,
                    altTitle,
                    malId: item.mal_id,
                    genres: uniqueGenres,
                    rating,
                    episodes: item.episodes || 12,
                    releaseStatus: mapStatus(item.status),
                    year,
                    studio,
                    synopsis: item.synopsis || 'No synopsis available.',
                    cover,
                    banner,
                    mediaType: mapMediaType(item.type),
                    isTrending: rank <= 15,
                    isPopular: rank <= 100
                }

                // Upsert by title to avoid duplicates
                const existing = await Anime.findOne({ title: mapped.title })
                if (existing) {
                    await Anime.updateOne({ _id: existing._id }, mapped)
                    totalUpdated++
                } else {
                    await Anime.create(mapped)
                    totalImported++
                }
            }

            console.log(`Page ${page} completed. Progress: ${totalImported} new, ${totalUpdated} updated.`)

            // Sleep to avoid rate limiting
            if (page < PAGES_TO_FETCH) {
                console.log(`Sleeping for ${DELAY_MS}ms...`)
                await sleep(DELAY_MS)
            }
        }

        console.log('\n======================================')
        console.log('Import completed successfully!')
        console.log(`Total new anime added: ${totalImported}`)
        console.log(`Total anime updated:   ${totalUpdated}`)
        console.log('======================================')
        process.exit(0)
    } catch (err) {
        console.error('Import failed with error:', err)
        process.exit(1)
    }
}

importAnime()
