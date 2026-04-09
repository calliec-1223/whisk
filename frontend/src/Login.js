import {useState} from 'react'
import {useNavigate} from 'react-router-dom'


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
            localStorage.setItem('token', data.token)
            navigate('/recipes')
        })
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }
    return (
        <div>
            <h2>Login</h2>
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
    )
}


export default Login

 
