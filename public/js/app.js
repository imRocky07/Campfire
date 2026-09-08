// Main application state
let currentUser = null
let currentHub = localStorage.getItem('cf_hub') || 'anime'
let allAnime = []
let myWatchlist = []
let aiRecommendations = []
let currentDetailAnime = null
let currentHeroAnime = null

// Gaming hub state
let allGames = []
let myGamelist = []
let aiGameRecommendations = []
let currentDetailGame = null

let prevPage = 'home'
let currentRoom = 'general'
let currentFrTab = 'all'
let allFriends = []
let incomingRequests = []
let sentRequests = []
let discoverUsers = []
let admAnimeAll = []
let admUsersAll = []
let admMsgsAll = []
let admUserFilter = 'all'
let pendingDelId = null
let amGenres = []
let authMode = 'login'

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('cf_token')
    if (token) {
        try {
            const res = await api.getMe()
            if (res && res.ok && res.user) {
                currentUser = res.user
                if (currentUser.role === 'admin') {
                    showAdmin()
                } else {
                    showApp()
                }
                return
            }
        } catch (e) {
            console.error('Session restore error:', e)
        }
    }
    localStorage.removeItem('cf_token')
    currentUser = null
    showLogin()
})

// Rotating Campfire quotes / website highlights on sign in page
const CAMPFIRE_QUOTES = [
    "Every great journey begins around a campfire with people who share your passion.",
    "Discover trending anime & games, track your backlog, and rate your favorites.",
    "Personalized AI recommendations tailored specifically to your taste.",
    "Connect with like-minded fans in real-time community chat and spoiler lounges.",
    "Compare collections with friends, customize your profile, and explore rich hubs."
]
let currentQuoteIdx = 0
let quoteTimer = null

function renderQuoteDots() {
    const qdots = document.getElementById('qdots')
    if (!qdots) return
    qdots.innerHTML = CAMPFIRE_QUOTES.map((_, i) => `
        <span class="qdot ${i === currentQuoteIdx ? 'active' : ''}" onclick="setQuote(${i})"></span>
    `).join('')
}

function setQuote(idx) {
    currentQuoteIdx = idx
    const el = document.getElementById('quote-txt')
    if (el) {
        el.classList.add('fade')
        setTimeout(() => {
            el.textContent = CAMPFIRE_QUOTES[currentQuoteIdx]
            el.classList.remove('fade')
        }, 220)
    }
    renderQuoteDots()
    resetQuoteTimer()
}

function nextQuote() {
    const nextIdx = (currentQuoteIdx + 1) % CAMPFIRE_QUOTES.length
    setQuote(nextIdx)
}

function resetQuoteTimer() {
    if (quoteTimer) clearInterval(quoteTimer)
    quoteTimer = setInterval(nextQuote, 4200)
}

function initQuotes() {
    const el = document.getElementById('quote-txt')
    if (el) {
        el.textContent = CAMPFIRE_QUOTES[currentQuoteIdx]
    }
    renderQuoteDots()
    resetQuoteTimer()
}

// Auth flow
function showLogin() {
    document.getElementById('login-pg').classList.remove('hidden')
    document.getElementById('app-wrap').classList.add('hidden')
    document.getElementById('admin-wrap').classList.add('hidden')
    document.getElementById('navbar').classList.add('hidden')
    initQuotes()
}

async function showApp() {
    if (quoteTimer) { clearInterval(quoteTimer); quoteTimer = null; }
    document.getElementById('login-pg').classList.add('hidden')
    document.getElementById('admin-wrap').classList.add('hidden')
    document.getElementById('app-wrap').classList.remove('hidden')
    document.getElementById('navbar').classList.remove('hidden')

    // fill navbar user info
    if (currentUser) {
        const avt = document.getElementById('nav-avt')
        if (avt) avt.src = currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`
        const nameEl = document.getElementById('dd-name')
        if (nameEl) nameEl.textContent = currentUser.username
        const emailEl = document.getElementById('dd-email')
        if (emailEl) emailEl.textContent = currentUser.email
    }

    // Parse URL hash on load or fallback to localStorage/default
    const initialHash = window.location.hash.replace('#', '')
    if (initialHash === 'gaming' || initialHash === 'anime') {
        currentHub = initialHash
        localStorage.setItem('cf_hub', currentHub)
    } else {
        window.location.hash = '#' + currentHub
    }

    updateHubSwitcherUI()

    try {
        if (currentHub === 'gaming') {
            await loadAllGames()
        } else {
            await loadAllAnime()
        }
        initDailyTinderDeck()
    } catch (e) {
        console.error('Failed to load initial dataset:', e)
    }

    renderHome()
    loadFriendsBadge()

    // background sync watchlist/gamelist and recommendations
    if (currentHub === 'gaming') {
        Promise.allSettled([loadGamelist(), loadAIGameRecommendations()]).then(() => {
            renderHomeSections()
        }).catch(err => console.error('Background data sync error:', err))
    } else {
        Promise.allSettled([loadWatchlist(), loadAIRecommendations()]).then(() => {
            renderHomeSections()
        }).catch(err => console.error('Background data sync error:', err))
    }
}

function showAdmin() {
    if (quoteTimer) { clearInterval(quoteTimer); quoteTimer = null; }
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
    const btn = document.getElementById('auth-btn')
    if (btn) {
        delete btn.dataset.orig
        btn.disabled = false
        btn.textContent = isReg ? 'Create Account →' : 'Sign In →'
    }

    document.getElementById('lcard-title').textContent    = isReg ? 'Join Campfire 🔥' : 'Welcome back 👋'
    document.getElementById('lcard-sub').textContent      = isReg ? 'Create your account' : 'Sign in to your account'
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

function fillDemo(userType) {
    if (authMode !== 'login') {
        switchAuthMode()
    }
    const emailInp = document.getElementById('inp-email')
    const passInp  = document.getElementById('inp-pass')
    if (userType === 'sakura' || userType === 'user') {
        emailInp.value = 'sakura@campfire.app'
        passInp.value  = 'demo123'
    } else if (userType === 'admin') {
        emailInp.value = 'admin@campfire.app'
        passInp.value  = 'admin123'
    }
    setAuthErr('')
    passInp.focus()
}

async function doAuth() {
    const btn = document.getElementById('auth-btn')
    const email = document.getElementById('inp-email').value.trim()
    const pass  = document.getElementById('inp-pass').value

    if (!email || !pass) { setAuthErr('fill in all fields'); return }

    if (authMode === 'register') {
        const username = document.getElementById('inp-username').value.trim()
        const confirm  = document.getElementById('inp-confirm').value

        if (!username) { setAuthErr('enter a username'); return }
        if (username.length < 3) { setAuthErr('username must be at least 3 characters'); return }
        if (username.length > 20) { setAuthErr('username must be 20 characters or less'); return }
        if (!/^\S+@\S+\.\S+$/.test(email)) { setAuthErr('enter a valid email address'); return }
        if (pass.length < 6) { setAuthErr('password must be at least 6 characters'); return }
        if (pass !== confirm) { setAuthErr("passwords don't match"); return }
    }

    setBtnLoading(btn, true)
    setAuthErr('')

    let res
    try {
        if (authMode === 'register') {
            const username = document.getElementById('inp-username').value.trim()
            res = await api.register(username, email, pass)
        } else {
            res = await api.login(email, pass)
        }
    } catch (e) {
        console.error('Auth request error:', e)
        res = { ok: false, msg: 'Authentication failed. Please check network connection.' }
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

// Password toggle
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

// Navigation
function goPage(name) {
    if (name !== 'detail') prevPage = name

    // dismiss search overlays on page switch
    const ts = document.getElementById('trending-searches')
    if (ts) ts.classList.add('hidden')
    const fd = document.getElementById('filter-dropdown')
    if (fd) fd.classList.add('hidden')

    document.querySelectorAll('.nl').forEach(l => {
        l.classList.toggle('on', l.dataset.page === name)
    })

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    const target = document.getElementById('pg-' + name)
    if (target) target.classList.add('active')

    if (name === 'discover') {
        renderDiscover()
    } else {
        toggleTinderDeck(false)
    }
    if (name === 'watchlist') renderWatchlistPage()
    if (name === 'community') loadCommunity()
    if (name === 'friends')   loadFriends()
    if (name === 'help')      loadMyHelpChat()

    window.scrollTo(0, 0)
    closeMobMenu()
}

function goBack() {
    goPage(prevPage || 'home')
}

// Navbar helpers
function toggleDD() {
    document.getElementById('nav-dd').classList.toggle('open')
}

function toggleHubMenu(event) {
    if (event) event.stopPropagation()
    const menu = document.getElementById('hub-nested-menu')
    const arrow = document.getElementById('hub-trigger-arrow')
    if (menu) {
        const isOpen = menu.classList.contains('open')
        if (isOpen) {
            closeHubMenu()
        } else {
            menu.classList.add('open')
            if (arrow) arrow.style.transform = 'rotate(180deg)'
        }
    }
}

function closeHubMenu() {
    const menu = document.getElementById('hub-nested-menu')
    const arrow = document.getElementById('hub-trigger-arrow')
    if (menu) menu.classList.remove('open')
    if (arrow) arrow.style.transform = 'rotate(0deg)'
}

function selectHubFromMenu(hub, event) {
    closeHubMenu()
    navigateToHub(hub, event)
    goPage('home')
    renderHome()
}

async function switchHub(newHub) {
    const hubChanged = newHub !== currentHub
    currentHub = newHub
    localStorage.setItem('cf_hub', currentHub)

    updateHubSwitcherUI()

    if (currentHub === 'gaming') {
        if (!allGames.length) await loadAllGames()
        if (!myGamelist.length) loadGamelist()
        if (!aiGameRecommendations.length) loadAIGameRecommendations()
    } else {
        if (!allAnime.length) await loadAllAnime()
        if (!myWatchlist.length) loadWatchlist()
        if (!aiRecommendations.length) loadAIRecommendations()
    }

    initDailyTinderDeck()

    // reset to homepage on hub select
    goPage('home')
    renderHome()

    if (hubChanged) {
        showToast(currentHub === 'gaming' ? '🎮 Switched to Gaming Hub!' : '🔥 Switched to Anime Hub!', 'success')
    }
}

document.addEventListener('click', e => {
    const dd   = document.getElementById('nav-dd')
    const avt  = document.getElementById('nav-avt')
    if (dd && avt && !dd.contains(e.target) && e.target !== avt) {
        dd.classList.remove('open')
    }

    const hubMenu = document.getElementById('hub-nested-menu')
    const hubBtn  = document.getElementById('hub-trigger-btn')
    if (hubMenu && hubBtn && !hubMenu.contains(e.target) && !hubBtn.contains(e.target)) {
        closeHubMenu()
    }
})

function toggleMobMenu() {
    document.getElementById('mob-menu').classList.toggle('open')
}

function closeMobMenu() {
    document.getElementById('mob-menu').classList.remove('open')
}

// Data fetching helpers
async function loadAllAnime() {
    const res = await api.getAnime()
    if (res.ok) allAnime = res.data
}

async function loadWatchlist() {
    const res = await api.getWatchlist()
    if (res.ok) myWatchlist = res.data
}

async function loadAIRecommendations() {
    try {
        const res = await api.getRecommendations(20)
        if (res.ok) aiRecommendations = res.data
    } catch (err) {
        console.error('Failed to load AI recommendations:', err)
    }
}

// Gaming Data Fetching Helpers
async function loadAllGames() {
    try {
        const res = await api.getGames({ limit: 500 })
        if (res.ok) allGames = res.data
    } catch (e) {
        console.error('Failed to load games dataset:', e)
    }
}

async function loadGamelist() {
    try {
        const res = await api.getGamelist()
        if (res.ok) myGamelist = res.data
    } catch (e) {
        console.error('Failed to load gamelist:', e)
    }
}

async function loadAIGameRecommendations() {
    try {
        const res = await api.getGameRecommendations(20)
        if (res.ok) aiGameRecommendations = res.data
    } catch (err) {
        console.error('Failed to load AI game recommendations:', err)
    }
}

// Hub routing & state
async function navigateToHub(hubTarget, event) {
    if (event) {
        if (event.preventDefault) event.preventDefault()
        event.stopPropagation()
    }
    const targetHub = hubTarget || (currentHub === 'anime' ? 'gaming' : 'anime')
    if (window.location.hash !== '#' + targetHub) {
        window.location.hash = '#' + targetHub
    } else {
        await switchHub(targetHub)
    }
}

// Backwards compatibility alias
async function toggleHubMode(hubTarget, event) {
    return navigateToHub(hubTarget, event)
}



window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '')
    if ((hash === 'gaming' || hash === 'anime') && hash !== currentHub) {
        switchHub(hash)
    }
})

function updateHubSwitcherUI() {
    const wrap = document.getElementById('hub-menu-wrap')
    const icon = document.getElementById('hub-trigger-icon')
    const text = document.getElementById('hub-trigger-text')
    const itemAnime = document.getElementById('hub-item-anime')
    const itemGaming = document.getElementById('hub-item-gaming')
    const checkAnime = document.getElementById('hub-check-anime')
    const checkGaming = document.getElementById('hub-check-gaming')
    const subBrand = document.getElementById('nav-sub-brand')
    const wlNav = document.querySelector('.nl[data-page="watchlist"]')

    if (currentHub === 'gaming') {
        if (wrap) wrap.classList.add('mode-gaming')
        if (icon) icon.textContent = '🎮'
        if (text) text.textContent = 'Gaming Hub'
        if (itemAnime) itemAnime.classList.remove('active')
        if (itemGaming) itemGaming.classList.add('active')
        if (checkAnime) checkAnime.classList.add('hidden')
        if (checkGaming) checkGaming.classList.remove('hidden')
        if (subBrand) {
            subBrand.textContent = 'Gaming'
            subBrand.style.color = '#8b5cf6'
        }
        if (wlNav) wlNav.innerHTML = '🎮 Game Library'
    } else {
        if (wrap) wrap.classList.remove('mode-gaming')
        if (icon) icon.textContent = '🔥'
        if (text) text.textContent = 'Anime Hub'
        if (itemAnime) itemAnime.classList.add('active')
        if (itemGaming) itemGaming.classList.remove('active')
        if (checkAnime) checkAnime.classList.remove('hidden')
        if (checkGaming) checkGaming.classList.add('hidden')
        if (subBrand) {
            subBrand.textContent = 'Anime'
            subBrand.style.color = 'var(--orange)'
        }
        if (wlNav) wlNav.innerHTML = '📚 Watchlist'
    }
}

// recalculate pill position on window resize
window.addEventListener('resize', () => {
    updateHubSwitcherUI()
})

// Home page & spotlight slideshow
// Hero slideshow state
let heroSlides = []
let activeHeroIdx = 0
let heroTimer = null
let isFirstLoad = true
let activeBuffer = 1
let isTransitioning = false

function startHeroSlideshow() {
    clearInterval(heroTimer)
    heroTimer = setInterval(() => {
        if (!heroSlides.length) return
        if (isTransitioning) return
        activeHeroIdx = (activeHeroIdx + 1) % heroSlides.length
        renderHeroSlide(activeHeroIdx, 'next')
    }, 4000) // 4 seconds
}

function stopHeroSlideshow() {
    clearInterval(heroTimer)
}

function setHeroSlide(idx) {
    if (isTransitioning) return
    if (idx === activeHeroIdx) return
    const dir = idx > activeHeroIdx ? 'next' : 'prev'
    activeHeroIdx = idx
    renderHeroSlide(idx, dir)
    startHeroSlideshow() // Reset timer on manual click
}

function nextHeroSlide() {
    if (isTransitioning) return
    if (!heroSlides.length) return
    activeHeroIdx = (activeHeroIdx + 1) % heroSlides.length
    renderHeroSlide(activeHeroIdx, 'next')
    startHeroSlideshow()
}

function prevHeroSlide() {
    if (isTransitioning) return
    if (!heroSlides.length) return
    activeHeroIdx = (activeHeroIdx - 1 + heroSlides.length) % heroSlides.length
    renderHeroSlide(activeHeroIdx, 'prev')
    startHeroSlideshow()
}

function renderHeroSlide(idx, direction = 'next') {
    if (isTransitioning) return
    const hero = heroSlides[idx]
    if (!hero) return
    currentHeroAnime = hero

    const hero1 = document.getElementById('hero-bg-1')
    const hero2 = document.getElementById('hero-bg-2')

    if (hero1 && hero2) {
        const nextImgUrl = `url('${hero.banner || hero.cover}')`

        if (isFirstLoad) {
            hero1.style.transition = 'none'
            hero2.style.transition = 'none'
            
            hero1.style.backgroundImage = nextImgUrl
            hero1.style.transform = 'translateX(0)'
            hero1.style.opacity = '1'
            hero1.style.zIndex = '2'
            
            hero2.style.backgroundImage = ''
            hero2.style.transform = 'translateX(100%)'
            hero2.style.opacity = '0'
            hero2.style.zIndex = '1'
            
            // Force reflow
            hero1.offsetHeight
            
            hero1.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease'
            hero2.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease'
            
            activeBuffer = 1
            isFirstLoad = false
        } else {
            isTransitioning = true
            const activeEl = activeBuffer === 1 ? hero1 : hero2
            const nextEl   = activeBuffer === 1 ? hero2 : hero1

            // 1. Set background image on off-screen buffer
            nextEl.style.backgroundImage = nextImgUrl

            // 2. Prepare nextEl start position and trigger sliding transitions based on direction
            if (direction === 'prev') {
                nextEl.style.transition = 'none'
                nextEl.style.transform = 'translateX(-100%)'
                nextEl.style.opacity = '0'
                nextEl.offsetHeight // Force reflow
                nextEl.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease'

                activeEl.style.zIndex = '1'
                nextEl.style.zIndex   = '2'

                // Animate active right with fade-out, next in from left with fade-in
                activeEl.style.transform = 'translateX(100%)'
                activeEl.style.opacity   = '0'
                nextEl.style.transform   = 'translateX(0)'
                nextEl.style.opacity     = '1'
            } else {
                nextEl.style.transition = 'none'
                nextEl.style.transform = 'translateX(100%)'
                nextEl.style.opacity = '0'
                nextEl.offsetHeight // Force reflow
                nextEl.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease'

                activeEl.style.zIndex = '1'
                nextEl.style.zIndex   = '2'

                // Animate active left with fade-out, next in from right with fade-in
                activeEl.style.transform = 'translateX(-100%)'
                activeEl.style.opacity   = '0'
                nextEl.style.transform   = 'translateX(0)'
                nextEl.style.opacity     = '1'
            }

            // 3. Switch active state pointer
            activeBuffer = activeBuffer === 1 ? 2 : 1

            // 4. Snap the old active element back to translateX(100%) and opacity 0 after transition finishes
            setTimeout(() => {
                activeEl.style.transition = 'none'
                activeEl.style.transform = 'translateX(100%)'
                activeEl.style.opacity = '0'
                activeEl.offsetHeight // Force reflow
                activeEl.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease'
                isTransitioning = false
            }, 600)
        }
    }

    document.getElementById('hero-title').textContent = hero.title
    document.getElementById('hero-alt').textContent   = hero.altTitle || ''
    document.getElementById('hero-tag').textContent   = `#${idx + 1} Spotlight`

    // meta pills
    const metaEl = document.getElementById('hero-meta')
    if (metaEl) {
        const type = hero.mediaType || 'TV'
        const durationText = type === 'Movie' ? '120 min' : '24 min per ep'
        const ratingVal = typeof hero.rating === 'number' ? hero.rating.toFixed(1) : (hero.rating || '0.0')
        metaEl.innerHTML = `
            <span class="hero-meta-item"><span class="meta-dot">●</span> ${type}</span>
            <span class="hero-meta-item">🕒 ${durationText}</span>
            <span class="badge-hd">HD</span>
            <span class="badge-rating">★ ${ratingVal}</span>
        `
    }

    document.getElementById('hero-desc').textContent = (hero.synopsis || '').substring(0, 240) + '...'

    // watchlist / gamelist button state
    const inList = currentHub === 'gaming'
        ? myGamelist.find(e => e.game && (e.game._id === hero._id || e.game === hero._id))
        : myWatchlist.find(e => e.anime && (e.anime._id === hero._id || e.anime === hero._id))
    const wlBtn = document.getElementById('hero-wl-btn')
    if (wlBtn) {
        if (inList) {
            wlBtn.textContent = currentHub === 'gaming' ? '✓ In Library' : '✓ In Watchlist'
            wlBtn.style.color = '#4ade80'
        } else {
            wlBtn.textContent = currentHub === 'gaming' ? '+ Add to Library' : '+ Add to Watchlist'
            wlBtn.style.color = ''
        }
    }

    // render dot selectors
    const dotsEl = document.getElementById('hero-dots')
    if (dotsEl) {
        dotsEl.innerHTML = heroSlides.map((_, i) => 
            `<span class="hdot ${i === idx ? 'on' : ''}" onclick="setHeroSlide(${i})"></span>`
        ).join('')
    }
}

function renderHome() {
    const dataset = currentHub === 'gaming' ? allGames : allAnime
    if (!dataset.length) return
    isFirstLoad = true

    heroSlides = currentHub === 'gaming'
        ? dataset.filter(g => g.isTrending || g.rating >= 8.5).slice(0, 7)
        : dataset.filter(a => a.isTrending).sort((a, b) => (a.trendingRank || 9999) - (b.trendingRank || 9999)).slice(0, 7)

    if (!heroSlides.length && dataset.length) {
        heroSlides = dataset.slice(0, 7)
    }

    if (heroSlides.length > 0) {
        activeHeroIdx = 0
        renderHeroSlide(activeHeroIdx)
        startHeroSlideshow()

        // Bind hover actions to pause/resume slideshow
        const heroContainer = document.getElementById('hero')
        if (heroContainer && !heroContainer._bound) {
            heroContainer._bound = true
            heroContainer.addEventListener('mouseenter', stopHeroSlideshow)
            heroContainer.addEventListener('mouseleave', startHeroSlideshow)
        }
    }

    // Clear mini cards as they are replaced by slideshow dots
    const minisEl = document.getElementById('hero-minis')
    if (minisEl) minisEl.innerHTML = ''

    // Render the categories
    renderHomeSections()
}

let homeGridsExpanded = {
    recommendations: false,
    trending: false,
    popular: false,
    favorite: false,
    airing: false
}

function toggleHomeSection(section) {
    homeGridsExpanded[section] = !homeGridsExpanded[section]
    
    const linkEl = document.getElementById(`see-all-${section}`)
    if (linkEl) {
        linkEl.innerHTML = homeGridsExpanded[section] ? 'See less' : 'See all &rarr;'
    }
    
    renderHomeSections()
}

function renderHomeSections() {
    if (currentHub === 'gaming') {
        const recsLimit = homeGridsExpanded.recommendations ? 20 : 7
        const recsList = aiGameRecommendations.length ? aiGameRecommendations : allGames
        renderAnimeGrid('recommendations-grid', recsList.slice(0, recsLimit), !homeGridsExpanded.recommendations && recsList.length > 7)

        const trendingLimit = homeGridsExpanded.trending ? 20 : 7
        const trending = allGames.filter(g => g.isTrending || g.rating >= 8.5)
        renderAnimeGrid('trending-grid', trending.slice(0, trendingLimit), !homeGridsExpanded.trending && trending.length > 7)

        const popularLimit = homeGridsExpanded.popular ? 20 : 7
        const popular = [...allGames].sort((a, b) => (b.rating || 0) - (a.rating || 0))
        renderAnimeGrid('popular-grid', popular.slice(0, popularLimit), !homeGridsExpanded.popular && popular.length > 7)

        const favoriteLimit = homeGridsExpanded.favorite ? 20 : 7
        const favorite = [...allGames].sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0))
        renderAnimeGrid('favorite-grid', favorite.slice(0, favoriteLimit), !homeGridsExpanded.favorite && favorite.length > 7)

        const airingLimit = homeGridsExpanded.airing ? 20 : 7
        renderAnimeGrid('airing-grid', allGames.slice(0, airingLimit), !homeGridsExpanded.airing && allGames.length > 7)

        renderGenreCards()

        const topList = [...allGames].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10)
        renderTopList(topList)
        return
    }

    // AI Recommendations
    const recsLimit = homeGridsExpanded.recommendations ? 20 : 7
    renderAnimeGrid('recommendations-grid', aiRecommendations.slice(0, recsLimit), !homeGridsExpanded.recommendations && aiRecommendations.length > 7)

    // Trending Now
    const trendingLimit = homeGridsExpanded.trending ? 20 : 7
    const trending = allAnime
        .filter(a => a.isTrending)
        .sort((a, b) => (a.trendingRank || 9999) - (b.trendingRank || 9999))
    renderAnimeGrid('trending-grid', trending.slice(0, trendingLimit), !homeGridsExpanded.trending && trending.length > 7)

    // Most Popular
    const popularLimit = homeGridsExpanded.popular ? 20 : 7
    const popular = allAnime
        .filter(a => a.isPopular)
        .sort((a, b) => (a.popularityRank || 9999) - (b.popularityRank || 9999))
    renderAnimeGrid('popular-grid', popular.slice(0, popularLimit), !homeGridsExpanded.popular && popular.length > 7)

    // Most Favorite
    const favoriteLimit = homeGridsExpanded.favorite ? 20 : 7
    const favorite = allAnime
        .slice()
        .sort((a, b) => b.rating - a.rating)
    renderAnimeGrid('favorite-grid', favorite.slice(0, favoriteLimit), !homeGridsExpanded.favorite && favorite.length > 7)

    // Top Airing
    const airingLimit = homeGridsExpanded.airing ? 20 : 7
    const airing = allAnime
        .filter(a => a.releaseStatus === 'Ongoing' || a.status === 'Ongoing')
        .sort((a, b) => b.rating - a.rating)
    renderAnimeGrid('airing-grid', airing.slice(0, airingLimit), !homeGridsExpanded.airing && airing.length > 7)

    // genre cards
    renderGenreCards()

    // Top Ranked List
    const topList = [...allAnime].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10)
    renderTopList(topList)
}

async function heroAddWatchlist() {
    if (!currentHeroAnime) return
    if (currentHub === 'gaming') {
        try {
            await api.addGamelist(currentHeroAnime._id, 'plan_to_play')
            await loadGamelist()
            document.getElementById('hero-wl-btn').textContent = '✓ In Library'
            document.getElementById('hero-wl-btn').style.color = '#4ade80'
            showToast('Added to Game Library! 🎮', 'like')
        } catch (e) {
            console.error('Add gamelist error:', e)
        }
    } else {
        addToWlById(currentHeroAnime._id, 'plan_to_watch', () => {
            document.getElementById('hero-wl-btn').textContent = '✓ In Watchlist'
            document.getElementById('hero-wl-btn').style.color = '#4ade80'
            toast('Added to watchlist', 'ok')
        })
    }
}

// Genre cards
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
    Thriller:     'linear-gradient(135deg,#ef4444,#991b1b)',
    RPG:          'linear-gradient(135deg,#8b5cf6,#4c1d95)',
    'Open World': 'linear-gradient(135deg,#10b981,#047857)',
    SciFi:        'linear-gradient(135deg,#06b6d4,#0369a1)'
}

function renderGenreCards() {
    const isGaming = currentHub === 'gaming'
    const genres = isGaming
        ? ['Action', 'RPG', 'Open World', 'Sci-Fi', 'Fantasy', 'Horror', 'Adventure', 'Sports']
        : ['Action', 'Romance', 'Psychological', 'Fantasy', 'Sci-Fi', 'Horror', 'Supernatural', 'Comedy']
    const dataset = isGaming ? allGames : allAnime
    const el = document.getElementById('genre-grid')
    if (!el) return
    el.innerHTML = genres.map(g => {
        const count = dataset.filter(a => (a.genres || []).includes(g)).length
        const bg = genreColors[g] || 'linear-gradient(135deg,#374151,#1f2937)'
        return `
            <div class="gcrd" style="background:${bg}" onclick="goPageWithGenre('${g}')">
                <div class="gname">${g}</div>
                <div class="gcnt">${count} ${isGaming ? 'games' : 'anime'}</div>
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

// Anime grid renderer
function renderAnimeGrid(containerId, list, showViewMore = false) {
    const el = document.getElementById(containerId)
    if (!el) return

    if (!list.length) {
        el.innerHTML = '<p style="color:var(--txt3);font-size:13px">Nothing here yet</p>'
        return
    }

    let html = list.map(a => animeCardHTML(a)).join('')

    if (showViewMore) {
        const sectionKey = containerId.split('-')[0]
        html += `
            <div class="acard view-more-card" onclick="toggleHomeSection('${sectionKey}')">
                <div class="acard-img view-more-inner">
                    <div class="vm-icon">➕</div>
                    <div class="vm-text">View More</div>
                </div>
            </div>
        `
    }

    el.innerHTML = html
}

function animeCardHTML(a) {
    const isGame = currentHub === 'gaming' || a.platforms || a.developer
    const inList = isGame
        ? myGamelist.find(e => e.game && (e.game._id === a._id || e.game === a._id))
        : myWatchlist.find(e => e.anime && (e.anime._id === a._id || e.anime === a._id))
    const fallback = isGame ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80' : 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'

    const badgeHTML = a.matchPercentage 
        ? `<span class="acard-match-badge">${a.matchPercentage}</span>` 
        : (a.isTrending ? '<span class="acard-badge">🔥</span>' : '')

    const reasonHTML = a.matchReason 
        ? `<div class="acard-ai-reason" title="${a.matchReason}">${a.matchReason}</div>` 
        : ''

    const subInfo = isGame
        ? (a.platforms || []).map(p => `<span class="platform-badge ${p.toLowerCase()}">${p}</span>`).join('')
        : (a.genres || []).join(', ')

    return `
        <div class="acard" onclick="openDetail('${a._id}')">
            <div class="acard-img">
                <img src="${a.cover || fallback}" alt="${a.title}" onerror="this.src='${fallback}'">
                <div class="acard-overlay"></div>
                ${badgeHTML}
                <div class="acard-rating"><span class="s">★</span>${a.rating}</div>
                ${inList ? '<div class="wl-dot"></div>' : ''}
                <div class="acard-info">
                    <div class="acard-title">${a.title}</div>
                    <div class="acard-genre">${subInfo}</div>
                    ${reasonHTML}
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
    const isGaming = currentHub === 'gaming'
    const fallback = isGaming ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80' : 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'
    el.innerHTML = list.map((a, i) => {
        const subText = isGaming ? (a.developer || (a.platforms || []).join(', ')) : (a.studio || '')
        const metaInfo = isGaming ? `${a.releaseYear || ''}` : `${a.episodes || ''} eps`
        return `
            <div class="titem" onclick="openDetail('${a._id}')">
                <div class="trank">${i + 1}</div>
                <img class="timg" src="${a.cover || fallback}" alt="${a.title}" onerror="this.src='${fallback}'">
                <div class="tinfo">
                    <div class="ttitle">${a.title}</div>
                    <div class="tstudio">${subText}</div>
                    <div class="tmeta">
                        <span class="trat">★ ${a.rating}</span>
                        <span class="teps">${metaInfo}</span>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// Discover page
function renderDiscover() {
    filterDiscover()
    initDailyTinderDeck()
    const shouldOpenDeck = window._returnToSwipeDeck === true
    toggleTinderDeck(shouldOpenDeck)
    window._returnToSwipeDeck = false
}

function filterDiscover() {
    const search    = (document.getElementById('disc-search')?.value || '').trim()
    const genre     = document.getElementById('disc-genre')?.value || 'All'
    const minRating = parseFloat(document.getElementById('disc-min-rating')?.value || '0')

    const isGaming = currentHub === 'gaming'
    let list = isGaming ? [...allGames] : [...allAnime]
    const isDefault = !search && genre === 'All' && minRating === 0

    if (isDefault) {
        if (isGaming) {
            list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 20)
            document.getElementById('disc-count').textContent = '⭐ Popular Games'
        } else {
            list = list
                .filter(a => a.isPopular)
                .sort((a, b) => (a.popularityRank || 9999) - (b.popularityRank || 9999))
                .slice(0, 20)
            document.getElementById('disc-count').textContent = '⭐ Popular Anime'
        }
    } else {
        if (search) {
            // Debounce backend query to prevent API spam while typing
            clearTimeout(window._searchTimer)
            window._searchTimer = setTimeout(async () => {
                const res = isGaming
                    ? await api.getGames({ search, genre, minRating })
                    : await api.getAnime({ search, genre, status: 'All', sort: 'rating', minRating })
                if (res.ok) {
                    document.getElementById('disc-count').textContent = `${res.data.length} ${isGaming ? 'games' : 'anime'} found`
                    renderAnimeGrid('disc-grid', res.data)
                }
            }, 300)

            // Instant local filter for immediate visual response
            list = list.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
        }

        if (genre  !== 'All') list = list.filter(a => (a.genres || []).includes(genre))
        if (minRating > 0) list = list.filter(a => a.rating >= minRating)

        // Default sort by rating
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0))

        document.getElementById('disc-count').textContent = `${list.length} ${isGaming ? 'games' : 'anime'} found`
    }

    renderAnimeGrid('disc-grid', list)
}

function showTrendingSearches() {
    const box = document.getElementById('trending-searches')
    const fbox = document.getElementById('filter-dropdown')
    if (fbox) fbox.classList.add('hidden')
    if (box) box.classList.remove('hidden')
}

function hideTrendingSearchesSoon() {
    // delay slightly to allow click event on tags to fire first
    setTimeout(() => {
        const box = document.getElementById('trending-searches')
        if (box) box.classList.add('hidden')
    }, 200)
}

function selectTrendingSearch(title) {
    const input = document.getElementById('disc-search')
    if (input) {
        input.value = title
        filterDiscover()
    }
}

function toggleFilterPanel(event) {
    if (event) event.stopPropagation()
    const fbox = document.getElementById('filter-dropdown')
    const tbox = document.getElementById('trending-searches')
    if (fbox) {
        const isHidden = fbox.classList.contains('hidden')
        if (isHidden) {
            if (tbox) tbox.classList.add('hidden')
            fbox.classList.remove('hidden')
        } else {
            fbox.classList.add('hidden')
        }
    }
}

// ── TOAST NOTIFICATIONS ──
function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container')
    if (!container) {
        container = document.createElement('div')
        container.id = 'toast-container'
        container.className = 'toast-container'
        document.body.appendChild(container)
    }
    const t = document.createElement('div')
    t.className = `toast-msg toast-${type}`
    t.innerHTML = msg
    container.appendChild(t)
    setTimeout(() => {
        t.style.opacity = '0'
        t.style.transform = 'translateY(-15px) scale(0.95)'
        t.style.transition = 'all 0.3s ease'
        setTimeout(() => t.remove(), 300)
    }, 2400)
}

// ── TINDER HOURLY SWIPE DECK MODULE ──
let tinderDeck = []
let tinderIndex = 0
let tinderRejected = []
let isTinderDeckActive = false
let currentTinderHourKey = ''

function getTinderHourKey() {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    return `${year}-${month}-${day}-${hour}`
}

function getTinderStorageKey() {
    const uid = currentUser ? currentUser._id : 'guest'
    return `cf_tinder_v5_${currentHub}_${uid}_${getTinderHourKey()}`
}

function getTinderCountdownText() {
    const now = new Date()
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0)
    const diffMs = nextHour.getTime() - now.getTime()
    if (diffMs <= 0) return '00:00'
    const totalSec = Math.floor(diffMs / 1000)
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function startTinderCountdownTimer() {
    clearInterval(window._tinderTimer)
    currentTinderHourKey = getTinderHourKey()

    updateTinderTimerUI()
    window._tinderTimer = setInterval(() => {
        const hourKeyNow = getTinderHourKey()
        if (hourKeyNow !== currentTinderHourKey) {
            currentTinderHourKey = hourKeyNow
            initDailyTinderDeck()
            return
        }
        updateTinderTimerUI()
    }, 1000)
}

function updateTinderTimerUI() {
    const timerEl = document.getElementById('td-timer')
    if (timerEl) {
        timerEl.textContent = `⏳ ${getTinderCountdownText()}`
    }
}

async function initDailyTinderDeck() {
    let dataset = currentHub === 'gaming' ? allGames : allAnime
    if (!dataset || !dataset.length) {
        if (currentHub === 'gaming') await loadAllGames()
        else await loadAllAnime()
        dataset = currentHub === 'gaming' ? allGames : allAnime
    }
    if (!dataset || !dataset.length) return

    const key = getTinderStorageKey()
    let saved = null
    try {
        saved = JSON.parse(localStorage.getItem(key) || 'null')
    } catch (e) {}

    if (saved && Array.isArray(saved.deckIds) && saved.deckIds.length > 0) {
        tinderDeck = saved.deckIds.map(id => dataset.find(a => String(a._id) === String(id))).filter(Boolean)
        tinderIndex = Math.min(saved.index || 0, tinderDeck.length)
        tinderRejected = (saved.rejectedIds || []).map(id => dataset.find(a => String(a._id) === String(id))).filter(Boolean)
    }

    if (!tinderDeck.length || tinderDeck.length < 10) {
        const shuffled = [...dataset].sort(() => 0.5 - Math.random())
        tinderDeck = shuffled.slice(0, 10)
        tinderIndex = 0
        tinderRejected = []
        saveTinderState()
    }

    // Update Tinder Deck UI labels based on currentHub
    const tdTitle = document.querySelector('.td-title')
    const tdIcon = document.querySelector('.td-icon')
    const tdAcceptLbl = document.querySelector('.td-accept-btn .td-btn-lbl')
    const tdAcceptIcon = document.querySelector('.td-accept-btn .td-btn-icon')
    if (tdTitle) tdTitle.textContent = currentHub === 'gaming' ? 'Hourly Game Swipe Deck' : 'Hourly Anime Swipe Deck'
    if (tdIcon) tdIcon.textContent = currentHub === 'gaming' ? '🎮' : '🔥'
    if (tdAcceptLbl) tdAcceptLbl.textContent = currentHub === 'gaming' ? 'Plan to Play' : 'Plan to Watch'
    if (tdAcceptIcon) tdAcceptIcon.textContent = currentHub === 'gaming' ? '🎮' : '❤️'
}

function saveTinderState() {
    const key = getTinderStorageKey()
    const state = {
        deckIds: tinderDeck.map(a => a._id),
        index: tinderIndex,
        rejectedIds: tinderRejected.map(a => a._id)
    }
    localStorage.setItem(key, JSON.stringify(state))
}

async function resetDailyTinderDeck() {
    let dataset = currentHub === 'gaming' ? allGames : allAnime
    if (!dataset || !dataset.length) {
        if (currentHub === 'gaming') await loadAllGames()
        else await loadAllAnime()
        dataset = currentHub === 'gaming' ? allGames : allAnime
    }
    if (!dataset || !dataset.length) return

    const key = getTinderStorageKey()
    localStorage.removeItem(key)

    const shuffled = [...dataset].sort(() => 0.5 - Math.random())
    tinderDeck = shuffled.slice(0, 10)
    tinderIndex = 0
    tinderRejected = []
    saveTinderState()
    renderTinderCard()
    showToast('🔄 Hourly Swipe Deck Refreshed!', 'info')
}

async function toggleTinderDeck(show) {
    const overlay = document.getElementById('tinder-deck-overlay')
    const grid = document.getElementById('disc-grid')

    if (!overlay) return

    let shouldShow = show
    if (typeof show !== 'boolean') {
        shouldShow = overlay.classList.contains('hidden')
    }

    if (shouldShow) {
        isTinderDeckActive = true
        if (!tinderDeck.length) await initDailyTinderDeck()
        overlay.classList.remove('hidden')
        if (grid) grid.classList.add('disc-grid-blurred')
        startTinderCountdownTimer()
        renderTinderCard()
    } else {
        isTinderDeckActive = false
        overlay.classList.add('hidden')
        if (grid) grid.classList.remove('disc-grid-blurred')
        clearInterval(window._tinderTimer)
    }
}

function renderTinderCard() {
    const container = document.getElementById('tinder-card-container')
    const counter = document.getElementById('td-counter')
    const redoBtn = document.getElementById('td-redo-btn')

    if (!container) return

    if (redoBtn) redoBtn.disabled = tinderRejected.length === 0

    const isGaming = currentHub === 'gaming'

    if (tinderIndex >= tinderDeck.length) {
        if (counter) counter.textContent = 'Done for Today 🎉'
        container.innerHTML = `
            <div class="tinder-empty-card">
                <div style="font-size:42px;margin-bottom:12px">🎉</div>
                <h3 style="font-size:18px;font-weight:900;color:var(--txt1);margin-bottom:6px">You're all caught up!</h3>
                <p style="font-size:13px;color:var(--txt2);margin-bottom:16px;max-width:280px;line-height:1.4">
                    You've reviewed all 10 hourly ${isGaming ? 'game' : 'anime'} recommendations. Come back next hour for 10 fresh picks!
                </p>
                <div style="display:flex;gap:10px">
                    <button class="btn btn-s" onclick="redoLastReject()" ${tinderRejected.length === 0 ? 'disabled' : ''}>
                        🔂 Undo Last Reject
                    </button>
                    <button class="btn btn-p" onclick="toggleTinderDeck(false)">
                        ✨ Explore All ${isGaming ? 'Games' : 'Anime'}
                    </button>
                </div>
            </div>
        `
        return
    }

    const item = tinderDeck[tinderIndex]
    if (counter) counter.textContent = `Card ${tinderIndex + 1} of ${tinderDeck.length}`

    const fallback = isGaming ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80' : 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'
    const genres = isGaming
        ? (item.platforms || item.genres || []).slice(0, 3).join(' • ')
        : (item.genres || []).slice(0, 3).join(' • ') || 'Anime'

    const stampAcceptLbl = isGaming ? 'PLAN TO PLAY' : 'PLAN TO WATCH'

    container.innerHTML = `
        <div class="tinder-card" id="active-tinder-card">
            <div class="stamp-watchlist" id="stamp-watchlist">${stampAcceptLbl}</div>
            <div class="stamp-reject" id="stamp-reject">REJECT</div>

            <div class="tinder-card-img-wrap">
                <img class="tinder-card-img" src="${item.cover || fallback}" alt="${item.title}" onerror="this.src='${fallback}'">
            </div>
            <div class="tinder-card-info">
                <div class="tinder-card-title" onclick="event.stopPropagation(); openDetail(tinderDeck[tinderIndex], true)" style="cursor:pointer" title="Click to view full detail page">${item.title} 🔗</div>
                <div class="tinder-card-meta">
                    <span style="color:var(--yellow);font-weight:800">★ ${item.rating ? (typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating) : 'N/A'}</span>
                    <span>•</span>
                    <span>${genres}</span>
                </div>
                <div class="tinder-card-desc" onclick="event.stopPropagation(); openDetail(tinderDeck[tinderIndex], true)" style="cursor:pointer">${item.description || item.synopsis || 'Click for full details.'}</div>
            </div>
        </div>
    `

    const cardEl = document.getElementById('active-tinder-card')
    if (cardEl) attachTinderCardDrag(cardEl, item)
}

function attachTinderCardDrag(cardEl, anime) {
    let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false
    const stampWatchlist = cardEl.querySelector('#stamp-watchlist')
    const stampReject = cardEl.querySelector('#stamp-reject')

    const onStart = (e) => {
        isDragging = true
        const pt = e.touches ? e.touches[0] : e
        startX = pt.clientX
        startY = pt.clientY
        cardEl.style.transition = 'none'
    }

    const onMove = (e) => {
        if (!isDragging) return
        const pt = e.touches ? e.touches[0] : e
        currentX = pt.clientX - startX
        currentY = pt.clientY - startY

        const rotate = Math.min(25, Math.max(-25, currentX * 0.08))
        cardEl.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`

        if (currentX > 20) {
            // Dragging RIGHT = LIKE (Plan to Watch)
            const op = Math.min(1, currentX / 100)
            if (stampWatchlist) stampWatchlist.style.opacity = op
            if (stampReject) stampReject.style.opacity = 0
        } else if (currentX < -20) {
            // Dragging LEFT = REJECT
            const op = Math.min(1, Math.abs(currentX) / 100)
            if (stampReject) stampReject.style.opacity = op
            if (stampWatchlist) stampWatchlist.style.opacity = 0
        } else {
            if (stampWatchlist) stampWatchlist.style.opacity = 0
            if (stampReject) stampReject.style.opacity = 0
        }
    }

    const onEnd = (e) => {
        if (!isDragging) return
        isDragging = false
        cardEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease'

        if (currentX > 100) {
            // Slide to Right -> LIKED
            cardEl.style.transform = 'translate(400px, 0px) rotate(30deg)'
            cardEl.style.opacity = '0'
            setTimeout(() => swipeAnime('like'), 200)
        } else if (currentX < -100) {
            // Slide to Left -> REJECT
            cardEl.style.transform = 'translate(-400px, 0px) rotate(-30deg)'
            cardEl.style.opacity = '0'
            setTimeout(() => swipeAnime('reject'), 200)
        } else {
            if (Math.abs(currentX) < 8 && Math.abs(currentY) < 8) {
                openDetail(anime, true)
            }
            cardEl.style.transform = 'none'
            if (stampWatchlist) stampWatchlist.style.opacity = 0
            if (stampReject) stampReject.style.opacity = 0
        }
        currentX = 0
        currentY = 0
    }

    cardEl.addEventListener('mousedown', onStart)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)

    cardEl.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
}

async function swipeAnime(action) {
    if (tinderIndex >= tinderDeck.length) return
    const item = tinderDeck[tinderIndex]
    if (!item) return

    const isGaming = currentHub === 'gaming'

    if (action === 'like' || action === 'right') {
        const itemId = item._id
        if (isGaming) {
            const inList = myGamelist.some(w => String(w.game?._id || w.game || w._id || w) === String(itemId))
            if (!inWL) {
                try {
                    const res = await api.addGamelist(itemId, 'plan_to_play')
                    if (res && res.ok && res.data) {
                        myGamelist.push(res.data)
                    }
                } catch (e) {
                    console.error('Gamelist add error:', e)
                }
            } else {
                try {
                    await api.updateGamelist(itemId, { playStatus: 'plan_to_play' })
                } catch (e) {}
            }
            showToast('🎮 Liked! Sent to Plan to Play', 'like')
        } else {
            const inWL = myWatchlist.some(w => String(w.anime?._id || w.anime || w._id || w) === String(itemId))
            if (!inWL) {
                try {
                    const res = await api.addWatchlist(itemId, 'plan_to_watch')
                    if (res && res.ok && res.data) {
                        myWatchlist.push(res.data)
                    }
                } catch (e) {
                    console.error('Watchlist add error:', e)
                }
            } else {
                try {
                    await api.updateWatchlist(itemId, { watchStatus: 'plan_to_watch' })
                } catch (e) {}
            }
            showToast('❤️ Liked! Sent to Plan to Watch', 'like')
        }
    } else if (action === 'reject' || action === 'left') {
        tinderRejected.push(item)
        showToast('❌ Removed!', 'remove')
    }

    tinderIndex++
    saveTinderState()
    renderTinderCard()
}

function redoLastReject() {
    if (!tinderRejected.length) return
    const lastAnime = tinderRejected.pop()

    tinderIndex = Math.max(0, tinderIndex - 1)
    tinderDeck[tinderIndex] = lastAnime

    saveTinderState()
    renderTinderCard()
    showToast('🔂 Restored to deck')
}

// Close filter panel when clicking outside
window.addEventListener('click', (e) => {
    const fbox = document.getElementById('filter-dropdown')
    const fbtn = document.getElementById('filter-toggle-btn')
    if (fbox && !fbox.classList.contains('hidden')) {
        if (!fbox.contains(e.target) && e.target !== fbtn) {
            fbox.classList.add('hidden')
        }
    }
})

// Anime & Game detail
async function openDetail(itemOrId, fromSwipeDeck = false) {
    if (fromSwipeDeck) {
        window._returnToSwipeDeck = true
    }

    let item = itemOrId
    if (typeof item === 'string') {
        if (item.trim().startsWith('{')) {
            try { item = JSON.parse(item) } catch (e) {}
        }
        if (typeof item === 'string') {
            const id = item.trim()
            item = allAnime.find(a => String(a._id) === id) ||
                   allGames.find(g => String(g._id) === id) ||
                   aiRecommendations.find(a => String(a._id) === id) ||
                   aiGameRecommendations.find(g => String(g._id) === id) ||
                   myWatchlist.find(w => String(w.anime?._id || w.anime) === id)?.anime ||
                   myGamelist.find(w => String(w.game?._id || w.game) === id)?.game ||
                   tinderDeck.find(d => String(d._id) === id)

            if (!item) {
                const res = currentHub === 'gaming' || id.startsWith('rawg-')
                    ? await api.getOneGame(id)
                    : await api.getOneAnime(id)
                if (res && res.ok && res.data) {
                    item = res.data
                }
            }
        }
    }

    if (!item || typeof item !== 'object') {
        console.error('openDetail failed: item not found', itemOrId)
        return
    }

    const isGame = currentHub === 'gaming' || item.platforms || item.developer

    // Sync RAWG or MAL items with backend if needed
    if (isGame && item._id && item._id.toString().startsWith('rawg-')) {
        const syncRes = await api.getOneGame(item._id)
        if (syncRes.ok && syncRes.data) {
            item = syncRes.data
        }
    } else if (!isGame && item._id && item._id.toString().startsWith('mal-')) {
        const syncRes = await api.getOneAnime(item._id)
        if (syncRes.ok && syncRes.data) {
            item = syncRes.data
        }
    }

    currentDetailAnime = item
    prevPage = document.querySelector('.page.active')?.id?.replace('pg-', '') || 'home'

    const fallback = isGame ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80' : 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'

    const banner = document.getElementById('d-banner')
    if (banner) {
        banner.src = item.banner || item.cover || fallback
        banner.onerror = () => { banner.src = item.cover || fallback }
    }
    const coverEl = document.getElementById('d-cover')
    if (coverEl) coverEl.src = item.cover || fallback

    const titleEl = document.getElementById('d-title')
    if (titleEl) titleEl.textContent = item.title

    const altEl = document.getElementById('d-alt')
    if (altEl) altEl.textContent = item.developer || item.altTitle || ''

    const tagsEl = document.getElementById('d-tags')
    if (tagsEl) {
        tagsEl.innerHTML = `<span class="hero-rating">★ ${item.rating || 0}</span>`
        ;(item.genres || []).forEach(g => tagsEl.innerHTML += `<span class="pill">${g}</span>`)

        if (isGame) {
            (item.platforms || []).forEach(p => tagsEl.innerHTML += `<span class="platform-badge ${p.toLowerCase()}">${p}</span>`)
            if (item._id && item._id.toString().startsWith('rawg-')) {
                tagsEl.innerHTML += `<span class="pill" style="color:#a78bfa">🎮 RAWG</span>`
            }
        } else {
            const sColor = item.releaseStatus === 'Completed' ? '#4ade80' : '#60a5fa'
            if (item.releaseStatus) tagsEl.innerHTML += `<span class="pill" style="color:${sColor}">${item.releaseStatus}</span>`
        }
    }

    const statsEl = document.getElementById('d-stats')
    if (statsEl) {
        if (isGame) {
            statsEl.innerHTML = `
                <span>🎮 ${(item.platforms || []).join(', ') || 'Multi-platform'}</span>
                <span>🏢 ${item.developer || '—'}</span>
                <span>📅 ${item.releaseYear || '—'}</span>
            `
        } else {
            statsEl.innerHTML = `
                <span>📺 ${item.mediaType || 'TV'}</span>
                <span>🎬 ${item.studio || '—'}</span>
                <span>📅 ${item.year || '—'}</span>
                <span>🎞️ ${item.episodes || '?'} eps</span>
            `
        }
    }

    const synEl = document.getElementById('d-synopsis')
    if (synEl) synEl.textContent = item.description || item.synopsis || 'No description available.'

    const chatTitle = document.getElementById('dchat-title')
    if (chatTitle) chatTitle.textContent = `${item.title} Chat`

    const dataset = isGame ? allGames : allAnime
    const related = dataset.filter(a =>
        a._id !== item._id && (a.genres || []).some(g => (item.genres || []).includes(g))
    ).slice(0, 4)
    renderAnimeGrid('d-related', related)

    refreshWlPanel(item._id)
    loadRoomChat(item._id, 'dchat-msgs', 'dchat-emobar')
    switchDTab('info', document.querySelector('.dtab'))

    goPage('detail')
}

function switchDTab(tab, clickedEl) {
    document.querySelectorAll('.dtab').forEach(t => t.classList.remove('on'))
    document.querySelectorAll('.dtab-content').forEach(c => c.classList.remove('on'))
    if (clickedEl) clickedEl.classList.add('on')
    document.getElementById('dt-' + tab)?.classList.add('on')
}

function refreshWlPanel(itemId) {
    const isGaming = currentHub === 'gaming' || (currentDetailAnime && (currentDetailAnime.platforms || currentDetailAnime.developer))
    const entry = isGaming
        ? myGamelist.find(e => e.game && (e.game._id === itemId || String(e.game) === String(itemId)))
        : myWatchlist.find(e => e.anime && (e.anime._id === itemId || String(e.anime) === String(itemId)))

    const addArea  = document.getElementById('wl-add-btns')
    const editArea = document.getElementById('wl-edit-area')

    if (!addArea || !editArea) return

    if (!entry) {
        addArea.classList.remove('hidden')
        editArea.classList.add('hidden')

        const addBtnsGrid = addArea.querySelector('.wl-status-grid')
        if (addBtnsGrid) {
            addBtnsGrid.innerHTML = isGaming ? `
                <div class="wl-sbtn watching" onclick="addToWl('playing')">🎮 Playing</div>
                <div class="wl-sbtn completed" onclick="addToWl('completed')">✅ Completed</div>
                <div class="wl-sbtn plan_to_watch" onclick="addToWl('plan_to_play')">⏰ Plan to Play</div>
                <div class="wl-sbtn dropped" onclick="addToWl('dropped')">❌ Dropped</div>
            ` : `
                <div class="wl-sbtn watching" onclick="addToWl('watching')">📺 Watching</div>
                <div class="wl-sbtn completed" onclick="addToWl('completed')">✅ Completed</div>
                <div class="wl-sbtn plan_to_watch" onclick="addToWl('plan_to_watch')">⏰ Plan to Watch</div>
                <div class="wl-sbtn dropped" onclick="addToWl('dropped')">❌ Dropped</div>
            `
        }
        return
    }

    addArea.classList.add('hidden')
    editArea.classList.remove('hidden')

    const sel = document.getElementById('wl-status-sel')
    if (sel) {
        sel.innerHTML = isGaming ? `
            <option value="playing">🎮 Playing</option>
            <option value="completed">✅ Completed</option>
            <option value="plan_to_play">⏰ Plan to Play</option>
            <option value="dropped">❌ Dropped</option>
        ` : `
            <option value="watching">📺 Watching</option>
            <option value="completed">✅ Completed</option>
            <option value="plan_to_watch">⏰ Plan to Watch</option>
            <option value="dropped">❌ Dropped</option>
        `
        sel.value = isGaming ? (entry.playStatus || 'plan_to_play') : (entry.watchStatus || 'plan_to_watch')
    }

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
    const isGaming = currentHub === 'gaming' || currentDetailAnime.platforms || currentDetailAnime.developer
    if (isGaming) {
        const res = await api.updateGamelist(currentDetailAnime._id, { userRating: n })
        if (res.ok) {
            await loadGamelist()
            renderStars(n)
            showToast('Rating saved! ⭐', 'info')
        }
    } else {
        const res = await api.updateWatchlist(currentDetailAnime._id, { userRating: n })
        if (res.ok) {
            await loadWatchlist()
            await loadAIRecommendations()
            renderHomeSections()
            renderStars(n)
            showToast('Rating saved', 'info')
        }
    }
}

async function addToWl(status) {
    if (!currentDetailAnime) return
    const isGaming = currentHub === 'gaming' || currentDetailAnime.platforms || currentDetailAnime.developer
    if (isGaming) {
        const res = await api.addGamelist(currentDetailAnime._id, status)
        if (res.ok) {
            await loadGamelist()
            refreshWlPanel(currentDetailAnime._id)
            showToast('Added to Game Library! 🎮', 'like')
        }
    } else {
        await addToWlById(currentDetailAnime._id, status, () => {
            refreshWlPanel(currentDetailAnime._id)
            showToast('Added to watchlist ✓', 'info')
        })
    }
}

async function addToWlById(animeId, status, cb) {
    const res = await api.addWatchlist(animeId, status)
    if (res.ok) {
        await loadWatchlist()
        await loadAIRecommendations()
        renderHomeSections()
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
        await loadAIRecommendations()
        renderHomeSections()
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
        await loadAIRecommendations()
        renderHomeSections()
    }, 700)
}

async function removeFromWl() {
    if (!currentDetailAnime) return
    const res = await api.removeWatchlist(currentDetailAnime._id)
    if (res.ok) {
        await loadWatchlist()
        await loadAIRecommendations()
        renderHomeSections()
        refreshWlPanel(currentDetailAnime._id)
        toast('Removed from watchlist', 'ok')
    }
}

// Watchlist page
let wlFilter = 'all'
let wlSearchQuery = ''
let wlSortMode = 'recent'

function filterWlSearch(val) {
    wlSearchQuery = (val || '').toLowerCase().trim()
    renderWlGrid()
}

function sortWlList(val) {
    wlSortMode = val || 'recent'
    renderWlGrid()
}

function renderWatchlistPage() {
    const isGaming = currentHub === 'gaming'
    const dataset = isGaming ? myGamelist : myWatchlist
    const statusKey = isGaming ? 'playStatus' : 'watchStatus'

    const pageTitle = document.querySelector('#pg-watchlist h1') || document.getElementById('wl-page-title')
    const pageSub = document.getElementById('wl-page-count')
    const tabsContainer = document.getElementById('wl-tabs-container') || document.querySelector('#pg-watchlist .tabs')

    if (pageTitle) pageTitle.textContent = isGaming ? '🎮 My Game Library' : '📚 My Watchlist'
    if (pageSub) pageSub.textContent = isGaming ? `${myGamelist.length} games tracked` : `${myWatchlist.length} anime tracked`

    // Calculate tab counts
    const cntAll = dataset.length
    const cntActive = dataset.filter(e => e[statusKey] === (isGaming ? 'playing' : 'watching')).length
    const cntCompleted = dataset.filter(e => e[statusKey] === 'completed').length
    const cntPlan = dataset.filter(e => e[statusKey] === (isGaming ? 'plan_to_play' : 'plan_to_watch')).length
    const cntDropped = dataset.filter(e => e[statusKey] === 'dropped').length

    if (tabsContainer) {
        tabsContainer.innerHTML = isGaming ? `
            <span class="tbtn ${wlFilter === 'all' ? 'on' : ''}" onclick="filterWl('all',this)">All <span style="opacity:0.7;font-size:11px">(${cntAll})</span></span>
            <span class="tbtn ${wlFilter === 'playing' ? 'on' : ''}" onclick="filterWl('playing',this)">🎮 Playing <span style="opacity:0.7;font-size:11px">(${cntActive})</span></span>
            <span class="tbtn ${wlFilter === 'completed' ? 'on' : ''}" onclick="filterWl('completed',this)">✅ Completed <span style="opacity:0.7;font-size:11px">(${cntCompleted})</span></span>
            <span class="tbtn ${wlFilter === 'plan_to_play' ? 'on' : ''}" onclick="filterWl('plan_to_play',this)">⏰ Plan to Play <span style="opacity:0.7;font-size:11px">(${cntPlan})</span></span>
            <span class="tbtn ${wlFilter === 'dropped' ? 'on' : ''}" onclick="filterWl('dropped',this)">❌ Dropped <span style="opacity:0.7;font-size:11px">(${cntDropped})</span></span>
        ` : `
            <span class="tbtn ${wlFilter === 'all' ? 'on' : ''}" onclick="filterWl('all',this)">All <span style="opacity:0.7;font-size:11px">(${cntAll})</span></span>
            <span class="tbtn ${wlFilter === 'watching' ? 'on' : ''}" onclick="filterWl('watching',this)">📺 Watching <span style="opacity:0.7;font-size:11px">(${cntActive})</span></span>
            <span class="tbtn ${wlFilter === 'completed' ? 'on' : ''}" onclick="filterWl('completed',this)">✅ Completed <span style="opacity:0.7;font-size:11px">(${cntCompleted})</span></span>
            <span class="tbtn ${wlFilter === 'plan_to_watch' ? 'on' : ''}" onclick="filterWl('plan_to_watch',this)">⏰ Plan to Watch <span style="opacity:0.7;font-size:11px">(${cntPlan})</span></span>
            <span class="tbtn ${wlFilter === 'dropped' ? 'on' : ''}" onclick="filterWl('dropped',this)">❌ Dropped <span style="opacity:0.7;font-size:11px">(${cntDropped})</span></span>
        `
    }

    renderWlGrid()
}

function filterWl(tab, btn) {
    wlFilter = tab
    document.querySelectorAll('#pg-watchlist .tbtn').forEach(b => b.classList.remove('on'))
    if (btn) btn.classList.add('on')
    renderWlGrid()
}

function renderWlGrid() {
    const isGaming = currentHub === 'gaming'
    const dataset = isGaming ? myGamelist : myWatchlist
    const statusKey = isGaming ? 'playStatus' : 'watchStatus'

    let list = wlFilter === 'all'
        ? [...dataset]
        : dataset.filter(e => e[statusKey] === wlFilter)

    // Apply Search Filter
    if (wlSearchQuery) {
        list = list.filter(entry => {
            const item = isGaming ? entry.game : entry.anime
            if (!item) return false
            const title = (item.title || '').toLowerCase()
            const studio = (item.developer || item.studio || '').toLowerCase()
            const genres = (item.genres || item.platforms || []).join(' ').toLowerCase()
            return title.includes(wlSearchQuery) || studio.includes(wlSearchQuery) || genres.includes(wlSearchQuery)
        })
    }

    // Apply Sorting
    list.sort((a, b) => {
        const itemA = isGaming ? a.game : a.anime
        const itemB = isGaming ? b.game : b.anime
        if (!itemA || !itemB) return 0

        if (wlSortMode === 'rating') {
            const rA = a.userRating || itemA.rating || 0
            const rB = b.userRating || itemB.rating || 0
            return rB - rA
        } else if (wlSortMode === 'title') {
            return (itemA.title || '').localeCompare(itemB.title || '')
        } else if (wlSortMode === 'progress') {
            const pA = a.ep_progress || a.playtimeHours || 0
            const pB = b.ep_progress || b.playtimeHours || 0
            return pB - pA
        } else {
            // recent (updatedAt / createdAt)
            const tA = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const tB = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return tB - tA
        }
    })

    const grid  = document.getElementById('wl-grid')
    const empty = document.getElementById('wl-empty')

    if (!list.length) {
        if (grid) grid.innerHTML = ''
        if (empty) {
            empty.classList.remove('hidden')
            const emptySub = empty.querySelector('p:last-child')
            if (emptySub) emptySub.textContent = isGaming ? 'Start adding games to track your backlog!' : 'Start adding anime to track your journey!'
        }
        return
    }

    if (empty) empty.classList.add('hidden')
    if (grid) {
        grid.innerHTML = list.map(entry => {
            const item = isGaming ? entry.game : entry.anime
            if (!item) return ''
            const fallback = isGaming ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80' : 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'
            const statusVal = isGaming ? entry.playStatus : entry.watchStatus

            const curEp = entry.ep_progress || 0
            const totalEp = item.episodes || 0
            const curHours = entry.playtimeHours || 0
            const pct = isGaming
                ? (statusVal === 'completed' ? 100 : (curHours > 0 ? Math.min(100, curHours * 5) : 0))
                : (totalEp > 0 ? Math.min(100, Math.round((curEp / totalEp) * 100)) : (curEp > 0 ? 100 : 0))

            const ratingVal = entry.userRating || 0

            return `
                <div class="wl-item" id="wli-${item._id}">
                    <img class="wl-cov" src="${item.cover || fallback}" alt="${item.title}"
                         onclick="openDetail('${item._id}')"
                         onerror="this.src='${fallback}'">
                    <div class="wl-info">
                        <div class="wl-title" onclick="openDetail('${item._id}')" title="${item.title}">${item.title}</div>
                        <div class="wl-studio">${isGaming ? (item.developer || item.publisher || 'Game') : (item.studio || item.mediaType || 'Anime')}</div>
                        
                        <div class="wl-card-controls">
                            <!-- Status Badge & Star Rating -->
                            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                                <span class="sbadge ${statusVal}">${wlStatusLabel(statusVal)}</span>

                                <!-- Star Rating -->
                                <div class="wl-stars" title="Rate 1-5 Stars">
                                    ${[1, 2, 3, 4, 5].map(s => `
                                        <span class="${s <= ratingVal ? 'star-filled' : ''}" onclick="setWlItemScore('${item._id}', ${s})">★</span>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Progress Tracker -->
                            <div>
                                <div class="wl-progress-box">
                                    <span>${isGaming ? `⏱️ <strong>${curHours}</strong> hrs` : `Ep <strong>${curEp}</strong> / ${totalEp || '?'}`}</span>
                                    <div style="display:flex;gap:4px">
                                        <button class="wl-step-btn" onclick="updateWlItemProgress('${item._id}', -1)" title="Decrement">−</button>
                                        <button class="wl-step-btn" onclick="updateWlItemProgress('${item._id}', 1)" title="Increment">+</button>
                                    </div>
                                </div>
                                <div class="wl-prog-bar-wrap">
                                    <div class="wl-prog-bar-fill" style="width:${pct}%"></div>
                                </div>
                            </div>

                            <!-- Action buttons -->
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">
                                <button class="btn btn-g btn-sm" style="font-size:10px;padding:2px 7px" onclick="openDetail('${item._id}')">Details</button>
                                <button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 7px" onclick="quickRemoveWl('${item._id}')">Remove</button>
                            </div>
                        </div>
                    </div>
                </div>
            `
        }).join('')
    }
}

function wlStatusLabel(s) {
    const labels = {
        watching: '📺 Watching',
        playing: '🎮 Playing',
        completed: '✅ Completed',
        plan_to_watch: '⏰ Plan to Watch',
        plan_to_play: '⏰ Plan to Play',
        dropped: '❌ Dropped'
    }
    return labels[s] || s
}

async function updateWlItemStatus(id, newStatus) {
    if (currentHub === 'gaming') {
        const res = await api.updateGamelist(id, { gameStatus: newStatus, playStatus: newStatus })
        if (res.ok) {
            const entry = myGamelist.find(e => String(e.game?._id || e.game || e._id) === String(id))
            if (entry) {
                entry.playStatus = newStatus
                entry.gameStatus = newStatus
            }
            renderWatchlistPage()
            showToast(`Status updated to ${wlStatusLabel(newStatus)}`, 'like')
        }
    } else {
        const res = await api.updateWatchlist(id, { watchStatus: newStatus })
        if (res.ok) {
            const entry = myWatchlist.find(e => String(e.anime?._id || e.anime || e._id) === String(id))
            if (entry) entry.watchStatus = newStatus
            renderWatchlistPage()
            showToast(`Status updated to ${wlStatusLabel(newStatus)}`, 'like')
        }
    }
}

async function updateWlItemProgress(id, delta) {
    if (currentHub === 'gaming') {
        const entry = myGamelist.find(e => String(e.game?._id || e.game || e._id) === String(id))
        const curHours = Math.max(0, (entry?.playtimeHours || 0) + delta)
        const res = await api.updateGamelist(id, { playtimeHours: curHours })
        if (res.ok) {
            if (entry) entry.playtimeHours = curHours
            renderWlGrid()
        }
    } else {
        const entry = myWatchlist.find(e => String(e.anime?._id || e.anime || e._id) === String(id))
        const anime = entry?.anime || {}
        const totalEp = anime.episodes || 9999
        const newProg = Math.max(0, Math.min(totalEp, (entry?.ep_progress || 0) + delta))
        
        const updateData = { ep_progress: newProg }
        if (newProg >= totalEp && totalEp > 0 && entry.watchStatus !== 'completed') {
            updateData.watchStatus = 'completed'
            entry.watchStatus = 'completed'
            showToast('🎉 Series Completed!', 'like')
        }

        const res = await api.updateWatchlist(id, updateData)
        if (res.ok) {
            if (entry) entry.ep_progress = newProg
            renderWlGrid()
        }
    }
}

async function setWlItemScore(id, score) {
    if (currentHub === 'gaming') {
        const res = await api.updateGamelist(id, { userRating: score })
        if (res.ok) {
            const entry = myGamelist.find(e => String(e.game?._id || e.game || e._id) === String(id))
            if (entry) entry.userRating = score
            renderWlGrid()
            showToast(`Rated ${score} ★`, 'like')
        }
    } else {
        const res = await api.updateWatchlist(id, { userRating: score })
        if (res.ok) {
            const entry = myWatchlist.find(e => String(e.anime?._id || e.anime || e._id) === String(id))
            if (entry) entry.userRating = score
            renderWlGrid()
            showToast(`Rated ${score} ★`, 'like')
        }
    }
}

async function quickRemoveWl(id) {
    if (currentHub === 'gaming') {
        await api.removeGamelist(id)
        await loadGamelist()
        await loadAIGameRecommendations()
    } else {
        await api.removeWatchlist(id)
        await loadWatchlist()
        await loadAIRecommendations()
    }
    renderHomeSections()
    renderWatchlistPage()
    showToast('Removed from list', 'remove')
}

// Community chat
const roomTitles = {
    general:         '# general-anime',
    spoilers:        '⚠️ # spoilers-lounge',
    recommendations: '🎯 # anime-recs',
    'general-gaming':'🎮 # general-gaming',
    'rpg-lounge':    '⚔️ # rpg-lounge',
    'esports-chat':  '🏆 # esports-chat'
}

const roomSubs = {
    general:         'Discuss anything anime!',
    spoilers:        'Major spoilers — enter at your own risk',
    recommendations: 'Ask for and share recommendations',
    'general-gaming':'Discuss your favorite games & setups!',
    'rpg-lounge':    'Quests, builds, and epic RPG lore!',
    'esports-chat':  'Competitive matches, tournaments & highlights!'
}

async function loadCommunity() {
    const isGaming = currentHub === 'gaming'
    const sidebar = document.querySelector('.comm-sidebar')
    if (sidebar) {
        if (isGaming) {
            if (!['general-gaming', 'rpg-lounge', 'esports-chat'].includes(currentRoom)) {
                currentRoom = 'general-gaming'
            }
            sidebar.innerHTML = `
                <div class="slbl">Gaming Channels</div>
                <div class="sitem ${currentRoom === 'general-gaming' ? 'on' : ''}" onclick="switchRoom('general-gaming',this)">🎮 # general-gaming</div>
                <div class="sitem ${currentRoom === 'rpg-lounge' ? 'on' : ''}" onclick="switchRoom('rpg-lounge',this)">⚔️ # rpg-lounge</div>
                <div class="sitem ${currentRoom === 'esports-chat' ? 'on' : ''}" onclick="switchRoom('esports-chat',this)">🏆 # esports-chat</div>

                <div class="slbl" style="margin-top:12px">Online</div>
                <div id="online-list"></div>
            `
        } else {
            if (!['general', 'spoilers', 'recommendations'].includes(currentRoom)) {
                currentRoom = 'general'
            }
            sidebar.innerHTML = `
                <div class="slbl">Anime Channels</div>
                <div class="sitem ${currentRoom === 'general' ? 'on' : ''}" onclick="switchRoom('general',this)">💬 # general</div>
                <div class="sitem ${currentRoom === 'spoilers' ? 'on' : ''}" onclick="switchRoom('spoilers',this)">⚠️ # spoilers</div>
                <div class="sitem ${currentRoom === 'recommendations' ? 'on' : ''}" onclick="switchRoom('recommendations',this)">🎯 # recs</div>

                <div class="slbl" style="margin-top:12px">Online</div>
                <div id="online-list"></div>
            `
        }
    }

    document.getElementById('room-title').textContent = roomTitles[currentRoom] || `# ${currentRoom}`
    document.getElementById('room-sub').textContent   = roomSubs[currentRoom] || ''

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
    const blocked = (currentUser?.blockedUsers || []).map(id => id.toString())
    const visibleMsgs = msgs.filter(m => {
        const sId = (m.sender?._id || m.sender || '').toString()
        return !blocked.includes(sId)
    })

    if (!visibleMsgs.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--txt3);font-size:12px;margin-top:20px">No messages yet. Start the conversation!</p>'
        return
    }

    container.innerHTML = visibleMsgs.map((m, i) => {
        const sender  = m.sender || {}
        const isMe    = sender._id === currentUser?._id || sender.username === currentUser?.username
        const grouped = i > 0 && visibleMsgs[i-1].sender?._id === sender._id

        const avt = sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sender.username}`
        const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })

        const clickAttr = (!isMe && sender._id) ? `style="cursor:pointer" onclick="openUserProfileModal('${sender._id}')"` : ''

        return `
            <div class="cmsg ${isMe ? 'me' : ''} ${grouped ? 'grp' : ''}">
                ${!grouped
                    ? `<img class="cavt" src="${avt}" alt="${sender.username}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=u'" ${clickAttr}>`
                    : `<div class="cavt-space"></div>`
                }
                <div class="cmsg-body">
                    ${!grouped ? `
                        <div class="cmeta">
                            <span class="cname ${isMe ? 'mine' : ''}" ${clickAttr}>${isMe ? 'You' : sender.username}</span>
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
        if (res.blocked) {
            toast(res.msg || 'Account Blocked', 'err')
            setTimeout(() => logout(), 2200)
        } else if (res.warning) {
            toast(res.msg || 'Warning: Bad word detected', 'err')
        } else {
            toast(res.msg || 'failed to send', 'err')
        }
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
    } else {
        if (res.blocked) {
            toast(res.msg || 'Account Blocked', 'err')
            setTimeout(() => logout(), 2200)
        } else if (res.warning) {
            toast(res.msg || 'Warning: Bad word detected', 'err')
        } else {
            toast(res.msg || 'failed to send', 'err')
        }
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
        <div class="sonline" style="cursor:pointer" onclick="openUserProfileModal('${u._id}')">
            <img src="${u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}" alt="${u.username}">
            <span class="sonline-name">${u.username}</span>
            <span class="sdot online" style="margin-left:auto"></span>
        </div>
    `).join('')

    document.getElementById('room-online').textContent = `👥 ${online.length} online`
}

// Friends page
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
                    <img src="${avt}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer" onclick="openUserProfileModal('${u._id}')" alt="${u.username}">
                    <div style="flex:1">
                        <div style="font-size:14px;font-weight:700;cursor:pointer" onclick="openUserProfileModal('${u._id}')">${u.username}</div>
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
                    <div class="fr-avt-wrap" style="cursor:pointer" onclick="openUserProfileModal('${u._id}')">
                        <img class="fr-avt" src="${avt}" alt="${u.username}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=u'">
                        <span class="fr-sdot" style="background:${dotColor}"></span>
                    </div>
                    <div style="flex:1">
                        <div class="fr-name" style="cursor:pointer" onclick="openUserProfileModal('${u._id}')">${u.username}</div>
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

// Public user profiles & blocking
async function openUserProfileModal(userId) {
    if (!userId) return
    if (currentUser && userId.toString() === currentUser._id?.toString()) {
        openProfileModal()
        return
    }

    const modal = document.getElementById('user-profile-modal')
    if (!modal) return

    const res = await api.getUserProfile(userId)
    if (!res.ok) {
        toast(res.msg || 'Failed to load user profile', 'err')
        return
    }

    const user = res.user
    const friendState = res.friendState
    const isBlocked = res.isBlocked

    const avtEl = document.getElementById('uprof-avt')
    if (avtEl) avtEl.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`

    const statusDot = document.getElementById('uprof-status-dot')
    if (statusDot) {
        statusDot.className = `sdot ${user.status || 'offline'}`
        statusDot.style.background = { online: '#22c55e', away: '#fbbf24', offline: '#6b7280' }[user.status] || '#6b7280'
    }

    const unameEl = document.getElementById('uprof-username')
    if (unameEl) unameEl.textContent = user.username

    const stextEl = document.getElementById('uprof-status-text')
    if (stextEl) {
        const isOnline = user.status === 'online'
        stextEl.textContent = `${isOnline ? '● Online' : '○ Offline'}`
        stextEl.style.color = isOnline ? '#22c55e' : 'var(--txt3)'
    }

    const bioEl = document.getElementById('uprof-bio')
    if (bioEl) bioEl.textContent = user.bio || 'No bio provided.'

    const fbtn = document.getElementById('uprof-friend-btn')
    if (fbtn) {
        if (isBlocked) {
            fbtn.style.display = 'none'
        } else {
            fbtn.style.display = 'inline-flex'
            if (friendState === 'friends') {
                fbtn.className = 'btn btn-d'
                fbtn.innerHTML = '❌ Remove Friend'
                fbtn.onclick = () => handleModalFriendAction(user._id, 'remove')
            } else if (friendState === 'sent') {
                fbtn.className = 'btn btn-g'
                fbtn.innerHTML = '⏳ Request Pending'
                fbtn.onclick = null
            } else if (friendState === 'incoming') {
                fbtn.className = 'btn btn-p'
                fbtn.innerHTML = '✅ Accept Request'
                fbtn.onclick = () => handleModalFriendAction(user._id, 'accept')
            } else {
                fbtn.className = 'btn btn-p'
                fbtn.innerHTML = '➕ Add Friend'
                fbtn.onclick = () => handleModalFriendAction(user._id, 'add')
            }
        }
    }

    const bbtn = document.getElementById('uprof-block-btn')
    if (bbtn) {
        if (isBlocked) {
            bbtn.className = 'btn btn-s'
            bbtn.innerHTML = '🔓 Unblock User'
            bbtn.onclick = () => toggleBlockUser(user._id, true)
        } else {
            bbtn.className = 'btn btn-d'
            bbtn.innerHTML = '🚫 Block User'
            bbtn.onclick = () => toggleBlockUser(user._id, false)
        }
    }

    modal.classList.add('open')
}

function closeUserProfileModal() {
    const modal = document.getElementById('user-profile-modal')
    if (modal) modal.classList.remove('open')
}

async function toggleBlockUser(userId, currentlyBlocked) {
    if (currentlyBlocked) {
        const res = await api.unblockUser(userId)
        if (res.ok) {
            toast('User unblocked', 'ok')
            if (currentUser) {
                currentUser.blockedUsers = (currentUser.blockedUsers || []).filter(id => id.toString() !== userId.toString())
            }
            openUserProfileModal(userId)
            if (document.getElementById('pg-friends')?.classList.contains('active')) {
                loadFriends()
            }
            loadRoomChat(currentRoom, 'comm-msgs', 'comm-emobar')
        } else {
            toast(res.msg || 'Failed to unblock user', 'err')
        }
    } else {
        const res = await api.blockUser(userId)
        if (res.ok) {
            toast('User blocked', 'ok')
            if (currentUser) {
                if (!currentUser.blockedUsers) currentUser.blockedUsers = []
                currentUser.blockedUsers.push(userId)
            }
            closeUserProfileModal()
            if (document.getElementById('pg-friends')?.classList.contains('active')) {
                loadFriends()
            }
            loadRoomChat(currentRoom, 'comm-msgs', 'comm-emobar')
        } else {
            toast(res.msg || 'Failed to block user', 'err')
        }
    }
}

async function handleModalFriendAction(userId, action) {
    if (action === 'add') await doAddFriend(userId)
    else if (action === 'accept') await doAcceptFriend(userId)
    else if (action === 'remove') await doRemoveFriend(userId)

    openUserProfileModal(userId)
}

// Admin dashboard
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
    const fallback = 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg'
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

// Profile & analytics modal
let activeAvatarDataUrl = ''

const ROBOT_AVATARS = [
    { name: 'Mech Fox 🦊', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=kitsuneFox' },
    { name: 'Robo Mouse 🐭', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=speedyMouse' },
    { name: 'Cyber Lion 🦁', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=kingLion' },
    { name: 'Iron Wolf 🐺', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alphaWolf' },
    { name: 'Steel Bear 🐻', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=grizzlyBear' },
    { name: 'Mecha Panda 🐼', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bambooPanda' },
    { name: 'Fire Dragon 🐉', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=fireDragon' },
    { name: 'Cyber Owl 🦉', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiseOwl' },
    { name: 'Shadow Cat 🐱', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=shadowCat' },
    { name: 'Nano Rabbit 🐰', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=snowRabbit' },
    { name: 'Robo Titan 🤖', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RoboTitan' },
    { name: 'Volt Bot ⚡', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=VoltBot' }
]

const HUMAN_AVATARS = [
    { name: 'Sakura 🌸', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SakuraMoon' },
    { name: 'Ninja 🥷', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ShadowNinja' },
    { name: 'Cyber 🤖', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CyberOtaku' },
    { name: 'Flame 🔥', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FlameDemon' },
    { name: 'Vanguard 🌟', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StarVanguard' },
    { name: 'Alex 👨', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexHero' },
    { name: 'Luna 👩', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaStar' },
    { name: 'Kai 🧑', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KaiGamer' },
    { name: 'Rin 👧', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RinManga' },
    { name: 'Kenji 👦', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KenjiSensei' }
]

function renderAvatarPresets() {
    const robotContainer = document.getElementById('prof-robot-presets-list')
    if (robotContainer) {
        robotContainer.innerHTML = ROBOT_AVATARS.map(avt => {
            const isSelected = activeAvatarDataUrl === avt.url
            return `
                <div class="prof-preset-item ${isSelected ? 'selected' : ''}" 
                     onclick="selectAvatarPreset('${avt.url}')"
                     title="${avt.name}"
                     style="cursor:pointer;border-radius:50%;padding:2px;border:2px solid ${isSelected ? 'var(--orange)' : 'transparent'};transition:all 0.15s">
                    <img src="${avt.url}" alt="${avt.name}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;display:block;background:var(--bg2)">
                </div>
            `
        }).join('')
    }

    const humanContainer = document.getElementById('prof-human-presets-list')
    if (humanContainer) {
        humanContainer.innerHTML = HUMAN_AVATARS.map(avt => {
            const isSelected = activeAvatarDataUrl === avt.url
            return `
                <div class="prof-preset-item ${isSelected ? 'selected' : ''}" 
                     onclick="selectAvatarPreset('${avt.url}')"
                     title="${avt.name}"
                     style="cursor:pointer;border-radius:50%;padding:2px;border:2px solid ${isSelected ? 'var(--orange)' : 'transparent'};transition:all 0.15s">
                    <img src="${avt.url}" alt="${avt.name}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;display:block;background:var(--bg2)">
                </div>
            `
        }).join('')
    }
}

function openProfileModal() {
    if (!currentUser) return
    const modal = document.getElementById('profile-modal')
    if (!modal) return

    const userDisplay = document.getElementById('prof-user-display')
    if (userDisplay) userDisplay.textContent = currentUser.username || 'Account Profile'

    const emailVal = document.getElementById('prof-email-val')
    if (emailVal) emailVal.textContent = currentUser.email || '—'

    const userInp = document.getElementById('prof-username-inp')
    if (userInp) userInp.value = currentUser.username || ''

    const bioInp = document.getElementById('prof-bio-inp')
    if (bioInp) bioInp.value = currentUser.bio || ''
    
    activeAvatarDataUrl = currentUser.avatar || ''
    updateProfAvtPreview()
    renderAvatarPresets()
    modal.classList.add('open')
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal')
    if (modal) modal.classList.remove('open')
}

// Avatar image cropper
let cropImageObj = null
let cropScale = 1
let cropRotation = 0
let cropOffsetX = 0
let cropOffsetY = 0
let isDraggingCrop = false
let startDragX = 0
let startDragY = 0

function handleCustomAvatarUpload(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
            cropImageObj = img
            cropScale = 1
            cropRotation = 0
            cropOffsetX = 0
            cropOffsetY = 0
            const range = document.getElementById('crop-zoom-range')
            if (range) range.value = 1
            openCropperModal()
        }
        img.src = e.target.result
    }
    reader.readAsDataURL(file)
    event.target.value = ''
}

function openCropperModal() {
    const modal = document.getElementById('cropper-modal')
    if (!modal) return
    modal.classList.add('open')
    setTimeout(initCropCanvas, 50)
}

function closeCropperModal() {
    const modal = document.getElementById('cropper-modal')
    if (modal) modal.classList.remove('open')
}

function initCropCanvas() {
    const canvas = document.getElementById('crop-canvas')
    if (!canvas || !cropImageObj) return

    if (!canvas._dragBound) {
        canvas._dragBound = true

        canvas.addEventListener('mousedown', (e) => {
            isDraggingCrop = true
            startDragX = e.clientX - cropOffsetX
            startDragY = e.clientY - cropOffsetY
        })

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingCrop) return
            cropOffsetX = e.clientX - startDragX
            cropOffsetY = e.clientY - startDragY
            drawCropCanvas()
        })

        window.addEventListener('mouseup', () => {
            isDraggingCrop = false
        })

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDraggingCrop = true
                startDragX = e.touches[0].clientX - cropOffsetX
                startDragY = e.touches[0].clientY - cropOffsetY
            }
        }, { passive: true })

        window.addEventListener('touchmove', (e) => {
            if (!isDraggingCrop || e.touches.length !== 1) return
            cropOffsetX = e.touches[0].clientX - startDragX
            cropOffsetY = e.touches[0].clientY - startDragY
            drawCropCanvas()
        }, { passive: true })

        window.addEventListener('touchend', () => {
            isDraggingCrop = false
        })
    }

    drawCropCanvas()
}

function drawCropCanvas() {
    const canvas = document.getElementById('crop-canvas')
    if (!canvas || !cropImageObj) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)
    ctx.save()

    ctx.translate(width / 2 + cropOffsetX, height / 2 + cropOffsetY)
    ctx.rotate((cropRotation * Math.PI) / 180)
    ctx.scale(cropScale, cropScale)

    ctx.drawImage(cropImageObj, -cropImageObj.width / 2, -cropImageObj.height / 2)

    ctx.restore()
}

function setCropZoom(val) {
    cropScale = parseFloat(val) || 1
    drawCropCanvas()
}

function updateCropZoom(val) {
    setCropZoom(val)
}

function adjustCropZoom(delta) {
    cropScale = Math.max(0.2, Math.min(3, cropScale + delta))
    const range = document.getElementById('crop-zoom-range')
    if (range) range.value = cropScale
    drawCropCanvas()
}

function rotateCropImage(deg) {
    cropRotation = (cropRotation + deg) % 360
    drawCropCanvas()
}

function resetCropImage() {
    cropScale = 1
    cropRotation = 0
    cropOffsetX = 0
    cropOffsetY = 0
    const range = document.getElementById('crop-zoom-range')
    if (range) range.value = 1
    drawCropCanvas()
}

function applyCroppedAvatar() {
    const canvas = document.getElementById('crop-canvas')
    if (!canvas || !cropImageObj) return

    const cropSize = 256
    const outCanvas = document.createElement('canvas')
    outCanvas.width = cropSize
    outCanvas.height = cropSize
    const outCtx = outCanvas.getContext('2d')

    outCtx.beginPath()
    outCtx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2)
    outCtx.closePath()
    outCtx.clip()

    outCtx.drawImage(
        canvas,
        0, 0, canvas.width, canvas.height,
        0, 0, cropSize, cropSize
    )

    const dataUrl = outCanvas.toDataURL('image/png')
    activeAvatarDataUrl = dataUrl

    const preview = document.getElementById('prof-avt-preview')
    if (preview) preview.src = dataUrl
    renderAvatarPresets()

    closeCropperModal()
    toast('Custom avatar ready! Click Save Changes to apply.', 'ok')
}

function openAnalyticsModal() {
    if (!currentUser) return
    const modal = document.getElementById('analytics-modal')
    if (!modal) return
    renderProfileAnalytics()
    modal.classList.add('open')
}

function closeAnalyticsModal() {
    const modal = document.getElementById('analytics-modal')
    if (modal) modal.classList.remove('open')
}

function renderProfileAnalytics() {
    const list = myWatchlist || []

    function setText(id, val) {
        const el = document.getElementById(id)
        if (el) el.textContent = val
    }
    function setWidth(id, val) {
        const el = document.getElementById(id)
        if (el) el.style.width = val
    }
    function setHtml(id, val) {
        const el = document.getElementById(id)
        if (el) el.innerHTML = val
    }

    if (!list.length) {
        setText('an-current-streak', '0 Days')
        setText('an-streak-sub', 'Start a streak today!')
        setText('an-longest-streak', '0 Days')
        setText('an-total-hours', '0.0 hrs')
        setText('an-total-days', '~0.0 days')
        setText('an-monthly-avg', '0.0 hrs/mo')
        setText('an-this-month', '0.0 hrs')
        setText('an-comp-rate', '0%')
        
        setWidth('an-bar-completed', '0%')
        setWidth('an-bar-watching', '0%')
        setWidth('an-bar-plan', '0%')
        setWidth('an-bar-dropped', '0%')

        setText('an-cnt-completed', '0')
        setText('an-cnt-watching', '0')
        setText('an-cnt-plan', '0')
        setText('an-cnt-dropped', '0')

        setHtml('an-genres-list', '<div style="font-size:12px;color:var(--txt3);text-align:center;padding:12px">No watchlist entries recorded yet.</div>')
        return
    }

    let totalMinutes = 0
    let thisMonthMinutes = 0
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const statusCounts = { completed: 0, watching: 0, plan_to_watch: 0, dropped: 0 }
    const genreMap = {}
    const activeDatesSet = new Set()

    list.forEach(entry => {
        const st = entry.watchStatus || 'plan_to_watch'
        statusCounts[st] = (statusCounts[st] || 0) + 1

        const anime = entry.anime || {}
        const epCount = entry.ep_progress || (st === 'completed' ? (anime.episodes || 12) : 0)
        const durationPerEp = (anime.mediaType === 'Movie') ? 120 : 24
        const entryMinutes = epCount * durationPerEp
        totalMinutes += entryMinutes

        if (entry.updatedAt) {
            const d = new Date(entry.updatedAt)
            const dateStr = d.toISOString().split('T')[0]
            activeDatesSet.add(dateStr)

            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                thisMonthMinutes += entryMinutes
            }
        }

        const genres = anime.genres || []
        genres.forEach(g => {
            genreMap[g] = (genreMap[g] || 0) + 1
        })
    })

    const totalTracked = list.length
    const compRateVal = totalTracked > 0 ? ((statusCounts.completed / totalTracked) * 100).toFixed(1) : 0

    // Stacked progress bar percentages
    const pctCompleted = totalTracked > 0 ? (statusCounts.completed / totalTracked) * 100 : 0
    const pctWatching   = totalTracked > 0 ? (statusCounts.watching / totalTracked) * 100 : 0
    const pctPlan       = totalTracked > 0 ? (statusCounts.plan_to_watch / totalTracked) * 100 : 0
    const pctDropped    = totalTracked > 0 ? (statusCounts.dropped / totalTracked) * 100 : 0

    // Streaks calculation
    const sortedDates = Array.from(activeDatesSet).sort()
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let prevDate = null

    sortedDates.forEach(dateStr => {
        const curr = new Date(dateStr)
        if (!prevDate) {
            tempStreak = 1
        } else {
            const diffDays = Math.round((curr - prevDate) / (1000 * 3600 * 24))
            if (diffDays === 1) {
                tempStreak += 1
            } else if (diffDays > 1) {
                tempStreak = 1
            }
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak
        prevDate = curr
    })

    if (sortedDates.length > 0) {
        const lastActive = new Date(sortedDates[sortedDates.length - 1])
        const today = new Date()
        today.setHours(0,0,0,0)
        lastActive.setHours(0,0,0,0)
        const daysSinceLast = Math.round((today - lastActive) / (1000 * 3600 * 24))
        if (daysSinceLast <= 1) {
            currentStreak = tempStreak
        } else {
            currentStreak = 0
        }
    }

    const totalHours = (totalMinutes / 60).toFixed(1)
    const totalDays = (totalMinutes / 1440).toFixed(1)
    const thisMonthHours = (thisMonthMinutes / 60).toFixed(1)
    const avgMonths = Math.max(1, now.getMonth() + 1)
    const monthlyAvgHours = ((totalMinutes / 60) / avgMonths).toFixed(1)

    // DOM Updates
    setText('an-current-streak', `${currentStreak} Days`)
    setText('an-streak-sub', currentStreak > 0 ? '🔥 Keep watching today!' : 'Start a streak today!')
    setText('an-longest-streak', `${longestStreak} Days`)
    setText('an-total-hours', `${totalHours} hrs`)
    setText('an-total-days', `~${totalDays} days`)
    setText('an-monthly-avg', `${monthlyAvgHours} hrs/mo`)
    setText('an-this-month', `${thisMonthHours} hrs`)
    setText('an-comp-rate', `${compRateVal}%`)

    setWidth('an-bar-completed', `${pctCompleted}%`)
    setWidth('an-bar-watching', `${pctWatching}%`)
    setWidth('an-bar-plan', `${pctPlan}%`)
    setWidth('an-bar-dropped', `${pctDropped}%`)

    setText('an-cnt-completed', statusCounts.completed)
    setText('an-cnt-watching', statusCounts.watching)
    setText('an-cnt-plan', statusCounts.plan_to_watch)
    setText('an-cnt-dropped', statusCounts.dropped)

    // Genre Preference Bars
    const topGenres = Object.entries(genreMap)
        .map(([name, count]) => ({ name, count, pct: Math.round((count / totalTracked) * 100) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    let genreHtml = ''
    if (topGenres.length > 0) {
        genreHtml = topGenres.map(g => `
            <div class="genre-pref-row">
                <div class="genre-pref-meta">
                    <span class="genre-pref-name">${g.name}</span>
                    <span class="genre-pref-pct">${g.count} anime (${g.pct}%)</span>
                </div>
                <div class="genre-pref-track">
                    <div class="genre-pref-fill" style="width:${Math.min(100, Math.max(10, g.pct))}%"></div>
                </div>
            </div>
        `).join('')
    } else {
        genreHtml = '<div style="font-size:12px;color:var(--txt3);text-align:center;padding:12px">No genre data available yet.</div>'
    }

    setHtml('an-genres-list', genreHtml)
}

function updateProfAvtPreview() {
    const preview = document.getElementById('prof-avt-preview')
    const fallback = currentUser ? (currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`) : ''
    if (preview) {
        preview.src = activeAvatarDataUrl || fallback
    }
}

function selectAvatarPreset(presetUrl) {
    activeAvatarDataUrl = presetUrl
    updateProfAvtPreview()
    renderAvatarPresets()
}

async function saveProfile() {
    const username = document.getElementById('prof-username-inp').value.trim()
    const avatar   = activeAvatarDataUrl || (currentUser ? currentUser.avatar : '')
    const bio      = document.getElementById('prof-bio-inp').value.trim()

    if (!username) {
        toast('Username is required', 'err')
        return
    }

    const res = await api.updateProfile({ username, avatar, bio })
    if (res.ok && res.user) {
        currentUser = res.user
        
        // Update navbar & dropdown UI
        const avtSrc = currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`
        document.getElementById('nav-avt').src = avtSrc
        document.getElementById('dd-name').textContent = currentUser.username
        document.getElementById('dd-email').textContent = currentUser.email

        closeProfileModal()
        toast('Profile updated ✓', 'ok')
    } else {
        toast(res.msg || 'Failed to update profile', 'err')
    }
}

// Anime edit modal
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
    const animeModal   = document.getElementById('anime-modal')
    const delModal     = document.getElementById('del-modal')
    const profModal    = document.getElementById('profile-modal')
    const anModal      = document.getElementById('analytics-modal')
    const cropModal    = document.getElementById('cropper-modal')
    const uProfModal   = document.getElementById('user-profile-modal')

    if (e.target === animeModal) closeAnimeModal()
    if (e.target === delModal)   closeDelModal()
    if (e.target === profModal)  closeProfileModal()
    if (e.target === anModal)    closeAnalyticsModal()
    if (e.target === cropModal)  closeCropperModal()
    if (e.target === uProfModal) closeUserProfileModal()
})

function toggleFaq(card) {
    if (!card) return
    card.classList.toggle('open')
}

// Help & Feedback Live Chat Assistant - User-Specific History & Moderation
async function loadMyHelpChat() {
    const msgsContainer = document.getElementById('hchat-msgs')
    if (!msgsContainer) return

    const res = await api.get('/suggestions/my')
    if (!res.ok) return

    const userAvt = currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.username || 'user')}`
    const welcomeHtml = `
        <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div>
            <div style="max-width:80%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:14px 14px 14px 2px;padding:12px 16px;font-size:13px;color:var(--txt);line-height:1.5">
                Welcome back to Campfire Live Support & Feedback Chat! 🔥<br>
                Your suggestions and questions are saved here permanently. Select a category, type your message, and hit Send!
            </div>
        </div>
    `

    if (!res.data || res.data.length === 0) {
        msgsContainer.innerHTML = welcomeHtml
        return
    }

    const chatItemsHtml = res.data.map(item => {
        const uBubble = `
            <div style="display:flex;gap:10px;align-items:flex-start;justify-content:flex-end">
                <div style="display:flex;flex-direction:column;align-items:flex-end;max-width:80%">
                    <div style="background:linear-gradient(135deg, var(--orange), var(--orange2));border-radius:14px 14px 2px 14px;padding:12px 16px;font-size:13px;color:#fff;line-height:1.5;box-shadow:0 2px 10px rgba(249,115,22,0.3)">
                        ${escHtml(item.details)}
                    </div>
                    <span style="font-size:10px;color:#86efac;font-weight:700;margin-top:3px">✓ Saved</span>
                </div>
                <img src="${userAvt}" style="width:32px;height:32px;border-radius:50%;border:2px solid var(--orange);object-fit:cover;flex-shrink:0" alt="avatar">
            </div>
        `

        let replyText = "🔥 Thank you so much for sending this feedback! Your message has been saved for our team."
        if (item.status === 'reviewed') {
            replyText = "🔥 <strong>Already working on it!</strong><br>Our team is already working on this suggestion! Thank you for sharing your feedback with us!"
        } else if (item.type === 'anime_suggestion') {
            replyText = `🎬 <strong>Thank you so much for sending this anime suggestion!</strong><br>We have logged your suggestion ("<em>${escHtml(item.title)}</em>"). Our database team will verify and import it! 🔥`
        } else if (item.type === 'game_suggestion') {
            replyText = `🎮 <strong>Thank you so much for sending this game suggestion!</strong><br>We have logged your suggestion ("<em>${escHtml(item.title)}</em>"). Our gaming database team will verify and import it! 🔥`
        } else if (item.type === 'category_suggestion') {
            replyText = `🏷️ <strong>Thank you so much for suggesting a new interest/category!</strong><br>We have logged your category idea ("<em>${escHtml(item.title)}</em>"). Our product team is actively exploring new hubs to expand Campfire! 🔥`
        } else if (item.type === 'feature_request') {
            replyText = `✨ <strong>Thank you so much for sending this feature request!</strong><br>Your idea ("<em>${escHtml(item.title)}</em>") has been recorded and sent directly to our development team.`
        } else if (item.type === 'bug_report') {
            replyText = `🐞 <strong>Thank you so much for sending this issue report!</strong><br>Our technical team has logged this issue ("<em>${escHtml(item.title)}</em>") and is looking into it.`
        } else if (item.type === 'help_question') {
            replyText = `❓ <strong>Thank you for your question!</strong><br>A Campfire support staff member will review your query.`
        }

        const bBubble = `
            <div style="display:flex;gap:10px;align-items:flex-start">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div>
                <div style="max-width:80%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:14px 14px 14px 2px;padding:12px 16px;font-size:13px;color:var(--txt);line-height:1.5">
                    ${replyText}
                </div>
            </div>
        `

        return uBubble + bBubble
    }).join('')

    msgsContainer.innerHTML = welcomeHtml + chatItemsHtml
    msgsContainer.scrollTop = msgsContainer.scrollHeight
}

async function sendHelpFeedbackMsg() {
    const inp = document.getElementById('hchat-inp')
    if (!inp) return
    const typeEl = document.getElementById('hchat-type')
    const type = typeEl ? typeEl.value : 'other'
    const txt = inp.value.trim()
    if (!txt) return

    inp.value = ''

    const msgsContainer = document.getElementById('hchat-msgs')
    if (!msgsContainer) return

    const tempId = 'temp-msg-' + Date.now()

    // 1. Render User Message Bubble with "✓ Sent successfully" badge
    const userAvt = currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.username || 'user')}`
    const userBubble = `
        <div id="${tempId}" style="display:flex;gap:10px;align-items:flex-start;justify-content:flex-end">
            <div style="display:flex;flex-direction:column;align-items:flex-end;max-width:80%">
                <div style="background:linear-gradient(135deg, var(--orange), var(--orange2));border-radius:14px 14px 2px 14px;padding:12px 16px;font-size:13px;color:#fff;line-height:1.5;box-shadow:0 2px 10px rgba(249,115,22,0.3)">
                    ${escHtml(txt)}
                </div>
                <span style="font-size:10px;color:#86efac;font-weight:700;margin-top:3px">✓ Sent successfully</span>
            </div>
            <img src="${userAvt}" style="width:32px;height:32px;border-radius:50%;border:2px solid var(--orange);object-fit:cover;flex-shrink:0" alt="avatar">
        </div>
    `
    msgsContainer.insertAdjacentHTML('beforeend', userBubble)
    msgsContainer.scrollTop = msgsContainer.scrollHeight

    // 2. Submit to API backend
    const res = await api.submitSuggestion({
        type: type,
        title: txt.slice(0, 60),
        details: txt
    })

    // 3. Handle Off-Topic / Rubbish / Bad Word Warning & Message Removal
    if (!res.ok) {
        // REMOVE / DELETE THE SPECIFIC MESSAGE BUBBLE FROM THE CHAT BOX
        document.getElementById(tempId)?.remove()

        if (res.blocked) {
            toast(res.msg || 'Account Blocked for posting rubbish/bad words', 'err')
            setTimeout(() => logout(), 2200)
        } else if (res.warning) {
            toast(res.msg || '⚠️ Warning 1/2: Off-topic/rubbish message removed!', 'err')
        } else {
            toast(res.msg || 'Failed to send feedback', 'err')
        }
        return
    }

    // 4. Handle Successful Submission & Duplicate Detection ("Already working on it! 🔥")
    let botReply = `🔥 <strong>Thank you so much for sending this feedback!</strong><br>Your message has been saved directly to our servers for the Campfire team.`
    
    if (res.isDuplicate || res.botReply) {
        botReply = `🔥 <strong>Already working on it!</strong><br>Our team is already working on this suggestion! Thank you for sharing your feedback with us!`
        toast('Already working on it! 🔥', 'ok')
    } else {
        if (type === 'anime_suggestion') {
            botReply = `🎬 <strong>Thank you so much for sending this anime suggestion!</strong><br>We have logged your suggestion ("<em>${escHtml(txt)}</em>"). Our database team will verify and import it! 🔥`
        } else if (type === 'game_suggestion') {
            botReply = `🎮 <strong>Thank you so much for sending this game suggestion!</strong><br>We have logged your suggestion ("<em>${escHtml(txt)}</em>"). Our gaming database team will verify and import it! 🔥`
        } else if (type === 'category_suggestion') {
            botReply = `🏷️ <strong>Thank you so much for suggesting a new interest/category!</strong><br>We have logged your category idea ("<em>${escHtml(txt)}</em>"). Our product team is actively exploring new hubs to expand Campfire! 🔥`
        } else if (type === 'feature_request') {
            botReply = `✨ <strong>Thank you so much for sending this feature request!</strong><br>Your idea ("<em>${escHtml(txt)}</em>") has been recorded and sent directly to our development team.`
        } else if (type === 'bug_report') {
            botReply = `🐞 <strong>Thank you so much for sending this issue report!</strong><br>Our technical team has logged this issue ("<em>${escHtml(txt)}</em>") and is looking into it right away.`
        } else if (type === 'help_question') {
            botReply = `❓ <strong>Thank you so much for sending your support question!</strong><br>A Campfire support staff member will review your query.`
        }
        toast('Feedback sent successfully! Thank you 🔥', 'ok')
    }

    setTimeout(() => {
        const botBubble = `
            <div style="display:flex;gap:10px;align-items:flex-start">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div>
                <div style="max-width:80%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:14px 14px 14px 2px;padding:12px 16px;font-size:13px;color:var(--txt);line-height:1.5">
                    ${botReply}
                </div>
            </div>
        `
        msgsContainer.insertAdjacentHTML('beforeend', botBubble)
        msgsContainer.scrollTop = msgsContainer.scrollHeight
    }, 400)
}

// Helper functions
function toast(msg, type = 'ok') {
    const el = document.getElementById('toast')
    el.textContent = (type === 'ok' ? '✅ ' : '❌ ') + msg
    el.className = `show ${type}`
    clearTimeout(window._toastTimer)
    window._toastTimer = setTimeout(() => el.classList.remove('show'), 3200)
}

function setBtnLoading(btn, loading) {
    if (!btn) return
    if (loading) {
        if (!btn.dataset.orig) {
            btn.dataset.orig = btn.innerHTML
        }
        btn.innerHTML = '<span class="spin"></span>'
        btn.disabled  = true
    } else {
        if (btn.dataset.orig) {
            btn.innerHTML = btn.dataset.orig
            delete btn.dataset.orig
        }
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

window.swipeTinderCard = swipeAnime
