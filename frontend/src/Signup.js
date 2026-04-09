import {useState} from 'react'


function Signup({ onSignup }) {
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
    })

    const handleSignup = () => {
        fetch('http://127.0.0.1:5000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then(() => {
            onSignup()
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
        <input
            name = "email"
            placeholder = "Email Address"
            value = {form.email}
            onChange = {handleChange}
        ></input>
        <button onClick={handleSignup}>Signup</button>
    </div>
)
}


export default Signup

 
