import {useState} from 'react'
import { apiFetch } from './api'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'
import { BrushRing, HandUnderline } from './icons'

function Login({ onLogin }) {
    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const [error, setError] = useState('')
    const navigate = useNavigate()

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
                navigate('/recipes')
            } else {
                setError(data.error || 'Something went wrong. Please try again.')
            }
        })
        .catch(() => setError("Can't reach the server. Please try again."))
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }
    return (
        <div className="auth-container">
            <BrushRing className="auth-ring" />
            <div className="auth-card">
                <h1>Whisk</h1>
                <HandUnderline className="auth-underline" />
                <p className="page-subtitle">Log in to your recipes.</p>
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
                <button onClick={handleLogin}>Log in</button>
                <p className="auth-switch">No account yet? <Link to="/signup">Sign up</Link></p>
            </div>
        </div>
    )
}


export default Login

 
