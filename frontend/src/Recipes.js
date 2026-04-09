import { useEffect, useState } from 'react'
import RecipeList from './RecipeList'

function Recipes() {
    const [recipes, setRecipes] = useState([])
    const token = localStorage.getItem('token')
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')


    const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === '' || r.category === categoryFilter
    return matchesSearch && matchesCategory
})

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
            <div style={{display: 'flex', gap: '12px', marginBottom: '20px'}}>
                <input
                    placeholder="Search recipes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{marginBottom: '0'}}
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{marginBottom: '0', width: '200px'}}
                >
                    <option value="">All Categories</option>
                    <option value="cookies">Cookies</option>
                    <option value="cakes">Cakes</option>
                    <option value="bread">Bread</option>
                    <option value="muffins">Muffins</option>
                    <option value="pies">Pies & Tarts</option>
                    <option value="pastry">Pastry</option>
                    <option value="no-bake">No Bake</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <RecipeList recipes={filteredRecipes} onRecipeDeleted={fetchRecipes} token={token} />
        </div>
    </div>
)
    
}

export default Recipes