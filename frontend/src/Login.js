import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import './Login.css'

function Login({ onLogin }) {
    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const navigate = useNavigate()

    const handleLogin = () => {
        fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then(data => {
            if (data.token){
                localStorage.setItem('token', data.token)
                navigate('/recipes')
            }
        })
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }
    return (
    <div className="login-container">
        <div className="login-card">
            <h1>Whisk 🧁</h1>
            <p className="subtitle">your cozy baking companion</p>
            <input 
                name="username" 
                placeholder="Username" 
                value={form.username} 
                onChange={handleChange}
            />
            <input 
                name="password" 
                placeholder="Password" 
                type="password" 
                value={form.password} 
                onChange={handleChange} 
            />
            <button onClick={handleLogin}>Login</button>
            <p>Don't have an account? <a href="/signup">Sign up</a></p>
        </div>
    </div>
)
}


export default Login

 
