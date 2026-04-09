import {useState} from 'react'
import {useNavigate} from 'react-router-dom'


function Signup({ }) {
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
    })
    const navigate = useNavigate()

    const handleSignup = () => {
        fetch('http://127.0.0.1:5000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then(() => {
            navigate('/')
        })
    }
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }
    return (
    <div>
        <h2>Create an Account</h2>
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
        <input
            name = "email"
            placeholder = "Email Address"
            value = {form.email}
            onChange = {handleChange}
        ></input>
        <button onClick={handleSignup}>Signup</button>
        <p>Already have an account? <a href= "/">Login</a></p>
    </div>
)
}


export default Signup

 
