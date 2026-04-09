import {Link, useNavigate} from 'react-router-dom'
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
            <Link to="/recipes">My Recipes</Link>
            <Link to="/add">Add Recipe</Link>
            <Link to="/convert">Converter</Link>
            <button className="navbar-logout" onClick={handleLogout}>Logout</button>
        </div>
    </nav>
)
}

export default Navbar
