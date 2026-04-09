import {NavLink, useNavigate} from 'react-router-dom'
import './Navbar.css'

function Navbar(){
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        navigate('/')
    }
    return (
    <nav className="navbar">
        <span className="navbar-brand">Whisk 🧁</span>
        <div className="navbar-links">
            <NavLink to="/recipes">My Recipes</NavLink>
            <NavLink to="/add">Add Recipe</NavLink>
            <NavLink to="/convert">Converter</NavLink>
            <button className="navbar-logout" onClick={handleLogout}>Logout</button>
        </div>
    </nav>
)
}

export default Navbar
