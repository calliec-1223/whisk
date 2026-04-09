import { useEffect, useState } from 'react'
import RecipeList from './RecipeList'
import Navbar from './Navbar'

function Recipes() {
    const [recipes, setRecipes] = useState([])
    const token = localStorage.getItem('token')

    const fetchRecipes = () => {
        fetch('http://127.0.0.1:5000/recipes', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setRecipes(data))
    }

    useEffect(() => {
        fetchRecipes()
    }, [])

    return (
        <div>
            <Navbar />
            <h2>My Recipes</h2>
            <RecipeList recipes={recipes} onRecipeDeleted={fetchRecipes} token={token} />
        </div>
    )
}

export default Recipes