import {useState} from 'react'
import { apiFetch } from './api'
import { Link, useNavigate } from 'react-router-dom'
import AuthBook from './AuthBook'


function Signup() {
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
    })
    const navigate = useNavigate()

    const handleSignup = () => {
        if (form.username === '' || form.password === ''){
            setError('Please enter a username and password.')
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
        <AuthBook title="Start your recipe book" subtitle="It only takes a minute!">
            <label htmlFor="signup-username">Username</label>
            <input
                id="signup-username"
                name="username"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
            />
            <label htmlFor="signup-email">Email (optional)</label>
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
            <button type="button" onClick={handleSignup}>Create account</button>
            <p className="auth-switch">Already have an account? <Link to="/">Log in</Link></p>
        </AuthBook>
    )
}


export default Signup

 
