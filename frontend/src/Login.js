import {useState} from 'react'


function Login({ onLogin }) {
    const [form, setForm] = useState({
        username: '',
        password: ''
    })

    const handleLogin = () => {
        fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then(data => {
            localStorage.setItem('token', data.token)
            onLogin()
        })
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }
    return (
    <div>
        <input
            name = "username"
            placeholder = "Username"
            value = {form.username}
            onChange = {handleChange}
        />
        <input
            name = "password"
            placeholder = "Password"
            value = {form.password}
            onChange = {handleChange}
        />
        <button onClick={handleLogin}>Login</button>
    </div>
)
}


export default Login

 
