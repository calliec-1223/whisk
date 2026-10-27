export const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'

// Start waking the free-tier backend as soon as the app loads
fetch(`${API_URL}/ping`).catch(() => {})

// Fetch an API route. Sends and expects JSON.
export function apiFetch(path, options = {}) {
    return fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    })
}

// Fetch a route that needs login. Adds the saved token; if the server says the
// token is missing, expired or invalid, clears it and returns to the login page.
export function authFetch(path, options = {}) {
    return apiFetch(path, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(res => {
        if (res.status === 401 || res.status === 422) {
            localStorage.removeItem('token')
            window.location.assign('/')
            return new Promise(() => {}) // never settles, so the caller's handlers don't run
        }
        return res
    })
}
