// run this to populate the db with HD high-res images and exact updated episode counts: node server/seed.js
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Anime = require('./models/Anime')
const Message = require('./models/Message')

const animes = [
    {
        title: "Frieren: Beyond Journey's End",
        altTitle: "Sousou no Frieren",
        genres: ["Fantasy", "Adventure", "Drama"],
        rating: 9.35,
        episodes: 28,
        releaseStatus: "Completed",
        year: 2023,
        studio: "Madhouse",
        synopsis: "Elf mage Frieren and her courageous fellow adventurers have defeated the Demon King and brought peace to the land. But Frieren must watch her companions age and pass away while she lives on. She embarks on a new journey to understand humanity and honor past memories.",
        cover: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
        mediaType: "TV",
        isTrending: true,
        isPopular: true,
        trendingRank: 1
    },
    {
        title: "Solo Leveling",
        altTitle: "Ore dake Level Up na Ken",
        genres: ["Action", "Fantasy", "Supernatural"],
        rating: 8.51,
        episodes: 12,
        releaseStatus: "Ongoing",
        year: 2024,
        studio: "A-1 Pictures",
        synopsis: "In a world where hunters battle deadly monsters, Sung Jinwoo is known as the weakest hunter of all mankind. After a mysterious double dungeon tragedy, a quest window grants him the unique ability to level up infinitely.",
        cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-it355ZgzquUd.png",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg",
        mediaType: "TV",
        isTrending: true,
        isPopular: true,
        trendingRank: 2
    },
    {
        title: "Demon Slayer: Kimetsu no Yaiba",
        altTitle: "Kimetsu no Yaiba",
        genres: ["Action", "Fantasy", "Supernatural"],
        rating: 8.85,
        episodes: 63,
        releaseStatus: "Ongoing",
        year: 2019,
        studio: "ufotable",
        synopsis: "Tanjiro Kamado becomes a demon slayer after his family is slaughtered and his sister Nezuko is turned into a demon. He embarks on a perilous quest for a cure while battling the Demon King Muzan Kibutsuji.",
        cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhRQA2guER.jpg",
        mediaType: "TV",
        isTrending: true,
        isPopular: true,
        trendingRank: 3
    },
    {
        title: "Attack on Titan",
        altTitle: "Shingeki no Kyojin",
        genres: ["Action", "Drama", "Fantasy", "Mystery"],
        rating: 9.10,
        episodes: 89,
        releaseStatus: "Completed",
        year: 2013,
        studio: "MAPPA / Wit Studio",
        synopsis: "Humanity retreats behind giant concentric walls to protect themselves from man-eating Titans. Young Eren Yeager vows to exterminate every Titan after a colossal Titan breach destroys his hometown.",
        cover: "https://cdn.myanimelist.net/images/anime/1000/110531l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1000/110531l.jpg",
        mediaType: "TV",
        isTrending: true,
        isPopular: true,
        trendingRank: 4
    },
    {
        title: "Jujutsu Kaisen",
        altTitle: "呪術廻戦",
        genres: ["Action", "Supernatural", "Horror"],
        rating: 8.75,
        episodes: 47,
        releaseStatus: "Ongoing",
        year: 2020,
        studio: "MAPPA",
        synopsis: "High schooler Yuji Itadori ingests a cursed finger belonging to Ryomen Sukuna, the King of Curses. Enrolling at Tokyo Jujutsu High, he trains under Satoru Gojo to track down all cursed fingers.",
        cover: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg",
        mediaType: "TV",
        isTrending: true,
        isPopular: true,
        trendingRank: 5
    },
    {
        title: "One Piece",
        altTitle: "ワンピース",
        genres: ["Action", "Adventure", "Fantasy", "Comedy"],
        rating: 8.92,
        episodes: 1122,
        releaseStatus: "Ongoing",
        year: 1999,
        studio: "Toei Animation",
        synopsis: "Monkey D. Luffy and his Straw Hat Pirates sail the treacherous Grand Line in search of Gol D. Roger's ultimate treasure, the One Piece, aiming to claim the crown of Pirate King.",
        cover: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg",
        mediaType: "TV",
        isTrending: true,
        isPopular: true,
        trendingRank: 6
    },
    {
        title: "Fullmetal Alchemist: Brotherhood",
        altTitle: "Hagane no Renkinjutsushi",
        genres: ["Action", "Adventure", "Drama", "Fantasy"],
        rating: 9.10,
        episodes: 64,
        releaseStatus: "Completed",
        year: 2009,
        studio: "Bones",
        synopsis: "Two brothers, Edward and Alphonse Elric, suffer tragic body loss during a forbidden alchemical ritual. They join the State Military to search for the legendary Philosopher's Stone.",
        cover: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Bleach: Thousand-Year Blood War",
        altTitle: "BLEACH 千年血戦篇",
        genres: ["Action", "Supernatural", "Fantasy"],
        rating: 8.90,
        episodes: 26,
        releaseStatus: "Ongoing",
        year: 2022,
        studio: "Studio Pierrot",
        synopsis: "Substitute Soul Reaper Ichigo Kurosaki enters the ultimate war as Yhwach, King of the Quincy, launches a catastrophic invasion against the Soul Society.",
        cover: "https://cdn.myanimelist.net/images/anime/1764/126627l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1764/126627l.jpg",
        mediaType: "TV",
        isTrending: true,
        trendingRank: 7
    },
    {
        title: "Chainsaw Man",
        altTitle: "チェンソーマン",
        genres: ["Action", "Horror", "Supernatural"],
        rating: 8.52,
        episodes: 12,
        releaseStatus: "Ongoing",
        year: 2022,
        studio: "MAPPA",
        synopsis: "Denji, a desperate devil hunter, merges with his chainsaw devil pet Pochita. Recruited by Makima into the Public Safety Devil Hunters, he fights terrifying devil threats.",
        cover: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg",
        mediaType: "TV",
        isTrending: true,
        trendingRank: 8
    },
    {
        title: "Vinland Saga",
        altTitle: "ヴィンランド・サガ",
        genres: ["Action", "Adventure", "Drama"],
        rating: 8.88,
        episodes: 48,
        releaseStatus: "Completed",
        year: 2019,
        studio: "MAPPA / Wit Studio",
        synopsis: "Raised among ruthless Viking mercenaries, Thorfinn lives solely to avenge his father's murder by Askeladd. Over time, he struggles to find redemption and true peace.",
        cover: "https://cdn.myanimelist.net/images/anime/1506/138982l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1506/138982l.jpg",
        mediaType: "TV",
        isTrending: true,
        trendingRank: 9
    },
    {
        title: "Spy x Family",
        altTitle: "スパイファミリー",
        genres: ["Comedy", "Action", "Slice of Life"],
        rating: 8.54,
        episodes: 37,
        releaseStatus: "Ongoing",
        year: 2022,
        studio: "Wit Studio / CloverWorks",
        synopsis: "Master spy Twilight adopts telepath Anya and marries assassin Yor under the alias Loid Forger. Together, they navigate daily domestic life while keeping their true identities secret.",
        cover: "https://cdn.myanimelist.net/images/anime/1441/122795l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1441/122795l.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "My Hero Academia",
        altTitle: "Boku no Hero Academia",
        genres: ["Action", "Superhero", "Fantasy"],
        rating: 8.42,
        episodes: 159,
        releaseStatus: "Ongoing",
        year: 2016,
        studio: "Bones",
        synopsis: "In a world where 80% of humans possess superpowers known as Quirks, Quirkless teenager Izuku Midoriya inherits the legendary One For All power from All Might.",
        cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Hunter x Hunter (2011)",
        altTitle: "ハンター×ハンター",
        genres: ["Action", "Adventure", "Fantasy"],
        rating: 9.04,
        episodes: 148,
        releaseStatus: "Completed",
        year: 2011,
        studio: "Madhouse",
        synopsis: "Young Gon Freecss enters the brutal Hunter Examination to find his missing father Ging. Alongside Killua, Kurapika, and Leorio, he faces dangerous Chimera Ants and deadly foes.",
        cover: "https://cdn.myanimelist.net/images/anime/1337/99013l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1337/99013l.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Cyberpunk: Edgerunners",
        altTitle: "サイバーパンク エッジランナーズ",
        genres: ["Sci-Fi", "Action", "Cyberpunk"],
        rating: 8.61,
        episodes: 10,
        releaseStatus: "Completed",
        year: 2022,
        studio: "Trigger",
        synopsis: "In dystopian Night City, street kid David Martinez equips a high-grade military cybernetic implant to survive, becoming a mercenary outlaw known as an Edgerunner.",
        cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx120377-ayZPoxiWt4Li.jpg",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx120377-ayZPoxiWt4Li.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Steins;Gate",
        altTitle: "シュタインズ・ゲート",
        genres: ["Sci-Fi", "Thriller", "Drama"],
        rating: 9.07,
        episodes: 24,
        releaseStatus: "Completed",
        year: 2011,
        studio: "White Fox",
        synopsis: "Eccentric scientist Rintaro Okabe accidentallyinvents a time-travel microwave capable of sending text messages to the past, triggering chaotic timeline consequences.",
        cover: "https://cdn.myanimelist.net/images/anime/1935/127974l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1935/127974l.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Death Note",
        altTitle: "デスノート",
        genres: ["Mystery", "Psychological", "Thriller"],
        rating: 8.62,
        episodes: 37,
        releaseStatus: "Completed",
        year: 2006,
        studio: "Madhouse",
        synopsis: "Genius student Light Yagami discovers a Shinigami notebook capable of killing anyone written within it. He launches a vigilante crusade under the moniker Kira.",
        cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Horimiya",
        altTitle: "ホリミヤ",
        genres: ["Romance", "Comedy", "Slice of Life"],
        rating: 8.20,
        episodes: 13,
        releaseStatus: "Completed",
        year: 2021,
        studio: "CloverWorks",
        synopsis: "A secret life is the one thing they have in common. At school, Kyouko Hori is an ultra-popular high school girl, while Izumi Miyamura is a gloomy otaku. Outside of school, Hori is a homebody who looks after her younger brother, and Miyamura is a gentle guy covered in piercings and tattoos. When they discover each other's secrets, a sweet romance unfolds.",
        cover: "https://cdn.myanimelist.net/images/anime/1695/111486l.jpg",
        banner: "https://cdn.myanimelist.net/images/anime/1695/111486l.jpg",
        mediaType: "TV",
        isPopular: true
    },
    {
        title: "Horimiya: The Missing Pieces",
        altTitle: "Horimiya: Piece",
        genres: ["Romance", "Comedy", "Slice of Life"],
        rating: 8.24,
        episodes: 13,
        releaseStatus: "Completed",
        year: 2023,
        studio: "CloverWorks",
        synopsis: "Adapted popular manga chapters that were not included in the original Horimiya anime adaptation, chronicling sweet and hilarious moments in Hori and Miyamura's school life.",
        cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx163132-C220CO5UrTxY.jpg",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx163132-C220CO5UrTxY.jpg",
        mediaType: "TV",
        isPopular: true
    }
]

const Watchlist = require('./models/Watchlist')
const Friend = require('./models/Friend')

async function runSeed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campfire')
        console.log('db connected')

        // wipe old database records
        await User.deleteMany({})
        await Anime.deleteMany({})
        await Message.deleteMany({})
        await Watchlist.deleteMany({})
        await Friend.deleteMany({})
        console.log('cleared old data')

        // make admin
        const admin = await User.create({
            username: 'Admin',
            email: 'admin@campfire.app',
            password: 'admin123',
            role: 'admin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminCF',
            status: 'online'
        })

        // make regular users
        const users = await User.create([
            { username: 'SakuraMoon', email: 'sakura@campfire.app', password: 'demo123', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SakuraMoon', bio: 'anime enthusiast 🌸', status: 'online' },
            { username: 'OtakuKing99', email: 'otaku@campfire.app', password: 'demo123', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=OtakuKing99', bio: 'shonen is life', status: 'online' },
            { username: 'AniWatcher', email: 'ani@campfire.app', password: 'demo123', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AniWatcher', bio: '500+ completed 👀', status: 'away' },
            { username: 'MangaLover', email: 'manga@campfire.app', password: 'demo123', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MangaLover', bio: 'manga > anime', status: 'offline' }
        ])

        const sakura = users[0]
        const otaku  = users[1]
        const ani    = users[2]
        const manga  = users[3]

        // add the anime with exact episode count and HD images
        const animeList = await Anime.insertMany(animes)
        console.log(`added ${animeList.length} anime with HD posters and exact episode counts!`)

        // Helper map for fast lookup by title
        const animeMap = {}
        animeList.forEach(a => { animeMap[a.title] = a._id })

        // Watchlist seeding for SakuraMoon
        const sakuraWatchlist = [
            { user: sakura._id, anime: animeMap["Frieren: Beyond Journey's End"], watchStatus: 'completed', ep_progress: 28, userRating: 5 },
            { user: sakura._id, anime: animeMap["Solo Leveling"], watchStatus: 'completed', ep_progress: 12, userRating: 5 },
            { user: sakura._id, anime: animeMap["Demon Slayer: Kimetsu no Yaiba"], watchStatus: 'watching', ep_progress: 42, userRating: 5 },
            { user: sakura._id, anime: animeMap["Jujutsu Kaisen"], watchStatus: 'watching', ep_progress: 30, userRating: 4.5 },
            { user: sakura._id, anime: animeMap["Attack on Titan"], watchStatus: 'completed', ep_progress: 89, userRating: 5 },
            { user: sakura._id, anime: animeMap["Spy x Family"], watchStatus: 'plan_to_watch', ep_progress: 0, userRating: 0 },
            { user: sakura._id, anime: animeMap["Chainsaw Man"], watchStatus: 'watching', ep_progress: 8, userRating: 4 },
            { user: sakura._id, anime: animeMap["Steins;Gate"], watchStatus: 'completed', ep_progress: 24, userRating: 5 },
            
            // Watchlists for other demo users to power AI recommendations
            { user: otaku._id, anime: animeMap["Solo Leveling"], watchStatus: 'watching', ep_progress: 10, userRating: 5 },
            { user: otaku._id, anime: animeMap["Jujutsu Kaisen"], watchStatus: 'completed', ep_progress: 47, userRating: 5 },
            { user: otaku._id, anime: animeMap["One Piece"], watchStatus: 'watching', ep_progress: 1090, userRating: 5 },
            { user: otaku._id, anime: animeMap["My Hero Academia"], watchStatus: 'watching', ep_progress: 140, userRating: 4.5 },
            
            { user: ani._id, anime: animeMap["Frieren: Beyond Journey's End"], watchStatus: 'completed', ep_progress: 28, userRating: 5 },
            { user: ani._id, anime: animeMap["Hunter x Hunter (2011)"], watchStatus: 'completed', ep_progress: 148, userRating: 5 },
            { user: ani._id, anime: animeMap["Vinland Saga"], watchStatus: 'completed', ep_progress: 48, userRating: 5 },
            { user: ani._id, anime: animeMap["Fullmetal Alchemist: Brotherhood"], watchStatus: 'completed', ep_progress: 64, userRating: 5 }
        ]
        await Watchlist.insertMany(sakuraWatchlist)
        console.log(`seeded watchlists for SakuraMoon and community members!`)

        // Friend connections for SakuraMoon
        const friendConnections = [
            { from: sakura._id, to: otaku._id, accepted: true },
            { from: sakura._id, to: ani._id, accepted: true },
            { from: sakura._id, to: manga._id, accepted: true },
            { from: admin._id, to: sakura._id, accepted: true }
        ]
        await Friend.insertMany(friendConnections)
        console.log(`seeded friend connections!`)

        // Global community chat messages
        const seedChat = [
            { room: 'general', sender: sakura._id, body: 'anyone else hyped for the new demon slayer arc?? 🔥' },
            { room: 'general', sender: otaku._id, body: 'mappa has been going crazy lately, jjk s2 was insane' },
            { room: 'general', sender: ani._id, body: 'just finished frieren season 1... absolute masterpiece 😭' },
            { room: 'general', sender: manga._id, body: 'fmab is still goat material. no debate' },
            { room: 'general', sender: sakura._id, body: 'the aot finale hit me different ngl still processing it' },
            { room: 'general', sender: admin._id, body: 'Welcome to Campfire everyone! Enjoy chatting and exploring your anime lists.' },
            { room: 'general', sender: otaku._id, body: 'Solo leveling animation in episode 6 was absolute peak!' },
            { room: 'general', sender: sakura._id, body: "Frieren's soundtrack is living rent free in my head 🎵" },
            { room: 'general', sender: manga._id, body: 'Wait until you read the manga chapters after season 1!' },
            { room: 'general', sender: ani._id, body: 'Count me in! Adding Solo Leveling to my watchlist right now.' }
        ]
        await Message.insertMany(seedChat)
        console.log(`seeded global chat messages!`)

        console.log('Seed process finished successfully!')
        process.exit(0)
    } catch(err) {
        console.error('seed failed:', err)
        process.exit(1)
    }
}

runSeed()
