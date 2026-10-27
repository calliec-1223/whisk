import {useState} from 'react'
import { apiFetch } from './api'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'
import { BrushRing, HandUnderline } from './icons'


function Signup() {
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
    })
    const navigate = useNavigate()

    const handleSignup = () => {
        if (form.username === '' || form.email === '' || form.password === ''){
            setError('Please fill in all fields.')
            return
        }

        apiFetch('/signup', {
            method: 'POST',
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then (data => {
            if (data.error) {
            setError(data.error)
        } else {
            navigate('/')
        }
        })
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }

    const [error, setError] = useState('')

    return (
        <div className="auth-container">
            <BrushRing className="auth-ring" />
            <div className="auth-card">
                <h1>Whisk</h1>
                <HandUnderline className="auth-underline" />
                <p className="page-subtitle">Create an account to save your recipes.</p>
                <label htmlFor="signup-username">Username</label>
                <input
                    id="signup-username"
                    name="username"
                    autoComplete="username"
                    value={form.username}
                    onChange={handleChange}
                />
                <label htmlFor="signup-email">Email</label>
                <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                />
                <label htmlFor="signup-password">Password</label>
                <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                />
                {error && <p className="form-error">{error}</p>}
                <button onClick={handleSignup}>Create account</button>
                <p className="auth-switch">Already have an account? <Link to="/">Log in</Link></p>
            </div>
        </div>
    )
}


export default Signup

 
