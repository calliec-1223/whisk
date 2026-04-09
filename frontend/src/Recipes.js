import { useEffect, useState } from 'react'
import RecipeList from './RecipeList'

function Recipes() {
    const [recipes, setRecipes] = useState([])
    const token = localStorage.getItem('token')
    const [search, setSearch] = useState('')

    const filteredRecipes = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
)

    const fetchRecipes = () => {
        fetch('http://127.0.0.1:5000/recipes', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
    if (Array.isArray(data)) {
        setRecipes(data)
    } else {
        setRecipes([])
    }
})
    }

    useEffect(() => {
        fetchRecipes()
    }, [])
return (
    <div className="page-enter">
        <div className="recipes-container">
            <div className="recipes-header">
                <div>
                    <h2>My Recipes</h2>
                    <p className="recipes-subtitle">your personal collection</p>
                </div>
                <a href="/add" className="add-recipe-btn">+ New Recipe</a>
            </div>
            <div className="ai-banner" onClick={() => document.querySelector('.chat-fab').click()}>
                <span>🧁</span>
                <div>
                    <strong>Need baking help?</strong>
                    <p>Ask our AI assistant about your recipes, substitutions, or troubleshooting</p>
                </div>
                <span>→</span>
            </div>
            <input
    placeholder="Search recipes..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{marginBottom: '20px'}}
/>
<RecipeList recipes={filteredRecipes} onRecipeDeleted={fetchRecipes} token={token} />
        </div>
    </div>
)
    
}

export default Recipes