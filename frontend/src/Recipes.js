import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from './api'
import RecipeList from './RecipeList'
import { CATEGORIES } from './categories'
import { useChat } from './ChatContext'
import { ArrowIcon } from './icons'
import PageHero from './PageHero'

const PAGE_SIZE = 10

function Recipes() {
    const [recipes, setRecipes] = useState([])
    const { setIsOpen: setChatOpen } = useChat()
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [selectedRecipes, setSelectedRecipes] = useState([])
    const [showShoppingList, setShowShoppingList] = useState(false)
    const [page, setPage] = useState(1)

    const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === '' || r.category === categoryFilter
    return matchesSearch && matchesCategory
})

    const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE))
    // Clamp so deleting the last recipe on a page doesn't leave an empty page
    const currentPage = Math.min(page, pageCount)
    const pagedRecipes = filteredRecipes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const goToPage = (n) => {
        setPage(n)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const toggleSelectRecipe = (recipe) => {
    if (selectedRecipes.find(r => r.id === recipe.id)) {
        setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipe.id))
    } else {
        setSelectedRecipes([...selectedRecipes, recipe])
    }
}

    const fetchRecipes = () => {
        authFetch('/recipes')
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
        <div className="page-enter recipes-page">
            <PageHero
                title="Recipes"
                meta={`${recipes.length} saved`}
                action={<Link to="/add" className="button">New recipe</Link>}
            />

            <div className="recipes-container">
                <button
                    type="button"
                    className="assistant-prompt"
                    onClick={() => setChatOpen(true)}
                >
                    <span className="assistant-prompt-label">
                        <span className="label-dot" aria-hidden="true" />
                        Baking questions
                    </span>
                    <span className="assistant-prompt-text">Ask the assistant about substitutions, timing, or what went wrong.</span>
                    <span className="circle-arrow"><ArrowIcon /></span>
                </button>

                <div className="recipe-filters">
                    <input
                        placeholder="Search recipes"
                        aria-label="Search recipes"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    />
                    <select
                        aria-label="Filter by category"
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
                    >
                        <option value="">All categories</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>

                {selectedRecipes.length > 0 && (
                    <button className="shopping-btn" onClick={() => setShowShoppingList(true)}>
                        Shopping list ({selectedRecipes.length})
                    </button>
                )}

                <RecipeList
                    recipes={pagedRecipes}
                    onRecipeDeleted={fetchRecipes}
                    selectedRecipes={selectedRecipes}
                    onToggleSelect={toggleSelectRecipe}
                />

                {pageCount > 1 && (
                    <nav className="pagination" aria-label="Recipe pages">
                        <button
                            className="btn-secondary"
                            disabled={currentPage === 1}
                            onClick={() => goToPage(currentPage - 1)}
                        >
                            Previous
                        </button>
                        <span className="pagination-status">Page {currentPage} of {pageCount}</span>
                        <button
                            className="btn-secondary"
                            disabled={currentPage === pageCount}
                            onClick={() => goToPage(currentPage + 1)}
                        >
                            Next
                        </button>
                    </nav>
                )}

                {showShoppingList && (
                    <div className="modal-backdrop" onClick={() => setShowShoppingList(false)}>
                        <div
                            className="modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="shopping-list-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 id="shopping-list-title">Shopping list</h2>
                            {selectedRecipes.map(recipe => (
                                <div key={recipe.id} className="shopping-group">
                                    <h3>{recipe.title}</h3>
                                    {recipe.ingredients.split('\n').map((ing, i) => (
                                        <label key={i} className="shopping-item">
                                            <input type="checkbox" />
                                            <span>{ing}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                            <button className="btn-secondary btn-block" onClick={() => setShowShoppingList(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Recipes