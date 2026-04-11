// app.js - main frontend logic
// handles all page rendering, events, state etc

// ─── global state ─────────────────────────────────────────────
let currentUser     = null
let allAnime        = []
let myWatchlist     = []
let currentDetailAnime = null
let currentHeroAnime   = null
let prevPage        = 'home'
let currentRoom     = 'general'
let currentFrTab    = 'all'
let allFriends      = []
let incomingRequests = []
let sentRequests    = []
let discoverUsers   = []
let admAnimeAll     = []
let admUsersAll     = []
let admMsgsAll      = []
let admUserFilter   = 'all'
let pendingDelId    = null
let amGenres        = []
let authMode        = 'login'

// quote rotation for login page
const quotes = [
    'Every great anime journey begins around a campfire.',
    'Where fans gather, stories ignite.',
    'Your watchlist. Your community. Your flame.',
    'From shonen to slice of life — it all starts here.'
]
let qIdx = 0

// ─── init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    startQuoteRotation()

    const token = localStorage.getItem('cf_token')
    if (!token) {
        showLogin()
        return
    }

    // validate token
    const res = await api.getMe()
    if (!res.ok) {
        localStorage.removeItem('cf_token')
        showLogin()
        return
    }

    currentUser = res.user
    if (currentUser.role === 'admin') {
        showAdmin()
    } else {
        showApp()
    }
})

// ─── auth flow ────────────────────────────────────────────────
function showLogin() {
    document.getElementById('login-pg').classList.remove('hidden')
    document.getElementById('app-wrap').classList.add('hidden')
    document.getElementById('admin-wrap').classList.add('hidden')
    document.getElementById('navbar').classList.add('hidden')
}

async function showApp() {
    document.getElementById('login-pg').classList.add('hidden')
    document.getElementById('admin-wrap').classList.add('hidden')
    document.getElementById('app-wrap').classList.remove('hidden')
    document.getElementById('navbar').classList.remove('hidden')

    // fill navbar user info
    document.getElementById('nav-avt').src  = currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`
    document.getElementById('dd-name').textContent  = currentUser.username
    document.getElementById('dd-email').textContent = currentUser.email

    // load everything in parallel
    await Promise.all([loadAllAnime(), loadWatchlist()])
    renderHome()
    loadFriendsBadge()
}

function showAdmin() {
    document.getElementById('login-pg').classList.add('hidden')
    document.getElementById('app-wrap').classList.add('hidden')
    document.getElementById('navbar').classList.add('hidden')
    document.getElementById('admin-wrap').classList.remove('hidden')

    document.getElementById('adm-uname').textContent = currentUser.username
    document.getElementById('adm-avt').src = currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`

    admReload()
}

// switch between login / register modes
function switchAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login'

    const isReg = authMode === 'register'
    document.getElementById('lcard-title').textContent    = isReg ? 'Join Campfire 🔥' : 'Welcome back 👋'
    document.getElementById('lcard-sub').textContent      = isReg ? 'Create your account' : 'Sign in to your account'
    document.getElementById('auth-btn').textContent       = isReg ? 'Create Account →' : 'Sign In →'
    document.getElementById('lswitch-txt').textContent    = isReg ? 'Have an account? ' : 'New to Campfire? '
    document.getElementById('lswitch-link').textContent   = isReg ? 'Sign in' : 'Create account'
    document.getElementById('email-label').textContent    = isReg ? 'Email' : 'Email or Username'
    document.getElementById('inp-email').placeholder      = isReg ? 'you@example.com' : 'email or username'

    document.getElementById('reg-username-field').classList.toggle('hidden', !isReg)
    document.getElementById('reg-confirm-field').classList.toggle('hidden', !isReg)
    document.getElementById('demo-box').classList.toggle('hidden', isReg)

    // clear fields and errors
    document.getElementById('inp-username').value = ''
    document.getElementById('inp-email').value    = ''
    document.getElementById('inp-pass').value     = ''
    document.getElementById('inp-confirm').value  = ''
    setAuthErr('')
}

async function doAuth() {
    const btn = document.getElementById('auth-btn')
    const email   = document.getElementById('inp-email').value.trim()
    const pass    = document.getElementById('inp-pass').value

    if (!email || !pass) { setAuthErr('fill in all fields'); return }

    setBtnLoading(btn, true)
    setAuthErr('')

    let res

    if (authMode === 'register') {
        const username = document.getElementById('inp-username').value.trim()
        const confirm  = document.getElementById('inp-confirm').value

        if (!username) { setAuthErr('enter a username'); setBtnLoading(btn, false); return }
        if (pass !== confirm) { setAuthErr("passwords don't match"); setBtnLoading(btn, false); return }

        res = await api.register(username, email, pass)
    } else {
        res = await api.login(email, pass)
    }

    setBtnLoading(btn, false)

    if (!res.ok) {
        setAuthErr(res.msg || 'something went wrong')
        return
    }

    localStorage.setItem('cf_token', res.token)
    currentUser = res.user

    if (currentUser.role === 'admin') {
        showAdmin()
    } else {
        showApp()
    }
}

function setAuthErr(msg) {
    const el = document.getElementById('auth-err')
    if (!msg) { el.classList.add('hidden'); el.textContent = ''; return }
    el.textContent = msg
    el.classList.remove('hidden')
}

async function logout() {
    await api.logout()
    localStorage.removeItem('cf_token')
    currentUser  = null
    allAnime     = []
    myWatchlist  = []
    currentRoom  = 'general'
    showLogin()
}

// ─── password toggle ──────────────────────────────────────────
function togglePw(inputId, btn) {
    const inp = document.getElementById(inputId)
    if (inp.type === 'password') {
        inp.type = 'text'
        btn.textContent = 'hide'
    } else {
        inp.type = 'password'
        btn.textContent = 'show'
    }
}

// ─── quote rotation ───────────────────────────────────────────
function startQuoteRotation() {
    renderQuoteDots()
    setInterval(() => {
        qIdx = (qIdx + 1) % quotes.length
        const el = document.getElementById('quote-txt')
        if (el) el.textContent = quotes[qIdx]
        renderQuoteDots()
    }, 4200)
}

function renderQuoteDots() {
    const c = document.getElementById('qdots')
    if (!c) return
    c.innerHTML = quotes.map((_, i) =>
        `<span class="qdot ${i===qIdx?'on':''}" onclick="setQuote(${i})"></span>`
    ).join('')
}

function setQuote(i) {
    qIdx = i
    const el = document.getElementById('quote-txt')
    if (el) el.textContent = quotes[i]
    renderQuoteDots()
}

// ─── page navigation ──────────────────────────────────────────
function goPage(name) {
    if (name !== 'detail') prevPage = name

    // update nav link active states
    document.querySelectorAll('.nl').forEach(l => {
        l.classList.toggle('on', l.dataset.page === name)
    })

    // hide all pages, show target
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    const target = document.getElementById('pg-' + name)
    if (target) target.classList.add('active')

    // lazy load each page
    if (name === 'discover')  renderDiscover()
    if (name === 'watchlist') renderWatchlistPage()
    if (name === 'community') loadCommunity()
    if (name === 'friends')   loadFriends()

    // scroll to top
    window.scrollTo(0, 0)
    closeMobMenu()
}

function goBack() {
    goPage(prevPage || 'home')
}

// ─── navbar helpers ───────────────────────────────────────────
function toggleDD() {
    document.getElementById('nav-dd').classList.toggle('open')
}

// close dropdown when clicking outside
document.addEventListener('click', e => {
    const dd   = document.getElementById('nav-dd')
    const avt  = document.getElementById('nav-avt')
    if (dd && avt && !dd.contains(e.target) && e.target !== avt) {
        dd.classList.remove('open')
    }
})

function toggleMobMenu() {
    document.getElementById('mob-menu').classList.toggle('open')
}

function closeMobMenu() {
    document.getElementById('mob-menu').classList.remove('open')
}

// ─── data loading ─────────────────────────────────────────────
async function loadAllAnime() {
    const res = await api.getAnime()
    if (res.ok) allAnime = res.data
}

async function loadWatchlist() {
    const res = await api.getWatchlist()
    if (res.ok) myWatchlist = res.data
}

// ─── HOME PAGE ────────────────────────────────────────────────
function renderHome() {
    if (!allAnime.length) return

    // hero = first trending anime
    const hero = allAnime.find(a => a.isTrending) || allAnime[0]
    currentHeroAnime = hero

    document.getElementById('hero-bg').style.backgroundImage = `url('${hero.cover}')`
    document.getElementById('hero-title').textContent = hero.title
    document.getElementById('hero-alt').textContent   = hero.altTitle || ''

    // meta pills
    const metaEl = document.getElementById('hero-meta')
    metaEl.innerHTML = `<span class="hero-rating">★ ${hero.rating}</span>`
    ;(hero.genres || []).slice(0, 3).forEach(g => {
        metaEl.innerHTML += `<span class="pill">${g}</span>`
    })
    metaEl.innerHTML += `<span style="font-size:12px;color:var(--txt3)">${hero.episodes} eps</span>`

    document.getElementById('hero-desc').textContent = (hero.synopsis || '').substring(0, 180) + '...'

    // watchlist button state
    const inList = myWatchlist.find(e => e.anime && e.anime._id === hero._id)
    const wlBtn  = document.getElementById('hero-wl-btn')
    if (inList) {
        wlBtn.textContent = '✓ In Watchlist'
        wlBtn.style.color = '#4ade80'
    } else {
        wlBtn.textContent = '+ Add to Watchlist'
        wlBtn.style.color = ''
    }

    // mini cards top right
    const minisEl = document.getElementById('hero-minis')
    const trendingOthers = allAnime.filter(a => a.isTrending && a._id !== hero._id).slice(0, 3)
    minisEl.innerHTML = trendingOthers.map(a => `
        <div class="hero-mini" onclick="openDetail(${JSON.stringify(a).replace(/"/g, '&quot;')})">
            <img src="${a.cover}" alt="${a.title}" onerror="this.src='https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=60'">
            <div><div class="hmini-title">${a.title}</div><div class="hmini-rat">★ ${a.rating}</div></div>
        </div>
    `).join('')

    // stat counter
    document.getElementById('stat-anime').textContent = allAnime.length + '+'

    // trending section
    const trending = allAnime.filter(a => a.isTrending).slice(0, 6)
    renderAnimeGrid('trending-grid', trending)

    // genre cards
    renderGenreCards()

    // popular
    const popular = allAnime.filter(a => a.isPopular).slice(0, 8)
    renderAnimeGrid('popular-grid', popular)

    // top rated list
    const topRated = [...allAnime].sort((a, b) => b.rating - a.rating).slice(0, 6)
    renderTopList(topRated)
}

function heroAddWatchlist() {
    if (!currentHeroAnime) return
    addToWlById(currentHeroAnime._id, 'plan_to_watch', () => {
        document.getElementById('hero-wl-btn').textContent = '✓ In Watchlist'
        document.getElementById('hero-wl-btn').style.color = '#4ade80'
        toast('Added to watchlist', 'ok')
    })
}

// ─── GENRE CARDS ─────────────────────────────────────────────
const genreColors = {
    Action:       'linear-gradient(135deg,#ea580c,#dc2626)',
    Adventure:    'linear-gradient(135deg,#0ea5e9,#1d4ed8)',
    Comedy:       'linear-gradient(135deg,#f59e0b,#d97706)',
    Drama:        'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    Fantasy:      'linear-gradient(135deg,#06b6d4,#0284c7)',
    Horror:       'linear-gradient(135deg,#374151,#111827)',
    Mecha:        'linear-gradient(135deg,#475569,#334155)',
    Mystery:      'linear-gradient(135deg,#7c3aed,#4c1d95)',
    Psychological:'linear-gradient(135deg,#7e22ce,#4a044e)',
    Romance:      'linear-gradient(135deg,#ec4899,#be185d)',
    'Sci-Fi':     'linear-gradient(135deg,#14b8a6,#0f766e)',
    'Slice of Life':'linear-gradient(135deg,#22c55e,#15803d)',
    Sports:       'linear-gradient(135deg,#f97316,#b45309)',
    Supernatural: 'linear-gradient(135deg,#a855f7,#7c3aed)',
    Thriller:     'linear-gradient(135deg,#ef4444,#991b1b)'
}

function renderGenreCards() {
    const genres = ['Action','Romance','Psychological','Fantasy','Sci-Fi','Horror','Supernatural','Comedy']
    const el = document.getElementById('genre-grid')
    el.innerHTML = genres.map(g => {
        const count = allAnime.filter(a => (a.genres || []).includes(g)).length
        const bg = genreColors[g] || 'linear-gradient(135deg,#374151,#1f2937)'
        return `
            <div class="gcrd" style="background:${bg}" onclick="goPageWithGenre('${g}')">
                <div class="gname">${g}</div>
                <div class="gcnt">${count} anime</div>
            </div>
        `
    }).join('')
}

function goPageWithGenre(genre) {
    goPage('discover')
    setTimeout(() => {
        document.getElementById('disc-genre').value = genre
        filterDiscover()
    }, 50)
}

// ─── ANIME GRID RENDERER ──────────────────────────────────────
function renderAnimeGrid(containerId, list) {
    const el = document.getElementById(containerId)
    if (!el) return

    if (!list.length) {
        el.innerHTML = '<p style="color:var(--txt3);font-size:13px">Nothing here yet</p>'
        return
    }

    el.innerHTML = list.map(a => animeCardHTML(a)).join('')
}

function animeCardHTML(a) {
    const inList = myWatchlist.find(e => e.anime && e.anime._id === a._id)
    const fallback = 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=400&h=600&fit=crop'

    return `
        <div class="acard" onclick="openDetail(${escJSON(a)})">
            <div class="acard-img">
                <img src="${a.cover || fallback}" alt="${a.title}" onerror="this.src='${fallback}'">
                <div class="acard-overlay"></div>
                ${a.isTrending ? '<span class="acard-badge">🔥</span>' : ''}
                <div class="acard-rating"><span class="s">★</span>${a.rating}</div>
                ${inList ? '<div class="wl-dot"></div>' : ''}
                <div class="acard-info">
                    <div class="acard-title">${a.title}</div>
                    <div class="acard-genre">${(a.genres || []).join(', ')}</div>
                </div>
            </div>
        </div>
    `
}

// safe json for html attributes
function escJSON(obj) {
    return JSON.stringify(obj).replace(/"/g, '&quot;')
}

function renderTopList(list) {
    const el = document.getElementById('top-list')
    if (!el) return
    el.innerHTML = list.map((a, i) => {
        const fallback = 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=100'
        return `
            <div class="titem" onclick="openDetail(${escJSON(a)})">
                <div class="trank">${i + 1}</div>
                <img class="timg" src="${a.cover || fallback}" alt="${a.title}" onerror="this.src='${fallback}'">
                <div class="tinfo">
                    <div class="ttitle">${a.title}</div>
                    <div class="tstudio">${a.studio || ''}</div>
                    <div class="tmeta">
                        <span class="trat">★ ${a.rating}</span>
                        <span class="teps">${a.episodes} eps</span>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// ─── DISCOVER PAGE ────────────────────────────────────────────
function renderDiscover() {
    filterDiscover()
}

function filterDiscover() {
    const search = (document.getElementById('disc-search')?.value || '').toLowerCase()
    const genre  = document.getElementById('disc-genre')?.value || 'All'
    const status = document.getElementById('disc-status')?.value || 'All'
    const sort   = document.getElementById('disc-sort')?.value || 'rating'

    let list = [...allAnime]

    if (search) list = list.filter(a => a.title.toLowerCase().includes(search))
    if (genre  !== 'All') list = list.filter(a => (a.genres || []).includes(genre))
    if (status !== 'All') list = list.filter(a => a.releaseStatus === status)

    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
    else if (sort === 'year') list.sort((a, b) => (b.year || 0) - (a.year || 0))
    else if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))

    document.getElementById('disc-count').textContent = `${list.length} anime found`
    renderAnimeGrid('disc-grid', list)
}

// ─── ANIME DETAIL ─────────────────────────────────────────────
function openDetail(anime) {
    // anime can be an object or get passed as-is from onclick
    if (typeof anime === 'string') {
        try { anime = JSON.parse(anime) } catch { return }
    }

    currentDetailAnime = anime
    prevPage = document.querySelector('.page.active')?.id?.replace('pg-', '') || 'home'

    // banner + cover
    const banner = document.getElementById('d-banner')
    banner.src = anime.banner || anime.cover || ''
    banner.onerror = () => { banner.src = anime.cover || '' }
    document.getElementById('d-cover').src = anime.cover || ''
    document.getElementById('d-title').textContent = anime.title
    document.getElementById('d-alt').textContent   = anime.altTitle || ''

    // tags
    const tagsEl = document.getElementById('d-tags')
    tagsEl.innerHTML = `<span class="hero-rating">★ ${anime.rating}</span>`
    ;(anime.genres || []).forEach(g => tagsEl.innerHTML += `<span class="pill">${g}</span>`)
    const sColor = anime.releaseStatus === 'Completed' ? '#4ade80' : '#60a5fa'
    tagsEl.innerHTML += `<span class="pill" style="color:${sColor}">${anime.releaseStatus}</span>`

    // stats row
    document.getElementById('d-stats').innerHTML = `
        <span>📺 ${anime.mediaType || 'TV'}</span>
        <span>🎬 ${anime.studio || '—'}</span>
        <span>📅 ${anime.year || '—'}</span>
        <span>🎞️ ${anime.episodes} eps</span>
    `

    document.getElementById('d-synopsis').textContent = anime.synopsis || 'No synopsis available.'
    document.getElementById('dchat-title').textContent = `${anime.title} Chat`

    // related anime (same genre)
    const related = allAnime.filter(a =>
        a._id !== anime._id && (a.genres || []).some(g => (anime.genres || []).includes(g))
    ).slice(0, 4)
    renderAnimeGrid('d-related', related)

    // watchlist panel
    refreshWlPanel(anime._id)

    // load chat for this anime room
    loadRoomChat(anime._id, 'dchat-msgs', 'dchat-emobar')

    // reset to info tab
    switchDTab('info', document.querySelector('.dtab'))

    goPage('detail')
}

function switchDTab(tab, clickedEl) {
    document.querySelectorAll('.dtab').forEach(t => t.classList.remove('on'))
    document.querySelectorAll('.dtab-content').forEach(c => c.classList.remove('on'))
    if (clickedEl) clickedEl.classList.add('on')
    document.getElementById('dt-' + tab)?.classList.add('on')
}

function refreshWlPanel(animeId) {
    const entry = myWatchlist.find(e => e.anime && e.anime._id === animeId)
    const addArea  = document.getElementById('wl-add-btns')
    const editArea = document.getElementById('wl-edit-area')

    if (!entry) {
        addArea.classList.remove('hidden')
        editArea.classList.add('hidden')
        return
    }

    addArea.classList.add('hidden')
    editArea.classList.remove('hidden')

    document.getElementById('wl-status-sel').value = entry.watchStatus || 'plan_to_watch'

    const progress = entry.ep_progress || 0
    const totalEps = (entry.anime && entry.anime.episodes) || currentDetailAnime?.episodes || 0
    document.getElementById('wl-prog-val').textContent   = progress
    document.getElementById('wl-ep-max').textContent     = totalEps
    document.getElementById('wl-prog-input').value       = progress
    document.getElementById('wl-prog-input').max         = totalEps
    const pct = totalEps ? Math.min(100, (progress / totalEps) * 100) : 0
    document.getElementById('wl-prog-bar').style.width   = pct + '%'

    renderStars(entry.userRating || 0)
}

function renderStars(currentRating) {
    const el = document.getElementById('wl-stars')
    if (!el) return
    el.innerHTML = [1,2,3,4,5].map(n => `
        <span class="starb ${n <= currentRating ? 'lit' : ''}"
              onmouseover="previewStars(${n})"
              onmouseout="renderStars(${currentRating})"
              onclick="setRating(${n})">★</span>
    `).join('')
}

function previewStars(n) {
    document.querySelectorAll('.starb').forEach((s, i) => {
        s.classList.toggle('lit', i < n)
    })
}

async function setRating(n) {
    if (!currentDetailAnime) return
    const res = await api.updateWatchlist(currentDetailAnime._id, { userRating: n })
    if (res.ok) {
        await loadWatchlist()
        renderStars(n)
        toast('Rating saved', 'ok')
    }
}

async function addToWl(status) {
    if (!currentDetailAnime) return
    await addToWlById(currentDetailAnime._id, status, () => {
        refreshWlPanel(currentDetailAnime._id)
        toast('Added to watchlist ✓', 'ok')
    })
}

async function addToWlById(animeId, status, cb) {
    const res = await api.addWatchlist(animeId, status)
    if (res.ok) {
        await loadWatchlist()
        if (cb) cb()
    } else {
        toast(res.msg || 'failed to add', 'err')
    }
}

async function updateWlStatus() {
    if (!currentDetailAnime) return
    const status = document.getElementById('wl-status-sel').value
    const res = await api.updateWatchlist(currentDetailAnime._id, { watchStatus: status })
    if (res.ok) {
        await loadWatchlist()
        toast('Status updated', 'ok')
    }
}

async function updateWlProgress() {
    if (!currentDetailAnime) return
    const val = parseInt(document.getElementById('wl-prog-input').value) || 0
    const max = currentDetailAnime.episodes || 0
    const clamped = Math.min(val, max)

    // update progress bar live
    const pct = max ? (clamped / max) * 100 : 0
    document.getElementById('wl-prog-bar').style.width = pct + '%'
    document.getElementById('wl-prog-val').textContent = clamped

    // debounce the actual api call
    clearTimeout(window._progTimer)
    window._progTimer = setTimeout(async () => {
        await api.updateWatchlist(currentDetailAnime._id, { ep_progress: clamped })
        await loadWatchlist()
    }, 700)
}

async function removeFromWl() {
    if (!currentDetailAnime) return
    const res = await api.removeWatchlist(currentDetailAnime._id)
    if (res.ok) {
        await loadWatchlist()
        refreshWlPanel(currentDetailAnime._id)
        toast('Removed from watchlist', 'ok')
    }
}

// ─── WATCHLIST PAGE ───────────────────────────────────────────
let wlFilter = 'all'

function renderWatchlistPage() {
    const count = myWatchlist.length
    document.getElementById('wl-page-count').textContent = `${count} anime tracked`
    renderWlGrid()
}

function filterWl(tab, btn) {
    wlFilter = tab
    document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('on'))
    if (btn) btn.classList.add('on')
    renderWlGrid()
}

function renderWlGrid() {
    const list = wlFilter === 'all'
        ? myWatchlist
        : myWatchlist.filter(e => e.watchStatus === wlFilter)

    const grid  = document.getElementById('wl-grid')
    const empty = document.getElementById('wl-empty')

    if (!list.length) {
        grid.innerHTML = ''
        empty.classList.remove('hidden')
        return
    }

    empty.classList.add('hidden')
    grid.innerHTML = list.map(entry => {
        const a = entry.anime
        if (!a) return ''
        const progress = entry.ep_progress || 0
        const pct = a.episodes ? Math.min(100, (progress / a.episodes) * 100) : 0
        const fallback = 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=200'

        return `
            <div class="wl-item">
                <img class="wl-cov" src="${a.cover || fallback}" alt="${a.title}"
                     onclick="openDetail(${escJSON(a)})"
                     onerror="this.src='${fallback}'">
                <div class="wl-info">
                    <div class="wl-title" onclick="openDetail(${escJSON(a)})">${a.title}</div>
                    <div class="wl-studio">${a.studio || ''}</div>
                    <span class="sbadge ${entry.watchStatus}">${wlStatusLabel(entry.watchStatus)}</span>
                    <div style="margin-top:9px">
                        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt3);margin-bottom:4px">
                            <span>Progress</span><span>${progress}/${a.episodes}</span>
                        </div>
                        <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
                    </div>
                    ${entry.userRating ? '<div style="color:#fbbf24;font-size:13px;margin-top:7px">' + '★'.repeat(entry.userRating) + '</div>' : ''}
                    <button class="btn btn-d btn-sm" style="margin-top:9px" onclick="quickRemoveWl('${a._id}')">Remove</button>
                </div>
            </div>
        `
    }).join('')
}

function wlStatusLabel(s) {
    const labels = { watching:'📺 Watching', completed:'✅ Completed', plan_to_watch:'⏰ Plan to Watch', dropped:'❌ Dropped' }
    return labels[s] || s
}

async function quickRemoveWl(animeId) {
    await api.removeWatchlist(animeId)
    await loadWatchlist()
    renderWlGrid()
    toast('Removed', 'ok')
}

// ─── COMMUNITY PAGE ───────────────────────────────────────────
const roomTitles = {
    general:         '# general',
    spoilers:        '⚠️ # spoilers',
    recommendations: '🎯 # recommendations'
}

const roomSubs = {
    general:         'Discuss anything anime!',
    spoilers:        'Major spoilers — enter at your own risk',
    recommendations: 'Ask for and share recommendations'
}

async function loadCommunity() {
    await loadRoomChat(currentRoom, 'comm-msgs', 'comm-emobar')
    loadOnlineUsers()
}

function switchRoom(room, el) {
    currentRoom = room
    document.querySelectorAll('.sitem').forEach(s => s.classList.remove('on'))
    if (el) el.classList.add('on')

    document.getElementById('room-title').textContent = roomTitles[room] || room
    document.getElementById('room-sub').textContent   = roomSubs[room] || ''

    loadRoomChat(room, 'comm-msgs', 'comm-emobar')
}

async function loadRoomChat(room, msgsId, emobarId) {
    const res = await api.getMessages(room)
    if (!res.ok) return

    const msgs = res.data
    const el   = document.getElementById(msgsId)
    if (!el) return

    // setup emobar buttons if its the detail emobar
    if (emobarId === 'dchat-emobar') {
        const emoEl = document.getElementById(emobarId)
        if (emoEl) {
            emoEl.innerHTML = ['🔥','💯','❤️','😂','😭','👑','✨','🤯','🎌','⚡'].map(e =>
                `<span class="emobtn" onclick="insertEmoji('dchat-input','${e}')">${e}</span>`
            ).join('')
        }
        // update count
        const countEl = document.getElementById('dchat-count')
        if (countEl) countEl.textContent = `${msgs.length} messages`
    }

    renderChatMessages(msgs, el)
    el.scrollTop = el.scrollHeight
}

function renderChatMessages(msgs, container) {
    if (!msgs.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--txt3);font-size:12px;margin-top:20px">No messages yet. Start the conversation!</p>'
        return
    }

    container.innerHTML = msgs.map((m, i) => {
        const sender  = m.sender || {}
        const isMe    = sender._id === currentUser?._id || sender.username === currentUser?.username
        const grouped = i > 0 && msgs[i-1].sender?._id === sender._id

        const avt = sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sender.username}`
        const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })

        return `
            <div class="cmsg ${isMe ? 'me' : ''} ${grouped ? 'grp' : ''}">
                ${!grouped
                    ? `<img class="cavt" src="${avt}" alt="${sender.username}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=u'">`
                    : `<div class="cavt-space"></div>`
                }
                <div class="cmsg-body">
                    ${!grouped ? `
                        <div class="cmeta">
                            <span class="cname ${isMe ? 'mine' : ''}">${isMe ? 'You' : sender.username}</span>
                            <span class="ctime">${timeStr}</span>
                        </div>
                    ` : ''}
                    <div class="cbubble ${isMe ? 'mine' : 'other'}">${escHtml(m.body)}</div>
                </div>
            </div>
        `
    }).join('')
}

async function sendCommMsg() {
    const inp = document.getElementById('comm-inp')
    const txt = inp.value.trim()
    if (!txt) return

    inp.value = ''

    const res = await api.sendMessage(currentRoom, txt)
    if (res.ok) {
        await loadRoomChat(currentRoom, 'comm-msgs', 'comm-emobar')
    } else {
        toast(res.msg || 'failed to send', 'err')
    }
}

async function sendDetailMsg() {
    if (!currentDetailAnime) return
    const inp = document.getElementById('dchat-input')
    const txt = inp.value.trim()
    if (!txt) return

    inp.value = ''

    const res = await api.sendMessage(currentDetailAnime._id, txt)
    if (res.ok) {
        await loadRoomChat(currentDetailAnime._id, 'dchat-msgs', 'dchat-emobar')
    }
}

function insertEmoji(inputId, emoji) {
    const inp = document.getElementById(inputId)
    if (!inp) return
    const pos = inp.selectionStart
    inp.value = inp.value.slice(0, pos) + emoji + inp.value.slice(pos)
    inp.focus()
    inp.setSelectionRange(pos + emoji.length, pos + emoji.length)
}

function toggleEmobar(id, btn) {
    const el = document.getElementById(id)
    if (!el) return
    const isOpen = !el.classList.contains('hidden')
    el.classList.toggle('hidden', isOpen)
    if (btn) btn.classList.toggle('on', !isOpen)
}

async function loadOnlineUsers() {
    // just pull from allUsers list if available, otherwise show placeholder
    const container = document.getElementById('online-list')
    if (!container) return

    // use discover users if loaded
    const users = discoverUsers.length ? discoverUsers : []
    const online = users.filter(u => u.status === 'online').slice(0, 8)

    if (!online.length) {
        container.innerHTML = '<div class="sonline" style="opacity:0.4"><span style="font-size:11px;color:var(--txt3)">nobody online yet</span></div>'
        return
    }

    container.innerHTML = online.map(u => `
        <div class="sonline">
            <img src="${u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}" alt="${u.username}">
            <span class="sonline-name">${u.username}</span>
            <span class="sdot online" style="margin-left:auto"></span>
        </div>
    `).join('')

    document.getElementById('room-online').textContent = `👥 ${online.length} online`
}

// ─── FRIENDS PAGE ─────────────────────────────────────────────
async function loadFriends() {
    const [frRes, discRes] = await Promise.all([api.getFriends(), api.getDiscover()])

    if (frRes.ok) {
        allFriends       = frRes.accepted || []
        incomingRequests = frRes.incoming  || []
        sentRequests     = frRes.sent      || []
    }

    if (discRes.ok) {
        discoverUsers = discRes.data || []
        loadOnlineUsers()
    }

    updateFriendsBadge()
    renderFriendsPage()
}

async function loadFriendsBadge() {
    const res = await api.getFriends()
    if (res.ok) {
        incomingRequests = res.incoming || []
        updateFriendsBadge()
    }
}

function updateFriendsBadge() {
    const badge = document.getElementById('fr-badge')
    const count = incomingRequests.length
    if (count > 0) {
        badge.textContent = count
        badge.classList.remove('hidden')
    } else {
        badge.classList.add('hidden')
    }
}

function renderFriendsPage() {
    // stats
    const friendIds = allFriends.map(f => {
        const other = f.from?._id === currentUser._id ? f.to : f.from
        return other?._id
    }).filter(Boolean)

    document.getElementById('fr-count').textContent          = allFriends.length
    document.getElementById('fr-pending-count').textContent  = sentRequests.length
    document.getElementById('fr-requests-count').textContent = incomingRequests.length

    // incoming requests section
    const reqSection = document.getElementById('fr-requests-section')
    const reqList    = document.getElementById('fr-requests-list')
    if (incomingRequests.length > 0) {
        reqSection.classList.remove('hidden')
        reqList.innerHTML = incomingRequests.map(req => {
            const u = req.from || {}
            const avt = u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
            return `
                <div class="pending-fr">
                    <img src="${avt}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" alt="${u.username}">
                    <div style="flex:1">
                        <div style="font-size:14px;font-weight:700">${u.username}</div>
                        <div style="font-size:11px;color:var(--txt3)">wants to be your friend</div>
                    </div>
                    <button class="btn btn-s btn-sm" onclick="doAcceptFriend('${u._id}')">Accept</button>
                </div>
            `
        }).join('')
    } else {
        reqSection.classList.add('hidden')
    }

    filterFriends(currentFrTab)
}

function filterFriends(tab, btn) {
    currentFrTab = tab

    document.querySelectorAll('#pg-friends .tbtn').forEach(b => b.classList.remove('on'))
    if (btn) btn.classList.add('on')

    const search = (document.getElementById('fr-search')?.value || '').toLowerCase()

    let users = []

    if (tab === 'friends') {
        users = allFriends.map(f => {
            return f.from?._id === currentUser._id ? f.to : f.from
        }).filter(Boolean)
    } else if (tab === 'discover') {
        // exclude existing friends and pending
        const friendIds  = allFriends.map(f => {
            const other = f.from?._id === currentUser._id ? f.to : f.from
            return other?._id
        })
        const pendingIds = sentRequests.map(r => r.to?._id)
        users = discoverUsers.filter(u => !friendIds.includes(u._id) && !pendingIds.includes(u._id))
    } else {
        users = discoverUsers
    }

    if (search) users = users.filter(u => u.username?.toLowerCase().includes(search))

    const grid  = document.getElementById('fr-grid')
    const empty = document.getElementById('fr-empty')

    if (!users.length) {
        grid.innerHTML = ''
        empty.classList.remove('hidden')
        return
    }

    empty.classList.add('hidden')

    const friendIds = allFriends.map(f => {
        const other = f.from?._id === currentUser._id ? f.to : f.from
        return other?._id
    })
    const pendingIds = sentRequests.map(r => r.to?._id)

    grid.innerHTML = users.map(u => {
        if (!u || !u._id) return ''
        const isFriend  = friendIds.includes(u._id)
        const isPending = pendingIds.includes(u._id)
        const avt = u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
        const statusClass = u.status || 'offline'
        const dotColors = { online:'#22c55e', away:'#fbbf24', offline:'#6b7280' }
        const dotColor  = dotColors[statusClass] || '#6b7280'

        let actionBtn = `<button class="btn btn-p btn-sm" onclick="doAddFriend('${u._id}')">+ Add</button>`
        if (isFriend)  actionBtn = `<button class="btn btn-d btn-sm" onclick="doRemoveFriend('${u._id}')">Remove</button>`
        if (isPending) actionBtn = `<span class="btn btn-g btn-sm" style="pointer-events:none;opacity:0.6">Pending</span>`

        return `
            <div class="fr-card">
                <div class="fr-top">
                    <div class="fr-avt-wrap">
                        <img class="fr-avt" src="${avt}" alt="${u.username}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=u'">
                        <span class="fr-sdot" style="background:${dotColor}"></span>
                    </div>
                    <div style="flex:1">
                        <div class="fr-name">${u.username}</div>
                        <div class="fr-status">${u.status || 'offline'}</div>
                    </div>
                    ${actionBtn}
                </div>
                ${u.bio ? `<p style="font-size:12px;color:var(--txt3);margin-top:4px">${escHtml(u.bio)}</p>` : ''}
                ${isFriend ? '<p style="font-size:11px;color:rgba(249,115,22,0.6);margin-top:8px">✅ Friends</p>' : ''}
            </div>
        `
    }).join('')
}

async function doAddFriend(userId) {
    const res = await api.sendRequest(userId)
    if (res.ok) {
        await loadFriends()
        toast('Friend request sent!', 'ok')
    } else {
        toast(res.msg || 'failed', 'err')
    }
}

async function doAcceptFriend(userId) {
    const res = await api.acceptRequest(userId)
    if (res.ok) {
        await loadFriends()
        updateFriendsBadge()
        toast('Friend added!', 'ok')
    } else {
        toast(res.msg || 'failed', 'err')
    }
}

async function doRemoveFriend(userId) {
    const res = await api.removeFriend(userId)
    if (res.ok) {
        await loadFriends()
        toast('Friend removed', 'ok')
    }
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
const admPanelTitles = {
    overview: 'Dashboard',
    anime:    'Anime Library',
    users:    'Users',
    messages: 'Messages'
}

function admPanel(name, el) {
    document.querySelectorAll('.adm-ni').forEach(n => n.classList.remove('on'))
    if (el) el.classList.add('on')

    document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('on'))
    document.getElementById('adm-' + name)?.classList.add('on')

    document.getElementById('adm-panel-title').textContent = admPanelTitles[name] || name

    if (name === 'overview') loadAdmOverview()
    if (name === 'anime')    loadAdmAnime()
    if (name === 'users')    loadAdmUsers()
    if (name === 'messages') loadAdmMessages()
}

async function admReload() {
    const active = document.querySelector('.adm-panel.on')?.id?.replace('adm-', '') || 'overview'
    admPanel(active, document.querySelector(`.adm-ni.on`))
}

async function loadAdmOverview() {
    const [statsRes, usersRes, msgsRes] = await Promise.all([
        api.getStats(), api.getUsers(), api.getAllMsgs()
    ])

    if (statsRes.ok) {
        const s = statsRes.data
        document.getElementById('adm-online-txt').textContent = `${s.onlineCount} online`
        document.getElementById('adm-anime-txt').textContent  = `${s.animeCount} anime`

        document.getElementById('adm-stats-row').innerHTML = [
            { ico:'🎬', val:s.animeCount,   lbl:'Anime',    bg:'rgba(249,115,22,0.1)' },
            { ico:'👥', val:s.userCount,    lbl:'Users',    bg:'rgba(59,130,246,0.1)' },
            { ico:'🟢', val:s.onlineCount,  lbl:'Online',   bg:'rgba(34,197,94,0.1)'  },
            { ico:'💬', val:s.msgCount,     lbl:'Messages', bg:'rgba(168,85,247,0.1)' },
            { ico:'🚫', val:s.bannedCount,  lbl:'Banned',   bg:'rgba(239,68,68,0.1)'  }
        ].map(item => `
            <div class="sbox" style="background:${item.bg}">
                <span class="sbox-ico">${item.ico}</span>
                <div><div class="sbox-val">${item.val}</div><div class="sbox-lbl">${item.lbl}</div></div>
            </div>
        `).join('')
    }

    if (usersRes.ok) {
        const tbody = document.querySelector('#adm-recent-users tbody')
        if (tbody) {
            const recent = usersRes.data.slice(0, 5)
            tbody.innerHTML = recent.map(u => {
                const avt = u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
                const dotColor = { online:'#22c55e', away:'#fbbf24', offline:'#6b7280' }[u.status] || '#6b7280'
                return `
                    <tr>
                        <td style="display:flex;align-items:center;gap:9px">
                            <img src="${avt}" style="width:30px;height:30px;border-radius:50%" alt="${u.username}">
                            <div>
                                <div style="font-size:13px;font-weight:700">${u.username}</div>
                                ${u.banned ? '<span style="font-size:10px;color:#f87171">Banned</span>' : ''}
                            </div>
                        </td>
                        <td><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px"><span style="width:7px;height:7px;border-radius:50%;background:${dotColor}"></span>${u.status}</span></td>
                        <td style="font-size:12px;color:var(--txt3)">${timeAgo(u.createdAt)}</td>
                    </tr>
                `
            }).join('')
        }
    }

    if (msgsRes.ok) {
        const container = document.getElementById('adm-recent-msgs')
        if (container) {
            container.innerHTML = msgsRes.data.slice(0, 5).map(m => {
                const s = m.sender || {}
                const avt = s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`
                return `
                    <div style="padding:10px 14px;border-bottom:1px solid var(--bdr)">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
                            <img src="${avt}" style="width:18px;height:18px;border-radius:50%" alt="">
                            <span style="font-size:12px;font-weight:700">${s.username || '?'}</span>
                            <span style="font-size:10px;color:var(--txt3);margin-left:auto">${timeAgo(m.createdAt)}</span>
                        </div>
                        <p style="font-size:12px;color:var(--txt3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(m.body)}</p>
                    </div>
                `
            }).join('')
        }
    }
}

async function loadAdmAnime() {
    const res = await api.getAnime()
    if (res.ok) {
        admAnimeAll = res.data
        filterAdmAnime()
    }
}

function filterAdmAnime() {
    const search = (document.getElementById('adm-anime-search')?.value || '').toLowerCase()
    const list = admAnimeAll.filter(a =>
        a.title.toLowerCase().includes(search) || (a.studio || '').toLowerCase().includes(search)
    )

    const tbody = document.getElementById('adm-anime-tbody')
    const empty = document.getElementById('adm-anime-empty')

    if (!list.length) {
        tbody.innerHTML = ''
        empty.classList.remove('hidden')
        return
    }

    empty.classList.add('hidden')
    const fallback = 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=100'

    tbody.innerHTML = list.map(a => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <img class="tbl-img" src="${a.cover || fallback}" alt="${a.title}" onerror="this.src='${fallback}'">
                    <div>
                        <div style="font-size:13px;font-weight:700">${a.title}</div>
                        <div style="display:flex;gap:4px;margin-top:3px">
                            ${a.isTrending ? '<span style="font-size:9px;background:rgba(249,115,22,0.12);color:#fb923c;border-radius:3px;padding:1px 5px">🔥</span>' : ''}
                            ${a.isPopular  ? '<span style="font-size:9px;background:rgba(251,191,36,0.12);color:#fbbf24;border-radius:3px;padding:1px 5px">⭐</span>' : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td style="font-size:12px;color:var(--txt2)">${a.studio || '—'}<br><span style="color:var(--txt3)">${a.year || ''}</span></td>
            <td style="color:#fbbf24;font-size:13px;font-weight:700">★ ${a.rating}</td>
            <td>
                <span style="font-size:11px;padding:3px 8px;border-radius:20px;
                    ${a.releaseStatus === 'Completed'
                        ? 'background:rgba(34,197,94,0.1);color:#4ade80'
                        : a.releaseStatus === 'Ongoing'
                        ? 'background:rgba(59,130,246,0.1);color:#60a5fa'
                        : 'background:rgba(234,179,8,0.1);color:#fbbf24'
                    }">
                    ${a.releaseStatus}
                </span>
            </td>
            <td>
                <div style="display:flex;gap:5px">
                    <button class="btn btn-g btn-sm" onclick="openAnimeModal(${escJSON(a)})">✏️</button>
                    <button class="btn btn-d btn-sm" onclick="confirmDelAnime('${a._id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('')
}

async function loadAdmUsers() {
    const res = await api.getUsers()
    if (res.ok) {
        admUsersAll = res.data
        filterAdmUsers()
    }
}

function setUserFilter(f, btn) {
    admUserFilter = f
    document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on'))
    if (btn) btn.classList.add('on')
    filterAdmUsers()
}

function filterAdmUsers() {
    const search = (document.getElementById('adm-user-search')?.value || '').toLowerCase()
    let list = admUsersAll

    if (admUserFilter === 'online') list = list.filter(u => u.status === 'online')
    if (admUserFilter === 'banned') list = list.filter(u => u.banned)

    if (search) list = list.filter(u =>
        u.username.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    )

    const tbody = document.getElementById('adm-users-tbody')
    const empty = document.getElementById('adm-users-empty')

    if (!list.length) {
        tbody.innerHTML = ''
        empty.classList.remove('hidden')
        return
    }

    empty.classList.add('hidden')

    tbody.innerHTML = list.map(u => {
        const avt = u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
        const dotColor = { online:'#22c55e', away:'#fbbf24', offline:'#6b7280' }[u.status] || '#6b7280'

        return `
            <tr style="${u.banned ? 'opacity:0.55' : ''}">
                <td>
                    <div style="display:flex;align-items:center;gap:9px">
                        <div style="position:relative">
                            <img src="${avt}" style="width:34px;height:34px;border-radius:50%;border:1px solid var(--bdr)" alt="${u.username}">
                            <span style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:${dotColor};border:2px solid var(--bg2)"></span>
                        </div>
                        <div>
                            <div style="font-size:13px;font-weight:700">${u.username}</div>
                            ${u.banned ? '<span style="font-size:10px;color:#f87171">Banned</span>' : ''}
                        </div>
                    </div>
                </td>
                <td style="font-size:12px;color:var(--txt2)">${u.email}</td>
                <td>
                    <span style="font-size:11px;padding:3px 9px;border-radius:20px;
                        ${u.status === 'online'
                            ? 'background:rgba(34,197,94,0.1);color:#4ade80'
                            : u.status === 'away'
                            ? 'background:rgba(251,191,36,0.1);color:#fbbf24'
                            : 'background:rgba(107,114,128,0.1);color:#9ca3af'
                        }">
                        ${u.status}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--txt3)">${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm ${u.banned ? 'btn-s' : 'btn-d'}" onclick="doToggleBan('${u._id}')">
                        ${u.banned ? '✅ Unban' : '🚫 Ban'}
                    </button>
                </td>
            </tr>
        `
    }).join('')
}

async function doToggleBan(userId) {
    const res = await api.toggleBan(userId)
    if (res.ok) {
        await loadAdmUsers()
        toast(res.msg || 'done', 'ok')
    } else {
        toast(res.msg || 'failed', 'err')
    }
}

async function loadAdmMessages() {
    const res = await api.getAllMsgs()
    if (res.ok) {
        admMsgsAll = res.data
        filterAdmMsgs()
    }
}

function filterAdmMsgs() {
    const search = (document.getElementById('adm-msg-search')?.value || '').toLowerCase()
    const list = admMsgsAll.filter(m =>
        !search || (m.body || '').toLowerCase().includes(search)
    )

    const container = document.getElementById('adm-msgs-list')
    const empty     = document.getElementById('adm-msgs-empty')

    if (!list.length) {
        container.innerHTML = ''
        empty.classList.remove('hidden')
        return
    }

    empty.classList.add('hidden')

    container.innerHTML = list.map(m => {
        const s = m.sender || {}
        const avt = s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`
        return `
            <div class="adm-msg-row" style="display:flex;align-items:flex-start;gap:11px;padding:12px 15px;border-bottom:1px solid rgba(255,255,255,0.025);transition:background 0.15s"
                 onmouseover="this.style.background='rgba(255,255,255,0.01)'" onmouseout="this.style.background=''">
                <img src="${avt}" style="width:32px;height:32px;border-radius:50%;flex-shrink:0" alt="${s.username}">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                        <span style="font-size:12px;font-weight:700">${s.username || '?'}</span>
                        <span style="font-size:10px;color:var(--txt3)">in ${m.room === 'general' ? '#general' : m.room}</span>
                        <span style="font-size:10px;color:var(--txt3);margin-left:auto">${timeAgo(m.createdAt)}</span>
                    </div>
                    <p style="font-size:12px;color:var(--txt2)">${escHtml(m.body)}</p>
                </div>
                <button class="btn btn-d btn-sm" style="flex-shrink:0" onclick="doDeleteMsg('${m._id}')">🗑️</button>
            </div>
        `
    }).join('')
}

async function doDeleteMsg(msgId) {
    const res = await api.deleteMsg(msgId)
    if (res.ok) {
        await loadAdmMessages()
        toast('Message deleted', 'ok')
    }
}

// ─── ANIME MODAL ──────────────────────────────────────────────
function openAnimeModal(anime) {
    amGenres = []

    if (anime && typeof anime === 'string') {
        try { anime = JSON.parse(anime) } catch { anime = null }
    }

    const modal = document.getElementById('anime-modal')
    document.getElementById('am-title').textContent = anime ? '🎬 Edit Anime' : '🎬 Add Anime'
    document.getElementById('am-save-btn').textContent = anime ? 'Save Changes' : 'Save Anime'

    if (anime) {
        document.getElementById('am-id').value        = anime._id || ''
        document.getElementById('am-title-inp').value = anime.title || ''
        document.getElementById('am-alt').value       = anime.altTitle || ''
        document.getElementById('am-studio').value    = anime.studio || ''
        document.getElementById('am-year').value      = anime.year || ''
        document.getElementById('am-eps').value       = anime.episodes || ''
        document.getElementById('am-rating').value    = anime.rating || ''
        document.getElementById('am-type').value      = anime.mediaType || 'TV'
        document.getElementById('am-status').value    = anime.releaseStatus || 'Ongoing'
        document.getElementById('am-cover').value     = anime.cover || ''
        document.getElementById('am-banner').value    = anime.banner || ''
        document.getElementById('am-synopsis').value  = anime.synopsis || ''
        document.getElementById('am-trending').checked = anime.isTrending || false
        document.getElementById('am-popular').checked  = anime.isPopular  || false
        amGenres = [...(anime.genres || [])]
    } else {
        // clear all
        ;['am-id','am-title-inp','am-alt','am-studio','am-year','am-eps','am-rating',
          'am-cover','am-banner','am-synopsis'].forEach(id => {
            document.getElementById(id).value = ''
        })
        document.getElementById('am-type').value   = 'TV'
        document.getElementById('am-status').value = 'Ongoing'
        document.getElementById('am-trending').checked = false
        document.getElementById('am-popular').checked  = false
        amGenres = []
    }

    renderAmGenres()
    updateAmPreview()
    modal.classList.add('open')
}

function closeAnimeModal() {
    document.getElementById('anime-modal').classList.remove('open')
}

function addAmGenre() {
    const sel = document.getElementById('am-genre-sel')
    const val = sel.value
    if (!val || amGenres.includes(val)) return
    amGenres.push(val)
    sel.value = ''
    renderAmGenres()
    updateAmPreview()
}

function removeAmGenre(g) {
    amGenres = amGenres.filter(x => x !== g)
    renderAmGenres()
    updateAmPreview()
}

function renderAmGenres() {
    const el = document.getElementById('am-genres-list')
    el.innerHTML = amGenres.map(g => `
        <span class="gtag">${g}<button onclick="removeAmGenre('${g}')">×</button></span>
    `).join('')
}

function updateAmPreview() {
    const cover  = document.getElementById('am-cover').value
    const title  = document.getElementById('am-title-inp').value
    const studio = document.getElementById('am-studio').value
    const prev   = document.getElementById('am-preview')

    if (cover && title) {
        prev.style.display = 'flex'
        prev.classList.remove('hidden')
        document.getElementById('am-prev-img').src = cover
        document.getElementById('am-prev-title').textContent  = title
        document.getElementById('am-prev-studio').textContent = studio || ''
        document.getElementById('am-prev-genres').innerHTML   = amGenres.map(g =>
            `<span style="font-size:10px;background:rgba(249,115,22,0.1);color:#fb923c;border:1px solid rgba(249,115,22,0.22);border-radius:20px;padding:2px 8px">${g}</span>`
        ).join('')
    } else {
        prev.style.display = 'none'
        prev.classList.add('hidden')
    }
}

async function saveAnime() {
    const id      = document.getElementById('am-id').value
    const title   = document.getElementById('am-title-inp').value.trim()
    const studio  = document.getElementById('am-studio').value.trim()
    const synopsis = document.getElementById('am-synopsis').value.trim()

    if (!title || !studio || !synopsis) {
        toast('fill in title, studio and synopsis', 'err')
        return
    }

    const payload = {
        title,
        altTitle:      document.getElementById('am-alt').value.trim(),
        studio,
        year:          parseInt(document.getElementById('am-year').value) || null,
        episodes:      parseInt(document.getElementById('am-eps').value) || 12,
        rating:        parseFloat(document.getElementById('am-rating').value) || 0,
        mediaType:     document.getElementById('am-type').value,
        releaseStatus: document.getElementById('am-status').value,
        cover:         document.getElementById('am-cover').value.trim(),
        banner:        document.getElementById('am-banner').value.trim(),
        synopsis,
        genres:        amGenres,
        isTrending:    document.getElementById('am-trending').checked,
        isPopular:     document.getElementById('am-popular').checked
    }

    const btn = document.getElementById('am-save-btn')
    setBtnLoading(btn, true)

    const res = id ? await api.updateAnime(id, payload) : await api.createAnime(payload)

    setBtnLoading(btn, false)

    if (res.ok) {
        closeAnimeModal()
        await loadAdmAnime()
        await loadAllAnime()
        toast(id ? 'Anime updated ✓' : 'Anime added ✓', 'ok')
    } else {
        toast(res.msg || 'failed to save', 'err')
    }
}

function confirmDelAnime(id) {
    pendingDelId = id
    document.getElementById('del-modal').classList.add('open')
    document.getElementById('del-confirm-btn').onclick = async () => {
        const res = await api.deleteAnime(pendingDelId)
        closeDelModal()
        if (res.ok) {
            await loadAdmAnime()
            await loadAllAnime()
            toast('Anime deleted', 'ok')
        } else {
            toast('delete failed', 'err')
        }
    }
}

function closeDelModal() {
    document.getElementById('del-modal').classList.remove('open')
    pendingDelId = null
}

// close modals when clicking outside
document.addEventListener('click', e => {
    const animeModal = document.getElementById('anime-modal')
    const delModal   = document.getElementById('del-modal')

    if (e.target === animeModal) closeAnimeModal()
    if (e.target === delModal)   closeDelModal()
})

// ─── HELPERS ──────────────────────────────────────────────────
function toast(msg, type = 'ok') {
    const el = document.getElementById('toast')
    el.textContent = (type === 'ok' ? '✅ ' : '❌ ') + msg
    el.className = `show ${type}`
    clearTimeout(window._toastTimer)
    window._toastTimer = setTimeout(() => el.classList.remove('show'), 3200)
}

function setBtnLoading(btn, loading) {
    if (loading) {
        btn.dataset.orig = btn.innerHTML
        btn.innerHTML = '<span class="spin"></span>'
        btn.disabled  = true
    } else {
        btn.innerHTML = btn.dataset.orig || btn.innerHTML
        btn.disabled  = false
    }
}

function escHtml(str) {
    if (!str) return ''
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    if (diff < 60000)     return 'just now'
    if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
}
