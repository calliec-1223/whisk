import { useState } from 'react'
import {NavLink, useNavigate} from 'react-router-dom'
import './Navbar.css'
import { SoundIcon, WhiskIcon } from './icons'
import { play, setSoundsOn, soundsOn } from './sound'

function Navbar(){
    const navigate = useNavigate()
    const [sounds, setSounds] = useState(soundsOn)

    const toggleSounds = () => {
        setSoundsOn(!sounds)
        setSounds(!sounds)
        if (!sounds) play('pop')
    }

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
                <NavLink to="/stickers">Stickers</NavLink>
            </div>
            <button
                type="button"
                className="navbar-sound"
                aria-pressed={sounds}
                aria-label="Sound effects"
                title={sounds ? 'Sound effects on' : 'Sound effects off'}
                onClick={toggleSounds}
            >
                <SoundIcon on={sounds} size={20} />
            </button>
            <button type="button" className="navbar-logout btn-secondary" onClick={handleLogout}>Log out</button>
        </nav>
    )
}

export default Navbar
