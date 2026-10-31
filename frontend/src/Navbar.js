import {NavLink, useNavigate} from 'react-router-dom'
import './Navbar.css'
import { WhiskIcon } from './icons'

function Navbar(){
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        navigate('/')
    }
    return (
        <nav className="navbar">
            <span className="navbar-brand"><WhiskIcon size={22} />Whisk</span>
            <div className="navbar-links">
                <NavLink to="/recipes">Recipes</NavLink>
                <NavLink to="/add">Add recipe</NavLink>
                <NavLink to="/convert">Converter</NavLink>
            </div>
            <button className="navbar-logout btn-secondary" onClick={handleLogout}>Log out</button>
        </nav>
    )
}

export default Navbar
