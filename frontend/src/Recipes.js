import { useEffect, useState } from 'react'
import RecipeList from './RecipeList'

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
            <div className="recipes-container">
            <h2>My Recipes 🧁</h2>
            <div className="ai-banner" onClick={() => document.querySelector('.chat-fab').click()}>
    <span>🧁</span>
    <div>
        <strong>Need baking help?</strong>
        <p>Ask our AI assistant about your recipes, substitutions, or troubleshooting</p>
    </div>
    <span>→</span>
</div>
            <RecipeList recipes={recipes} onRecipeDeleted={fetchRecipes} token={token} />
        </div>
    </div>
)
}

export default Recipes