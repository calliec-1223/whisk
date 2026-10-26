const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'
export default API_URL

// Start waking the free-tier backend as soon as the app loads
fetch(`${API_URL}/ping`).catch(() => {})
