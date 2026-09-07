require('dotenv').config()
const mongoose = require('mongoose')
const Game = require('./models/Game')

const seedGames = [
    {
        title: "Elden Ring",
        altTitle: "エルデンリング",
        genres: ["RPG", "Action", "Open World"],
        platforms: ["PC", "PS5", "Xbox"],
        rating: 9.6,
        releaseYear: 2022,
        developer: "FromSoftware",
        publisher: "Bandai Namco",
        synopsis: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
        cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg",
        banner: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "The Legend of Zelda: Tears of the Kingdom",
        altTitle: "ゼルダの伝説 ティアーズ オブ ザ キングダム",
        genres: ["Adventure", "Action", "Open World"],
        platforms: ["Switch"],
        rating: 9.7,
        releaseYear: 2023,
        developer: "Nintendo EPD",
        publisher: "Nintendo",
        synopsis: "An epic adventure across the land and skies of Hyrule awaits in The Legend of Zelda: Tears of the Kingdom.",
        cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg",
        banner: "https://images.igdb.com/igdb/image/upload/t_1080p/co5vmg.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "Cyberpunk 2077: Phantom Liberty",
        altTitle: "サイバーパンク2077",
        genres: ["RPG", "Action", "Cyberpunk", "Open World"],
        platforms: ["PC", "PS5", "Xbox"],
        rating: 9.2,
        releaseYear: 2023,
        developer: "CD Projekt Red",
        publisher: "CD Projekt",
        synopsis: "Phantom Liberty is a spy-thriller expansion for Cyberpunk 2077. As cyber-enhanced mercenary V, join secret agent Solomon Reed to unravel a web of shattered loyalties.",
        cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900.jpg",
        banner: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "God of War Ragnarök",
        altTitle: "ゴッド・オブ・ウォー ラグナロク",
        genres: ["Action", "Adventure", "RPG"],
        platforms: ["PS5", "PC"],
        rating: 9.5,
        releaseYear: 2022,
        developer: "Santa Monica Studio",
        publisher: "Sony Interactive Entertainment",
        synopsis: "Kratos and Atreus embark on a mythic journey for answers before Ragnarök arrives, venturing across each of the Nine Realms.",
        cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg",
        banner: "https://images.igdb.com/igdb/image/upload/t_1080p/co5s5v.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "The Witcher 3: Wild Hunt",
        altTitle: "ウィッチャー3 ワイルドハント",
        genres: ["RPG", "Open World", "Fantasy"],
        platforms: ["PC", "PS5", "Xbox", "Switch"],
        rating: 9.8,
        releaseYear: 2015,
        developer: "CD Projekt Red",
        publisher: "CD Projekt",
        synopsis: "Geralt of Rivia, a monster slayer for hire, journeys across a war-torn continent to locate Ciri, the Child of Prophecy.",
        cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_600x900.jpg",
        banner: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "Baldur's Gate 3",
        altTitle: "バルダーズ・ゲート3",
        genres: ["RPG", "Strategy", "Turn-Based"],
        platforms: ["PC", "PS5", "Xbox"],
        rating: 9.7,
        releaseYear: 2023,
        developer: "Larian Studios",
        publisher: "Larian Studios",
        synopsis: "Gather your party and return to the Forgotten Realms in a tale of fellowship, betrayal, survival, and the lure of ultimate power.",
        cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_600x900.jpg",
        banner: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "Red Dead Redemption 2",
        altTitle: "レッド・デッド・リンプション2",
        genres: ["Action", "Open World", "Adventure"],
        platforms: ["PC", "PS5", "Xbox"],
        rating: 9.7,
        releaseYear: 2018,
        developer: "Rockstar Games",
        publisher: "Rockstar Games",
        synopsis: "Arthur Morgan and the Van der Linde gang are outlaws on the run across America at the dawn of the modern age.",
        cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_600x900.jpg",
        banner: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "Valorant",
        altTitle: "ヴァロラント",
        genres: ["FPS", "Esports", "Action"],
        platforms: ["PC", "PS5", "Xbox"],
        rating: 8.8,
        releaseYear: 2020,
        developer: "Riot Games",
        publisher: "Riot Games",
        synopsis: "A 5v5 character-based tactical shooter where precise gunplay meets adaptive agent abilities.",
        cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mdf.jpg",
        banner: "https://images.igdb.com/igdb/image/upload/t_1080p/co2mdf.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "Genshin Impact",
        altTitle: "原神",
        genres: ["RPG", "Open World", "Action"],
        platforms: ["PC", "PS5", "Switch"],
        rating: 8.9,
        releaseYear: 2020,
        developer: "miHoYo",
        publisher: "HoYoverse",
        synopsis: "Step into Teyvat, a vast world teeming with elemental life and flowing with elemental energy, seeking your lost sibling.",
        cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2aon.jpg",
        banner: "https://images.igdb.com/igdb/image/upload/t_1080p/co2aon.jpg",
        isPopular: true,
        isTrending: true
    },
    {
        title: "Persona 5 Royal",
        altTitle: "ペルソナ5 ザ・ロイヤル",
        genres: ["RPG", "Turn-Based", "Slice of Life"],
        platforms: ["PC", "PS5", "Xbox", "Switch"],
        rating: 9.6,
        releaseYear: 2019,
        developer: "Atlus",
        publisher: "SEGA",
        synopsis: "Don the mask of Joker and join the Phantom Thieves of Hearts to break free from the chains of modern society and stage grand heists.",
        cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1687950/library_600x900.jpg",
        banner: "https://cdn.cloudflare.steamstatic.com/steam/apps/1687950/header.jpg",
        isPopular: true,
        isTrending: true
    }
]

async function runSeedGames() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campfire')
        console.log('Seed Games: Connected to MongoDB')

        await Game.deleteMany({})
        console.log('Cleared existing games collection')

        const inserted = await Game.insertMany(seedGames)
        console.log(`Successfully seeded ${inserted.length} games into database!`)
    } catch (err) {
        console.error('Seed Games error:', err)
    }
}

if (require.main === module) {
    runSeedGames().then(() => process.exit(0))
}

module.exports = { seedGames, runSeedGames }
