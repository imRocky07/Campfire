// run this once to populate the db: node server/seed.js
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Anime = require('./models/Anime')
const Message = require('./models/Message')

const animes = [
    { title: 'Attack on Titan', altTitle: 'Shingeki no Kyojin', genres: ['Action','Drama','Fantasy','Thriller'], rating: 9.0, episodes: 87, releaseStatus: 'Completed', year: 2013, studio: 'MAPPA / Wit Studio', synopsis: 'Humanity lives behind enormous walls to protect themselves from giant man-eating Titans. Young Eren Yeager swears to wipe out every Titan after his mother is killed right in front of him.', cover: 'https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=400&h=600&fit=crop', mediaType: 'TV', isTrending: true, isPopular: true },
    { title: 'Demon Slayer', altTitle: 'Kimetsu no Yaiba', genres: ['Action','Fantasy','Supernatural'], rating: 8.7, episodes: 44, releaseStatus: 'Ongoing', year: 2019, studio: 'ufotable', synopsis: 'Tanjiro Kamado becomes a demon slayer after his entire family is slaughtered and his sister Nezuko is turned into a demon. He sets out to find a cure and avenge his family.', cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop', mediaType: 'TV', isTrending: true, isPopular: true },
    { title: 'Jujutsu Kaisen', altTitle: '呪術廻戦', genres: ['Action','Supernatural','Horror'], rating: 8.6, episodes: 48, releaseStatus: 'Ongoing', year: 2020, studio: 'MAPPA', synopsis: 'Yuji Itadori swallows a cursed finger belonging to a powerful demon and becomes its host. He enrolls in a secret school to hunt down the remaining cursed fingers.', cover: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400&h=600&fit=crop', mediaType: 'TV', isTrending: true, isPopular: true },
    { title: 'One Piece', altTitle: 'ワンピース', genres: ['Action','Adventure','Comedy'], rating: 9.1, episodes: 1100, releaseStatus: 'Ongoing', year: 1999, studio: 'Toei Animation', synopsis: 'Monkey D. Luffy and his crew of pirates sail the Grand Line searching for the legendary treasure One Piece to make Luffy the King of the Pirates.', cover: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop', mediaType: 'TV', isPopular: true },
    { title: 'Fullmetal Alchemist: Brotherhood', altTitle: 'Hagane no Renkinjutsushi', genres: ['Action','Adventure','Drama'], rating: 9.1, episodes: 64, releaseStatus: 'Completed', year: 2009, studio: 'Bones', synopsis: 'After losing their bodies trying to resurrect their mother, brothers Edward and Alphonse Elric search for the Philosopher Stone to restore what they lost.', cover: 'https://images.unsplash.com/photo-1614583225154-5fcdda07019e?w=400&h=600&fit=crop', mediaType: 'TV', isPopular: true },
    { title: 'Spy x Family', altTitle: 'スパイファミリー', genres: ['Comedy','Action','Slice of Life'], rating: 8.5, episodes: 37, releaseStatus: 'Ongoing', year: 2022, studio: 'Wit Studio', synopsis: 'A spy codenamed Loid Forger must assemble a fake family for a mission. He adopts a girl who is secretly a telepath and marries a woman who is secretly an assassin.', cover: 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=400&h=600&fit=crop', mediaType: 'TV', isTrending: true, isPopular: true },
    { title: 'Hunter x Hunter', altTitle: 'ハンター×ハンター', genres: ['Action','Adventure','Fantasy'], rating: 9.0, episodes: 148, releaseStatus: 'Completed', year: 2011, studio: 'Madhouse', synopsis: 'Gon Freecss sets out to become a Hunter like his absent father. He makes friends along the way but discovers the darker side of the Hunter world.', cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=600&fit=crop', mediaType: 'TV', isPopular: true },
    { title: 'Vinland Saga', altTitle: 'ヴィンランド・サガ', genres: ['Action','Adventure','Drama'], rating: 8.8, episodes: 48, releaseStatus: 'Completed', year: 2019, studio: 'Wit Studio', synopsis: 'Thorfinn grows up dreaming of Vinland, a land of peace. But first he must survive the brutal Viking world and confront what true strength means.', cover: 'https://images.unsplash.com/photo-1531306760382-64cf4a2c64eb?w=400&h=600&fit=crop', mediaType: 'TV', isTrending: true },
    { title: 'Chainsaw Man', altTitle: 'チェンソーマン', genres: ['Action','Horror','Supernatural'], rating: 8.5, episodes: 12, releaseStatus: 'Ongoing', year: 2022, studio: 'MAPPA', synopsis: 'Denji, a young devil hunter drowning in debt, merges with his devil dog Pochita and becomes Chainsaw Man — a hybrid with chainsaws for arms and a head.', cover: 'https://images.unsplash.com/photo-1562788869-4ed32648eb72?w=400&h=600&fit=crop', mediaType: 'TV', isTrending: true },
    { title: 'Death Note', altTitle: 'デスノート', genres: ['Mystery','Psychological','Thriller'], rating: 8.6, episodes: 37, releaseStatus: 'Completed', year: 2006, studio: 'Madhouse', synopsis: 'High school student Light Yagami finds a mysterious notebook that kills anyone whose name is written in it. He begins a secret crusade to rid the world of criminals.', cover: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop', mediaType: 'TV', isPopular: true },
    { title: 'Steins;Gate', altTitle: 'シュタインズ・ゲート', genres: ['Sci-Fi','Thriller','Drama'], rating: 9.1, episodes: 24, releaseStatus: 'Completed', year: 2011, studio: 'White Fox', synopsis: 'Self-proclaimed mad scientist Rintaro Okabe accidentally discovers time travel with a microwave. Changing the past sets off a chain of devastating consequences.', cover: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=600&fit=crop', mediaType: 'TV', isPopular: true },
    { title: 'Neon Genesis Evangelion', altTitle: '新世紀エヴァンゲリオン', genres: ['Mecha','Psychological','Sci-Fi'], rating: 8.5, episodes: 26, releaseStatus: 'Completed', year: 1995, studio: 'Gainax', synopsis: 'Teenager Shinji Ikari is drafted by his estranged father to pilot a giant biomechanical robot called an Evangelion to fight against monstrous beings known as Angels.', cover: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=600&fit=crop', mediaType: 'TV', isPopular: true }
]

async function runSeed() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('db connected')

        // wipe everything first
        await User.deleteMany({})
        await Anime.deleteMany({})
        await Message.deleteMany({})
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

        // add the anime
        const animeList = await Anime.insertMany(animes)
        console.log(`added ${animeList.length} anime`)

        // seed some chat messages so the community page isnt empty
        const seedChat = [
            { room: 'general', sender: users[0]._id, body: 'anyone else hyped for the new demon slayer arc?? 🔥' },
            { room: 'general', sender: users[1]._id, body: 'mappa has been going crazy lately, jjk s2 was insane' },
            { room: 'general', sender: users[2]._id, body: 'just finished vinland saga season 2... not okay 😭' },
            { room: 'general', sender: users[3]._id, body: 'fmab is still goat material. no debate' },
            { room: 'general', sender: users[0]._id, body: 'the aot finale hit me different ngl still processing it' }
        ]
        await Message.insertMany(seedChat)

        console.log('done!')
        console.log('admin login: admin@campfire.app / admin123')
        console.log('user login:  sakura@campfire.app / demo123')
        process.exit(0)
    } catch(err) {
        console.error('seed failed:', err)
        process.exit(1)
    }
}

runSeed()
