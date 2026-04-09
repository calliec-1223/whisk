import {Link, useNavigate} from 'react-router-dom'

function Navbar(){
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        navigate('/')
    }
    return (
        <nav>
            <Link to = "/recipes"> My Recipes</Link>
            <Link to = "/add">Add Recipe</Link>
            <Link to = "/convert">Convert Ingredients</Link>
            <Link to = "/chat">Baking Assistant</Link>
            <button onClick = {handleLogout}>Logout</button>

        </nav>
    )
}

export default Navbar
