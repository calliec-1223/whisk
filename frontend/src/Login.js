import {useState} from 'react'
import { apiFetch } from './api'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthBook from './AuthBook'

function Login({ onLogin }) {
    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const [error, setError] = useState('')
    const [startingDemo, setStartingDemo] = useState(false)
    const navigate = useNavigate()
    // Coming from a shared recipe's "Log in to save a copy" goes back there afterwards
    const location = useLocation()
    const from = location.state?.from

    const handleLogin = () => {
        setError('')
        apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then(data => {
            if (data.token){
                localStorage.setItem('token', data.token)
                navigate(from?.startsWith('/r/') ? from : '/recipes')
            } else {
                setError(data.error || 'Something went wrong. Please try again.')
            }
        })
        .catch(() => setError("Can't reach the server. Please try again."))
    }
    // A fresh, private sample box for people who want to look around (like recruiters)
    const tryDemo = () => {
        setError('')
        setStartingDemo(true)
        apiFetch('/demo', { method: 'POST' })
        .then(res => {
            if (res.status === 429) throw new Error('Too many demos from this network. Try again in an hour.')
            return res.json()
        })
        .then(data => {
            if (!data.token) throw new Error(data.error)
            localStorage.setItem('token', data.token)
            navigate('/recipes')
        })
        .catch(err => {
            setError(err instanceof TypeError || !err.message
                ? "Can't reach the server. Please try again." : err.message)
            setStartingDemo(false)
        })
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }
    return (
        <AuthBook title="Welcome back!" subtitle="Log in to open your recipe book.">
            <label htmlFor="login-username">Username</label>
            <input
                id="login-username"
                name="username"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
            />
            <label htmlFor="login-password">Password</label>
            <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="form-error">{error}</p>}
            <button type="button" onClick={handleLogin}>Log in</button>
            <p className="auth-switch">No account yet? <Link to="/signup" state={location.state}>Sign up</Link></p>
            <div className="demo-try">
                <button type="button" className="rb-ghost" onClick={tryDemo} disabled={startingDemo}>
                    {startingDemo ? 'Setting up a sample box…' : 'Try the demo'}
                </button>
                <p>A sample recipe box, no account needed. It's cleared after a day.</p>
            </div>
        </AuthBook>
    )
}


export default Login

 
