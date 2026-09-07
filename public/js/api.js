// api.js - all the fetch calls to the backend
// i hate writing fetch everywhere so i wrapped it

const BASE = '/api'

function getToken() {
    return localStorage.getItem('cf_token') || ''
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
    }
}

async function req(method, path, body) {
    try {
        const opts = {
            method,
            headers: authHeaders()
        }
        if (body) opts.body = JSON.stringify(body)

        const res = await fetch(BASE + path, opts)
        const data = await res.json()
        return data
    } catch(err) {
        console.error('req failed:', method, path, err)
        return { ok: false, msg: 'network error' }
    }
}

// shorthand helpers
const api = {
    get:    (path)        => req('GET',    path),
    post:   (path, body)  => req('POST',   path, body),
    put:    (path, body)  => req('PUT',    path, body),
    delete: (path)        => req('DELETE', path),

    // auth
    login:         (credential, password) => req('POST', '/auth/login',    { credential, password }),
    register:      (username, email, password) => req('POST', '/auth/register', { username, email, password }),
    getMe:         () => req('GET', '/auth/me'),
    updateProfile: (data) => req('PUT', '/auth/profile', data),
    logout:        () => req('POST', '/auth/logout'),

    // anime
    getAnime:    (params = {}) => {
        const qs = new URLSearchParams(params).toString()
        return req('GET', '/anime' + (qs ? '?' + qs : ''))
    },
    getRecommendations: (limit = 12) => req('GET', `/anime/recommendations?limit=${limit}`),
    getOneAnime: (id) => req('GET',    `/anime/${id}`),
    createAnime: (data) => req('POST',  '/anime',     data),
    updateAnime: (id, data) => req('PUT', `/anime/${id}`, data),
    deleteAnime: (id) => req('DELETE', `/anime/${id}`),

    // watchlist
    getWatchlist: () => req('GET',  '/watchlist'),
    addWatchlist: (animeId, watchStatus) => req('POST', '/watchlist', { animeId, watchStatus }),
    updateWatchlist: (animeId, data)     => req('PUT',  `/watchlist/${animeId}`, data),
    removeWatchlist: (animeId)           => req('DELETE', `/watchlist/${animeId}`),

    // messages
    getMessages: (room) => req('GET',    `/messages/${room}`),
    getAllMsgs:   ()     => req('GET',    '/messages/all'),
    sendMessage: (room, body) => req('POST', '/messages', { room, body }),
    deleteMsg:   (id)   => req('DELETE', `/messages/${id}`),

    // friends & user profiles
    getFriends:    () => req('GET',    '/friends'),
    getDiscover:   () => req('GET',    '/friends/discover'),
    getUserProfile: (userId) => req('GET', `/friends/user/${userId}`),
    sendRequest:   (userId) => req('POST', `/friends/add/${userId}`),
    acceptRequest: (userId) => req('PUT',  `/friends/accept/${userId}`),
    removeFriend:  (userId) => req('DELETE', `/friends/remove/${userId}`),
    blockUser:     (userId) => req('POST', `/friends/block/${userId}`),
    unblockUser:   (userId) => req('POST', `/friends/unblock/${userId}`),

    // admin
    getStats:   () => req('GET', '/admin/stats'),
    getUsers:   () => req('GET', '/admin/users'),
    toggleBan:  (id) => req('PUT', `/admin/ban/${id}`),

    // suggestions & help
    submitSuggestion: (data) => req('POST', '/suggestions', data),
    getSuggestions:   () => req('GET', '/suggestions'),

    // gaming
    getGames: (params = {}) => {
        const qs = new URLSearchParams(params).toString()
        return req('GET', '/games' + (qs ? '?' + qs : ''))
    },
    getGameRecommendations: (limit = 12) => req('GET', `/games/recommendations?limit=${limit}`),
    getOneGame: (id) => req('GET', `/games/${id}`),
    getGamelist: () => req('GET', '/gamelist'),
    addGamelist: (gameId, playStatus) => req('POST', '/gamelist', { gameId, playStatus }),
    updateGamelist: (gameId, data) => req('PUT', `/gamelist/${gameId}`, data),
    removeGamelist: (gameId) => req('DELETE', `/gamelist/${gameId}`)
}
