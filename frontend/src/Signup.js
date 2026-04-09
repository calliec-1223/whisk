import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import './Signup.css'


function Signup({ }) {
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

        fetch('http://127.0.0.1:5000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
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
    <div className="signup-container">
        <div className="signup-card">
            <h1>Whisk 🧁</h1>
            <p className="subtitle">create your baking account</p>
            <input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
            />
            <input
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
            />
            <input
                name="password"
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={handleChange}
            />
            {error && <p style={{color: 'var(--primary)', marginBottom: '12px', fontSize: '13px'}}>{error}</p>}

            <button onClick={handleSignup}>Create Account</button>
            <p>Already have an account? <a href="/">Login</a></p>
        </div>
    </div>
)
}


export default Signup

 
